import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { User, UserRole, UserStatus } from '../../types';

interface UserListProps {
  users: User[];
  currentUsername: string;
  isRootAdmin: boolean;
  activeSuperCount: number;
  onEdit: (user: User) => void;
  onResetPassword: (user: User) => void;
  onToggleStatus: (user: User) => void;
  onDelete: (username: string) => void;
}

export const UserList: React.FC<UserListProps> = ({
  users,
  currentUsername,
  isRootAdmin,
  activeSuperCount,
  onEdit,
  onResetPassword,
  onToggleStatus,
  onDelete
}) => {
  const canManageUser = (u: User): boolean => {
    if (u.username === currentUsername) return false;
    if (u.isRootAdmin) return false;
    if (u.role === UserRole.SUPER && !isRootAdmin) return false;
    return true;
  };

  const canDisableOrDeleteUser = (u: User): boolean => {
    if (!canManageUser(u)) return false;
    if (u.role === UserRole.SUPER && u.status === UserStatus.ACTIVE && activeSuperCount <= 1) return false;
    return true;
  };

  return (
    <div className="grid gap-3">
      {activeSuperCount <= 1 && (
        <div className="text-xs p-3 rounded border bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-brand-yellow/10 dark:border-brand-yellow/20 dark:text-brand-yellow">
          当前仅剩 1 个启用的超级管理员，系统会阻止“停用/删除最后一个超级管理员”。
        </div>
      )}

      {users.map((u) => (
        <div
          key={u.username}
          className="bg-white dark:bg-brand-card p-4 rounded border border-slate-200 dark:border-brand-blue/10 flex justify-between items-center"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-white">{u.displayName}</span>
              <span className="text-xs text-slate-400">@{u.username}</span>
              {u.role === UserRole.SUPER ? (
                <span className="badge bg-purple-100 text-purple-600 border-purple-200">管理员</span>
              ) : (
                <span className="badge bg-blue-50 text-blue-600 border-blue-200">Mod作者/协作者</span>
              )}
              {u.status === UserStatus.DISABLED && (
                <span className="badge bg-slate-100 text-slate-500 border-slate-200">已停用</span>
              )}
            </div>
            {u.role !== UserRole.SUPER && (
              <div className="text-xs text-slate-500 mt-1">权限: {u.allowedMods?.join(', ') || '无'}</div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(u)}
              disabled={!canManageUser(u)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors text-sm px-2 py-1 rounded border border-slate-200 dark:border-brand-blue/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              title="编辑用户"
            >
              <Pencil size={14} />
              编辑
            </button>
            <button
              onClick={() => onResetPassword(u)}
              disabled={!canManageUser(u)}
              className="text-slate-400 hover:text-brand-blue transition-colors text-sm px-2 py-1 rounded border border-slate-200 dark:border-brand-blue/20 disabled:opacity-40 disabled:cursor-not-allowed"
              title="重置密码"
            >
              重置密码
            </button>
            <button
              onClick={() => onToggleStatus(u)}
              disabled={!canDisableOrDeleteUser(u)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors text-sm px-2 py-1 rounded border border-slate-200 dark:border-brand-blue/20 disabled:opacity-40 disabled:cursor-not-allowed"
              title={u.status === UserStatus.ACTIVE ? '停用' : '启用'}
            >
              {u.status === UserStatus.ACTIVE ? '停用' : '启用'}
            </button>
            <button
              onClick={() => onDelete(u.username)}
              disabled={!canDisableOrDeleteUser(u)}
              className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="删除用户"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

