import React from 'react';
import { Modal } from '../Modal';
import { Editor } from '../Editor';

interface EditAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  modName: string;
  modId: string;
  version: string;
  title: string;
  content: string;
  onVersionChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const EditAnnouncementModal: React.FC<EditAnnouncementModalProps> = ({
  isOpen,
  onClose,
  modName,
  modId,
  version,
  title,
  content,
  onVersionChange,
  onTitleChange,
  onContentChange,
  isSubmitting,
  onSubmit
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title="编辑公告">
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="bg-blue-50 dark:bg-brand-blue/10 p-3 rounded border border-blue-100 dark:border-brand-blue/20">
        <span className="text-sm text-slate-500 dark:text-brand-muted">修改: </span>
        <span className="font-bold text-brand-blue dark:text-brand-yellow">
          {modName || '未选择 Mod'} {modId ? `(${modId})` : ''}
        </span>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 dark:text-brand-muted mb-1">标题</label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full bg-slate-50 dark:bg-brand-base border border-slate-300 dark:border-brand-blue/30 rounded-lg px-4 py-2 text-slate-900 dark:text-brand-white focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-yellow focus:border-transparent outline-none placeholder-slate-400 dark:placeholder-gray-600"
          placeholder="版本更新说明"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 dark:text-brand-muted mb-1">
          Version（可选）
        </label>
        <input
          type="text"
          value={version}
          onChange={(e) => onVersionChange(e.target.value)}
          className="w-full bg-slate-50 dark:bg-brand-base border border-slate-300 dark:border-brand-blue/30 rounded-lg px-4 py-2 text-slate-900 dark:text-brand-white focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-yellow focus:border-transparent outline-none placeholder-slate-400 dark:placeholder-gray-600 font-mono"
          placeholder="例如：1.0.1 / 1.0.0 Beta / 1.0.0 Alpha"
        />
        <div className="mt-1 text-xs text-slate-400 dark:text-brand-muted">留空可清除版本标签。</div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 dark:text-brand-muted mb-1">内容详情</label>
        <Editor value={content} onChange={onContentChange} />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-slate-500 hover:text-slate-900 dark:text-brand-muted dark:hover:text-brand-white transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !title || !content}
          className="bg-brand-blue hover:bg-blue-600 dark:bg-brand-yellow dark:hover:bg-yellow-400 text-white dark:text-brand-base font-bold px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '保存中...' : '保存修改'}
        </button>
      </div>
    </form>
  </Modal>
);
