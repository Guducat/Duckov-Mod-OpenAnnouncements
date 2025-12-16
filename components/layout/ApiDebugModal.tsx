import React from 'react';
import { Modal } from '../Modal';

interface ApiDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiDebugModal: React.FC<ApiDebugModalProps> = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="API 调试">
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-slate-700 dark:text-brand-white mb-2">公开接口（无需认证）</h3>
        <div className="space-y-2 font-mono text-sm">
          <div className="p-2 bg-slate-100 dark:bg-brand-card rounded border border-slate-200 dark:border-brand-blue/10">
            <span className="text-green-600 dark:text-green-400">GET</span>
            <span className="ml-2 text-slate-700 dark:text-slate-300">/api/public/list?modId=&#123;modId&#125;</span>
            <p className="text-xs text-slate-500 mt-1">获取指定 Mod 的公告列表</p>
          </div>
          <div className="p-2 bg-slate-100 dark:bg-brand-card rounded border border-slate-200 dark:border-brand-blue/10">
            <span className="text-green-600 dark:text-green-400">GET</span>
            <span className="ml-2 text-slate-700 dark:text-slate-300">/api/mod/list</span>
            <p className="text-xs text-slate-500 mt-1">获取所有 Mod 列表</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-bold text-slate-700 dark:text-brand-white mb-2">自动化推送（需要 API key）</h3>
        <div className="space-y-2 font-mono text-sm">
          <div className="p-2 bg-slate-100 dark:bg-brand-card rounded border border-slate-200 dark:border-brand-blue/10">
            <span className="text-blue-600 dark:text-blue-400">POST</span>
            <span className="ml-2 text-slate-700 dark:text-slate-300">/api/push/announcement</span>
            <p className="text-xs text-slate-500 mt-1">Body：apiKey/modId/title/content_html 必填，version/content_text 可选</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-bold text-slate-700 dark:text-brand-white mb-2">管理接口（需要登录 Bearer Token）</h3>
        <div className="space-y-2 font-mono text-sm">
          <div className="p-2 bg-slate-100 dark:bg-brand-card rounded border border-slate-200 dark:border-brand-blue/10">
            <span className="text-blue-600 dark:text-blue-400">POST</span>
            <span className="ml-2 text-slate-700 dark:text-slate-300">/api/admin/post</span>
            <p className="text-xs text-slate-500 mt-1">创建公告（super/editor 且具备 mod 权限）</p>
          </div>
          <div className="p-2 bg-slate-100 dark:bg-brand-card rounded border border-slate-200 dark:border-brand-blue/10">
            <span className="text-blue-600 dark:text-blue-400">POST</span>
            <span className="ml-2 text-slate-700 dark:text-slate-300">/api/admin/update</span>
            <p className="text-xs text-slate-500 mt-1">更新公告（super/editor 且具备 mod 权限）</p>
          </div>
          <div className="p-2 bg-slate-100 dark:bg-brand-card rounded border border-slate-200 dark:border-brand-blue/10">
            <span className="text-blue-600 dark:text-blue-400">POST</span>
            <span className="ml-2 text-slate-700 dark:text-slate-300">/api/apikey/create</span>
            <p className="text-xs text-slate-500 mt-1">创建 API key（super/editor；Body：allowedMods 可多选）</p>
          </div>
          <div className="p-2 bg-slate-100 dark:bg-brand-card rounded border border-slate-200 dark:border-brand-blue/10">
            <span className="text-green-600 dark:text-green-400">GET</span>
            <span className="ml-2 text-slate-700 dark:text-slate-300">/api/apikey/list</span>
            <p className="text-xs text-slate-500 mt-1">列出 API key（super/editor；非系统管理员仅能看到自己创建的）</p>
          </div>
        </div>
      </div>
    </div>
  </Modal>
);

