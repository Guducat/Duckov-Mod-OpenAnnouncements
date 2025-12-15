import React, { useEffect, useMemo, useState } from 'react';
import { ModDefinition, User, UserRole, UserStatus } from '../../types';
import { modService, userService } from '../../services/apiService';
import { UserCreateForm } from './UserCreateForm';
import { UserEditModal } from './UserEditModal';
import { UserList } from './UserList';

interface UserManagerProps {
  token: string;
  currentUsername: string;
  isRootAdmin: boolean;
}

type UserFromApi = Omit<User, 'status'> & { status?: UserStatus };

const normalizeUser = (u: UserFromApi): User => ({
  ...u,
  status: u.status ?? UserStatus.ACTIVE
});

export const UserManager: React.FC<UserManagerProps> = ({ token, currentUsername, isRootAdmin }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [mods, setMods] = useState<ModDefinition[]>([]);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>(UserRole.EDITOR);
  const [editMods, setEditMods] = useState<Set<string>>(new Set());

  const loadData = async () => {
    const [uRes, mRes] = await Promise.all([userService.list(token), modService.list()]);
    if (uRes.success && uRes.data) {
      setUsers((uRes.data as UserFromApi[]).map(normalizeUser));
    }
    if (mRes.success && mRes.data) setMods(mRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeSuperCount = useMemo(
    () => users.filter((u) => u.role === UserRole.SUPER && u.status === UserStatus.ACTIVE).length,
    [users]
  );

  const handleCreateUser = async (payload: {
    username: string;
    password: string;
    displayName: string;
    role: UserRole;
    allowedModIds: string[];
  }) => {
    const res = await userService.create(token, {
      username: payload.username,
      password: payload.password,
      role: payload.role,
      displayName: payload.displayName,
      allowedMods: payload.allowedModIds
    });
    if (res.success) loadData();
    else alert(res.error);
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

  return (
    <div>
      <UserCreateForm mods={mods} isRootAdmin={isRootAdmin} onCreate={handleCreateUser} />

      <UserList
        users={users}
        currentUsername={currentUsername}
        isRootAdmin={isRootAdmin}
        activeSuperCount={activeSuperCount}
        onEdit={openEdit}
        onResetPassword={handleResetPassword}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
      />

      <UserEditModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingUser(null);
        }}
        title={editingUser ? `编辑用户：${editingUser.username}` : '编辑用户'}
        isRootAdmin={isRootAdmin}
        mods={mods}
        displayName={editDisplayName}
        onDisplayNameChange={setEditDisplayName}
        role={editRole}
        onRoleChange={setEditRole}
        allowedModIds={editMods}
        onToggleAllowedMod={toggleEditMod}
        onSubmit={handleSaveEdit}
      />
    </div>
  );
};
