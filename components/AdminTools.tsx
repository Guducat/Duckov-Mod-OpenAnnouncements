
import React, { useState, useEffect } from 'react';
import { User, ModDefinition, UserRole, UserStatus } from '../types';
import { modService, userService } from '../services/apiService';
import { Trash2, Plus, Shield, User as UserIcon, Server, Pencil } from 'lucide-react';
import { Modal } from './Modal';

interface AdminToolsProps {
  token: string;
  currentUsername: string;
  isRootAdmin: boolean;
}

export const AdminTools: React.FC<AdminToolsProps> = ({ token, currentUsername, isRootAdmin }) => {
  const [activeTab, setActiveTab] = useState<'mods' | 'users'>('mods');
  
  return (
    <div className="space-y-6">
      <div className="flex space-x-4 border-b border-slate-200 dark:border-brand-blue/20 pb-1">
        <button
          onClick={() => setActiveTab('mods')}
          className={`px-4 py-2 font-medium flex items-center gap-2 transition-colors ${
            activeTab === 'mods' 
              ? 'text-brand-blue dark:text-brand-yellow border-b-2 border-brand-blue dark:border-brand-yellow' 
              : 'text-slate-500 dark:text-brand-muted hover:text-slate-700 dark:hover:text-white'
          }`}
        >
          <Server size={18} /> Mod 管理
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-medium flex items-center gap-2 transition-colors ${
            activeTab === 'users' 
              ? 'text-brand-blue dark:text-brand-yellow border-b-2 border-brand-blue dark:border-brand-yellow' 
              : 'text-slate-500 dark:text-brand-muted hover:text-slate-700 dark:hover:text-white'
          }`}
        >
          <UserIcon size={18} /> 成员管理
        </button>
      </div>

      <div className="min-h-[300px]">
        {activeTab === 'mods' ? (
          <ModManager token={token} />
        ) : (
          <UserManager token={token} currentUsername={currentUsername} isRootAdmin={isRootAdmin} />
        )}
      </div>
    </div>
  );
};

const ModManager: React.FC<{ token: string }> = ({ token }) => {
  const [mods, setMods] = useState<ModDefinition[]>([]);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');

  const loadMods = async () => {
    const res = await modService.list();
    if (res.success && res.data) setMods(res.data);
  };

  useEffect(() => { loadMods(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId || !newName) return;
    const res = await modService.create(token, { id: newId, name: newName });
    if (res.success) {
      setNewId(''); setNewName(''); loadMods();
    } else {
      alert(res.error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此 Mod 吗？这将影响所有关联的公告查询。')) return;
    const res = await modService.delete(token, id);
    if (res.success) loadMods();
    else alert(res.error);
  };

  return (
    <div>
      <form onSubmit={handleAdd} className="flex gap-3 mb-6 bg-slate-100 dark:bg-black/20 p-4 rounded-lg">
        <div className="flex-1">
           <input 
             value={newId} onChange={e => setNewId(e.target.value)}
             placeholder="Mod ID (例DuckovCustomSoundsMod_v1, 仅英文)"
             className="w-full bg-white dark:bg-brand-base border border-slate-300 dark:border-brand-blue/30 rounded px-3 py-2 text-sm outline-none"
           />
           <p className="text-xs text-slate-400 mt-1">系统唯一标识，不可重复，不可含中文</p>
        </div>
        <div className="flex-1">
           <input 
             value={newName} onChange={e => setNewName(e.target.value)}
             placeholder="显示名称 (如 鸭科夫自定义音乐音效Mod)"
             className="w-full bg-white dark:bg-brand-base border border-slate-300 dark:border-brand-blue/30 rounded px-3 py-2 text-sm outline-none"
           />
           <p className="text-xs text-slate-400 mt-1">用于 UI 显示，支持任意字符</p>
        </div>
        <button type="submit" className="bg-brand-blue dark:bg-brand-yellow text-white dark:text-brand-base px-4 py-2 rounded font-bold h-10">
          添加
        </button>
      </form>

      <div className="space-y-2">
        {mods.map(mod => (
          <div key={mod.id} className="flex items-center justify-between p-3 bg-white dark:bg-brand-card border border-slate-200 dark:border-brand-blue/10 rounded">
            <div>
              <span className="font-bold text-slate-700 dark:text-brand-white mr-2">{mod.name}</span>
              <span className="font-mono text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">{mod.id}</span>
            </div>
            <button onClick={() => handleDelete(mod.id)} className="text-red-400 hover:text-red-500 p-2">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const UserManager: React.FC<{ token: string; currentUsername: string; isRootAdmin: boolean }> = ({ token, currentUsername, isRootAdmin }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [mods, setMods] = useState<ModDefinition[]>([]);

  // 编辑用户模态框
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>(UserRole.EDITOR);
  const [editMods, setEditMods] = useState<Set<string>>(new Set());
  
  // 新用户表单
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.EDITOR);
  const [selectedMods, setSelectedMods] = useState<Set<string>>(new Set());

  const loadData = async () => {
    const uRes = await userService.list(token);
    const mRes = await modService.list();
    if (uRes.success && uRes.data) {
      setUsers(uRes.data.map(u => ({ ...u, status: (u as any).status ?? UserStatus.ACTIVE })));
    }
    if (mRes.success && mRes.data) setMods(mRes.data);
  };

  useEffect(() => { loadData(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const newUser = {
      username, password, role, displayName,
      allowedMods: Array.from(selectedMods)
    };
    const res = await userService.create(token, newUser);
    if (res.success) {
      setUsername(''); setPassword(''); setDisplayName(''); setSelectedMods(new Set());
      loadData();
    } else {
      alert(res.error);
    }
  };

  const handleDelete = async (u: string) => {
    if (u === currentUsername) {
      alert('不能删除自己');
      return;
    }
    if (!confirm(`确定删除用户 ${u} 吗？`)) return;
    const res = await userService.delete(token, u);
    if (res.success) loadData();
    else alert(res.error);
  };

  const handleResetPassword = async (u: User) => {
    if (u.username === currentUsername) {
      alert('不能在这里重置自己的密码，请使用另一个超级管理员账号操作。');
      return;
    }
    const newPassword = prompt(`为用户 ${u.username} 重置密码（将立即生效）：`);
    if (!newPassword) return;
    const res = await userService.resetPassword(token, u.username, newPassword);
    if (res.success) alert('密码已重置');
    else alert(res.error);
  };

  const handleToggleStatus = async (u: User) => {
    if (u.username === currentUsername) {
      alert('不能停用自己');
      return;
    }
    const next = u.status === UserStatus.ACTIVE ? UserStatus.DISABLED : UserStatus.ACTIVE;
    const actionText = next === UserStatus.DISABLED ? '停用' : '启用';
    if (!confirm(`确定${actionText}用户 ${u.username} 吗？`)) return;
    const res = await userService.setStatus(token, u.username, next);
    if (res.success) loadData();
    else alert(res.error);
  };

  const toggleMod = (id: string) => {
    const next = new Set(selectedMods);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedMods(next);
  };

  const toggleEditMod = (id: string) => {
    const next = new Set(editMods);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setEditMods(next);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setEditDisplayName(u.displayName || u.username);
    setEditRole(u.role);
    setEditMods(new Set(u.allowedMods || []));
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const res = await userService.update(token, {
      username: editingUser.username,
      displayName: editDisplayName,
      role: editRole,
      allowedMods: editRole === UserRole.SUPER ? [] : Array.from(editMods)
    });
    if (res.success) {
      setIsEditOpen(false);
      setEditingUser(null);
      loadData();
    } else {
      alert(res.error);
    }
  };

  const activeSuperCount = users.filter(u => u.role === UserRole.SUPER && u.status === UserStatus.ACTIVE).length;

  return (
    <div>
      <form onSubmit={handleAdd} className="mb-8 bg-slate-100 dark:bg-black/20 p-4 rounded-lg space-y-3">
        <h3 className="font-bold text-slate-700 dark:text-brand-muted mb-2 text-sm uppercase">添加新用户</h3>
        <div className="grid grid-cols-2 gap-3">
          <input required value={username} onChange={e => setUsername(e.target.value)} placeholder="登录用户名" className="input-std" />
          <input required value={password} onChange={e => setPassword(e.target.value)} placeholder="初始密码" className="input-std" />
          <input required value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="显示昵称" className="input-std" />
          <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="input-std">
            <option value={UserRole.EDITOR}>Mod作者/协作者</option>
            <option value={UserRole.SUPER} disabled={!isRootAdmin}>管理员</option>
          </select>
        </div>

        {!isRootAdmin && (
          <p className="text-xs text-slate-500 dark:text-brand-muted">
            提示：只有系统管理员才能创建或管理其他管理员。
          </p>
        )}

        {role === UserRole.EDITOR && (
          <div className="mt-2">
            <p className="text-sm text-slate-500 mb-2">允许管理的 Mod:</p>
            <div className="flex flex-wrap gap-2">
              {mods.map(m => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => toggleMod(m.id)}
                  className={`text-xs px-2 py-1 rounded border ${
                    selectedMods.has(m.id)
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
        
        <button type="submit" className="w-full mt-2 bg-brand-blue dark:bg-brand-yellow text-white dark:text-brand-base py-2 rounded font-bold">创建用户</button>
      </form>

      <div className="grid gap-3">
        {activeSuperCount <= 1 && (
          <div className="text-xs p-3 rounded border bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-brand-yellow/10 dark:border-brand-yellow/20 dark:text-brand-yellow">
            当前仅剩 1 个启用的超级管理员，系统会阻止“停用/删除最后一个超级管理员”。
          </div>
        )}
        {users.map(u => (
          <div key={u.username} className="bg-white dark:bg-brand-card p-4 rounded border border-slate-200 dark:border-brand-blue/10 flex justify-between items-center">
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
                <div className="text-xs text-slate-500 mt-1">
                  权限: {u.allowedMods?.join(', ') || '无'}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openEdit(u)}
                disabled={
                  u.username === currentUsername ||
                  !!u.isRootAdmin ||
                  (u.role === UserRole.SUPER && !isRootAdmin)
                }
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors text-sm px-2 py-1 rounded border border-slate-200 dark:border-brand-blue/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                title="编辑用户"
              >
                <Pencil size={14} />
                编辑
              </button>
              <button
                onClick={() => handleResetPassword(u)}
                disabled={
                  u.username === currentUsername ||
                  !!u.isRootAdmin ||
                  (u.role === UserRole.SUPER && !isRootAdmin)
                }
                className="text-slate-400 hover:text-brand-blue transition-colors text-sm px-2 py-1 rounded border border-slate-200 dark:border-brand-blue/20 disabled:opacity-40 disabled:cursor-not-allowed"
                title="重置密码"
              >
                重置密码
              </button>
              <button
                onClick={() => handleToggleStatus(u)}
                disabled={
                  u.username === currentUsername ||
                  !!u.isRootAdmin ||
                  (u.role === UserRole.SUPER && !isRootAdmin) ||
                  (u.role === UserRole.SUPER && u.status === UserStatus.ACTIVE && activeSuperCount <= 1)
                }
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors text-sm px-2 py-1 rounded border border-slate-200 dark:border-brand-blue/20 disabled:opacity-40 disabled:cursor-not-allowed"
                title={u.status === UserStatus.ACTIVE ? '停用' : '启用'}
              >
                {u.status === UserStatus.ACTIVE ? '停用' : '启用'}
              </button>
              <button
                onClick={() => handleDelete(u.username)}
                disabled={
                  u.username === currentUsername ||
                  !!u.isRootAdmin ||
                  (u.role === UserRole.SUPER && !isRootAdmin) ||
                  (u.role === UserRole.SUPER && u.status === UserStatus.ACTIVE && activeSuperCount <= 1)
                }
                className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="删除用户"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingUser(null);
        }}
        title={editingUser ? `编辑用户：${editingUser.username}` : '编辑用户'}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-brand-muted mb-1">显示昵称</label>
            <input
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-brand-base border border-slate-300 dark:border-brand-blue/30 rounded-lg px-4 py-2 text-slate-900 dark:text-brand-white outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-brand-muted mb-1">角色</label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as UserRole)}
              className="w-full bg-slate-50 dark:bg-brand-base border border-slate-300 dark:border-brand-blue/30 rounded-lg px-4 py-2 text-slate-900 dark:text-brand-white outline-none"
              disabled={!isRootAdmin && editRole !== UserRole.SUPER}
            >
              <option value={UserRole.EDITOR}>Mod作者/协作者</option>
              <option value={UserRole.SUPER} disabled={!isRootAdmin}>管理员</option>
            </select>
            <p className="text-xs text-slate-500 dark:text-brand-muted mt-1">
              {isRootAdmin
                ? '超级管理员默认拥有全部 Mod 权限（不会使用 allowedMods）。'
                : '只有系统管理员才能授予或修改管理员权限。'
              }
            </p>
          </div>

          {editRole === UserRole.EDITOR && (
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-brand-muted mb-2">允许管理的 Mod</label>
              <div className="flex flex-wrap gap-2">
                {mods.map(m => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => toggleEditMod(m.id)}
                    className={`text-xs px-2 py-1 rounded border ${
                      editMods.has(m.id)
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
              onClick={() => {
                setIsEditOpen(false);
                setEditingUser(null);
              }}
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
      
      <style>{`
        .input-std {
          width: 100%;
          background-color: transparent;
          border: 1px solid;
          border-color: #cbd5e1;
          border-radius: 0.25rem;
          padding: 0.5rem;
          font-size: 0.875rem;
          outline: none;
        }
        .dark .input-std {
          border-color: #334155;
          color: white;
        }
        .badge {
          font-size: 0.75rem;
          padding: 0.125rem 0.5rem;
          border-radius: 9999px;
          border-width: 1px;
        }
      `}</style>
    </div>
  );
};
