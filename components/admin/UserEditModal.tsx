import React from 'react';
import { ModDefinition, UserRole } from '../../types';
import { Modal } from '../Modal';

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  isRootAdmin: boolean;
  mods: ModDefinition[];
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
  allowedModIds: Set<string>;
  onToggleAllowedMod: (id: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const UserEditModal: React.FC<UserEditModalProps> = ({
  isOpen,
  onClose,
  title,
  isRootAdmin,
  mods,
  displayName,
  onDisplayNameChange,
  role,
  onRoleChange,
  allowedModIds,
  onToggleAllowedMod,
  onSubmit
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-brand-muted mb-1">显示昵称</label>
          <input
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            className="w-full bg-slate-50 dark:bg-brand-base border border-slate-300 dark:border-brand-blue/30 rounded-lg px-4 py-2 text-slate-900 dark:text-brand-white outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-brand-muted mb-1">角色</label>
          <select
            value={role}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
            className="w-full bg-slate-50 dark:bg-brand-base border border-slate-300 dark:border-brand-blue/30 rounded-lg px-4 py-2 text-slate-900 dark:text-brand-white outline-none"
            disabled={!isRootAdmin && role !== UserRole.SUPER}
          >
            <option value={UserRole.EDITOR}>Mod作者/协作者</option>
            <option value={UserRole.SUPER} disabled={!isRootAdmin}>
              管理员
            </option>
          </select>
          <p className="text-xs text-slate-500 dark:text-brand-muted mt-1">
            {isRootAdmin ? '超级管理员默认拥有全部 Mod 权限（不会使用 allowedMods）。' : '只有系统管理员才能授予或修改管理员权限。'}
          </p>
        </div>

        {role === UserRole.EDITOR && (
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-brand-muted mb-2">允许管理的 Mod</label>
            <div className="flex flex-wrap gap-2">
              {mods.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => onToggleAllowedMod(m.id)}
                  className={`text-xs px-2 py-1 rounded border ${
                    allowedModIds.has(m.id)
                      ? 'bg-brand-blue border-brand-blue text-white'
                      : 'bg-white dark:bg-transparent border-slate-300 dark:border-slate-600 text-slate-500'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-500 hover:text-slate-900 dark:text-brand-muted dark:hover:text-brand-white transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            className="bg-brand-blue hover:bg-blue-600 dark:bg-brand-yellow dark:hover:bg-yellow-400 text-white dark:text-brand-base font-bold px-6 py-2 rounded-lg transition-colors"
          >
            保存
          </button>
        </div>
      </form>
    </Modal>
  );
};

