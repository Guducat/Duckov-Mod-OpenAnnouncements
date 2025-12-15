import React, { useState } from 'react';
import { ModDefinition, UserRole } from '../../types';

interface CreateUserPayload {
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
  allowedModIds: string[];
}

interface UserCreateFormProps {
  mods: ModDefinition[];
  isRootAdmin: boolean;
  onCreate: (payload: CreateUserPayload) => Promise<void>;
}

export const UserCreateForm: React.FC<UserCreateFormProps> = ({ mods, isRootAdmin, onCreate }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.EDITOR);
  const [selectedMods, setSelectedMods] = useState<Set<string>>(new Set());

  const toggleMod = (id: string) => {
    const next = new Set(selectedMods);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedMods(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreate({
      username,
      password,
      displayName,
      role,
      allowedModIds: role === UserRole.SUPER ? [] : Array.from(selectedMods)
    });
    setUsername('');
    setPassword('');
    setDisplayName('');
    setSelectedMods(new Set());
    setRole(UserRole.EDITOR);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-8 bg-slate-100 dark:bg-black/20 p-4 rounded-lg space-y-3">
      <h3 className="font-bold text-slate-700 dark:text-brand-muted mb-2 text-sm uppercase">添加新用户</h3>
      <div className="grid grid-cols-2 gap-3">
        <input
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="登录用户名"
          className="input-std"
        />
        <input
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="初始密码"
          className="input-std"
        />
        <input
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="显示昵称"
          className="input-std"
        />
        <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="input-std">
          <option value={UserRole.EDITOR}>Mod作者/协作者</option>
          <option value={UserRole.SUPER} disabled={!isRootAdmin}>
            管理员
          </option>
        </select>
      </div>

      {!isRootAdmin && <p className="text-xs text-slate-500 dark:text-brand-muted">提示：只有系统管理员才能创建或管理其他管理员。</p>}

      {role === UserRole.EDITOR && (
        <div className="mt-2">
          <p className="text-sm text-slate-500 mb-2">允许管理的 Mod:</p>
          <div className="flex flex-wrap gap-2">
            {mods.map((m) => (
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

      <button
        type="submit"
        className="w-full mt-2 bg-brand-blue dark:bg-brand-yellow text-white dark:text-brand-base py-2 rounded font-bold"
      >
        创建用户
      </button>
    </form>
  );
};

