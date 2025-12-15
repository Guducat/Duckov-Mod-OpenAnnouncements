import React from 'react';
import { Modal } from '../Modal';

interface ApiDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
}

export const ApiDebugModal: React.FC<ApiDebugModalProps> = ({ isOpen, onClose, token }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="API 调试">
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 dark:bg-brand-blue/10 rounded-lg border border-blue-100 dark:border-brand-blue/20">
        <p className="text-sm text-slate-600 dark:text-brand-muted">API 已启用 CORS，支持 C# 原生请求。</p>
      </div>

      <div>
        <h3 className="font-bold text-slate-700 dark:text-brand-white mb-2">公开接口（无需认证）</h3>
        <div className="space-y-2 font-mono text-sm">
          <div className="p-2 bg-slate-100 dark:bg-brand-card rounded border border-slate-200 dark:border-brand-blue/10">
            <span className="text-green-600 dark:text-green-400">GET</span>
            <span className="ml-2 text-slate-700 dark:text-slate-300">/api/system/status</span>
            <p className="text-xs text-slate-500 mt-1">检查系统初始化状态</p>
          </div>
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

      <div className="pt-2 border-t border-slate-200 dark:border-brand-blue/20">
        <p className="text-xs text-slate-500 dark:text-brand-muted">
          当前 Token:{' '}
          <code className="bg-slate-100 dark:bg-brand-card px-1 rounded text-xs break-all">
            {token || '未登录'}
          </code>
        </p>
      </div>
    </div>
  </Modal>
);

