import React, { useState } from 'react';
import { Announcement, UserRole } from '../types';
import { Trash2, ChevronDown, ChevronUp, Pencil } from 'lucide-react';

interface AnnouncementCardProps {
  data: Announcement;
  modName?: string;
  userRole: UserRole;
  onDelete: (id: string) => void;
  onEdit?: (a: Announcement) => void;
}

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({ data, modName, userRole, onDelete, onEdit }) => {
  const [expanded, setExpanded] = useState(false);

  // 格式化时间戳（中文格式）
  const dateStr = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(data.timestamp));

  return (
    <div className="bg-white dark:bg-brand-card border border-slate-200 dark:border-brand-blue/20 rounded-lg p-6 mb-4 shadow-sm hover:shadow-md dark:shadow-none transition-all hover:border-blue-300 dark:hover:border-brand-yellow/50">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-brand-white">{data.title}</h3>
            <span className="text-xs px-2 py-1 bg-blue-50 dark:bg-brand-blue/20 text-blue-600 dark:text-brand-blue border border-blue-200 dark:border-brand-blue/30 rounded font-mono">
              {data.modId}
            </span>
            {data.version?.trim() && (
              <span className="text-xs px-2 py-1 bg-slate-50 dark:bg-black/30 text-slate-600 dark:text-brand-yellow/80 border border-slate-200 dark:border-brand-blue/30 rounded font-mono">
                {data.version.trim()}
              </span>
            )}
          </div>
          <div className="text-sm text-slate-500 dark:text-brand-muted mb-4 flex gap-4">
            <span>发布者: <span className="text-brand-blue dark:text-brand-yellow font-medium">{data.author}</span></span>
            <span>{dateStr}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {userRole !== UserRole.GUEST && onEdit && (
            <button
              onClick={() => onEdit(data)}
              className="p-2 text-slate-400 hover:text-brand-blue hover:bg-blue-50 dark:hover:text-brand-yellow dark:hover:bg-brand-blue/10 rounded-full transition-colors"
              title="编辑公告"
            >
              <Pencil size={18} />
            </button>
          )}
           {userRole === UserRole.SUPER && (
            <button 
              onClick={() => {
                if(window.confirm('确定要删除这条公告吗？此操作不可恢复。')) {
                  onDelete(data.id);
                }
              }}
              className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-300 dark:hover:bg-red-400/10 rounded-full transition-colors"
              title="删除公告"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      <div className={`prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-gray-300 ${expanded ? '' : 'line-clamp-3'}`}>
        <div dangerouslySetInnerHTML={{ __html: data.content_html }} />
      </div>
      
      <button 
        onClick={() => setExpanded(!expanded)}
        className="mt-4 text-sm text-brand-blue hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 font-medium"
      >
        {expanded ? (
          <>收起内容 <ChevronUp size={16} /></>
        ) : (
          <>阅读全文 <ChevronDown size={16} /></>
        )}
      </button>

      {/* 调试区域：登录可见，展示标准 API JSON */}
      {expanded && userRole !== UserRole.GUEST && (
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-brand-blue/20">
          <p className="text-xs text-slate-400 dark:text-brand-muted uppercase tracking-wider mb-2">API 返回内容（调试）</p>
          <div className="bg-slate-100 dark:bg-black/50 p-3 rounded font-mono text-xs text-slate-600 dark:text-brand-yellow/80 whitespace-pre-wrap border border-slate-200 dark:border-transparent">
            {JSON.stringify(
              {
                code: 200,
                result: 'ok',
                data: {
                  mod: { id: data.modId, name: modName ?? '' },
                  announcement: data
                }
              },
              null,
              2
            )}
          </div>
        </div>
      )}
    </div>
  );
};
