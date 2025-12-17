import React, { useEffect, useMemo, useState } from 'react';
import { Box, AlertColor } from '@mui/material';
import { ModDefinition, User, UserRole, UserStatus } from '@/types';
import { modService, userService } from '@/services/apiService';
import { UserCreateForm } from './UserCreateForm';
import { UserEditModal } from './UserEditModal';
import { UserList } from './UserList';
import { ConfirmDialog } from '../ConfirmDialog';
import { ThreeStepConfirmDialog } from '../ThreeStepConfirmDialog';
import { PromptDialog } from '../PromptDialog';
import { AppSnackbar } from '../AppSnackbar';

interface UserManagerProps {
  token: string;
  currentUsername: string;
  isRootAdmin: boolean;
}

type UserFromApi = Omit<User, 'status'> & { status?: UserStatus };

const normalizeUser = (u: UserFromApi): User => ({
  ...u,
  status: u.status ?? UserStatus.ACTIVE,
});

export const UserManager: React.FC<UserManagerProps> = ({ token, currentUsername, isRootAdmin }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [mods, setMods] = useState<ModDefinition[]>([]);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>(UserRole.EDITOR);
  const [editMods, setEditMods] = useState<Set<string>>(new Set());

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmColor?: 'primary' | 'error' | 'warning';
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [deleteUserDialog, setDeleteUserDialog] = useState<{ open: boolean; username: string }>({
    open: false,
    username: '',
  });

  // Prompt dialog state (for password reset)
  const [promptDialog, setPromptDialog] = useState<{
    open: boolean;
    username: string;
  }>({
    open: false,
    username: '',
  });

  const showMessage = (message: string, severity: AlertColor = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmColor: 'primary' | 'error' | 'warning' = 'primary'
  ) => {
    setConfirmDialog({ open: true, title, message, confirmColor, onConfirm });
  };

  const loadData = async () => {
    const [uRes, mRes] = await Promise.all([userService.list(token), modService.list()]);
    if (uRes.success && uRes.data) {
      setUsers((uRes.data as UserFromApi[]).map(normalizeUser));
    }
    if (mRes.success && mRes.data) setMods(mRes.data);
  };

  useEffect(() => {
    void loadData();
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
      allowedMods: payload.allowedModIds,
    });
    if (res.success) {
      showMessage('用户创建成功', 'success');
      void loadData();
    } else {
      showMessage(res.error || '创建失败', 'error');
    }
  };

  const handleDelete = (u: string) => {
    if (u === currentUsername) {
      showMessage('不能删除自己', 'warning');
      return;
    }
    setDeleteUserDialog({ open: true, username: u });
  };

  const handleResetPassword = (u: User) => {
    if (u.username === currentUsername) {
      showMessage('不能在这里重置自己的密码，请使用另一个超级管理员账号操作。', 'warning');
      return;
    }
    setPromptDialog({ open: true, username: u.username });
  };

  const handleResetPasswordConfirm = async (newPassword: string) => {
    const res = await userService.resetPassword(token, promptDialog.username, newPassword);
    if (res.success) {
      showMessage('密码已重置', 'success');
    } else {
      showMessage(res.error || '重置失败', 'error');
    }
    setPromptDialog({ open: false, username: '' });
  };

  const handleToggleStatus = async (u: User) => {
    if (u.username === currentUsername) {
      showMessage('不能停用自己', 'warning');
      return;
    }
    const next = u.status === UserStatus.ACTIVE ? UserStatus.DISABLED : UserStatus.ACTIVE;
    const actionText = next === UserStatus.DISABLED ? '停用' : '启用';
    showConfirm(
      `${actionText}用户`,
      `确定${actionText}用户 ${u.username} 吗？`,
      async () => {
        const res = await userService.setStatus(token, u.username, next);
        if (res.success) {
          showMessage(`用户已${actionText}`, 'success');
          void loadData();
        } else {
          showMessage(res.error || `${actionText}失败`, 'error');
        }
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
      next === UserStatus.DISABLED ? 'warning' : 'primary'
    );
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
      allowedMods: editRole === UserRole.SUPER ? [] : Array.from(editMods),
    });
    if (res.success) {
      setIsEditOpen(false);
      setEditingUser(null);
      showMessage('用户信息已更新', 'success');
      void loadData();
    } else {
      showMessage(res.error || '更新失败', 'error');
    }
  };

  return (
    <Box>
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

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmColor={confirmDialog.confirmColor}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      />

      {/* Three-step Delete User Dialog */}
      <ThreeStepConfirmDialog
        open={deleteUserDialog.open}
        onClose={() => setDeleteUserDialog({ open: false, username: '' })}
        subjectCodeLabel="用户名"
        subjectCode={deleteUserDialog.username}
        step1={{
          title: '第 1 步：确认删除用户',
          message: `您确定要删除用户「${deleteUserDialog.username}」吗？`,
          warning: '该用户将无法再登录系统。',
          confirmText: '确认',
          confirmColor: 'error',
        }}
        step2={{
          title: '第 2 步：再次确认',
          message: `请再次确认删除用户「${deleteUserDialog.username}」。`,
          warning: '建议先确认该用户不再需要任何权限或数据访问。',
          confirmText: '确认',
          confirmColor: 'error',
        }}
        step3={{
          title: '第 3 步：最终确认',
          message: `最终确认：删除用户「${deleteUserDialog.username}」？`,
          warning: '删除操作不可撤销！',
          confirmText: '删除',
          confirmColor: 'error',
        }}
        onFinalConfirm={async () => {
          const username = deleteUserDialog.username;
          const res = await userService.delete(token, username);
          if (res.success) {
            await loadData();
            showMessage('用户已删除', 'success');
          } else {
            showMessage(res.error || '删除失败', 'error');
          }
        }}
      />

      {/* Password Reset Dialog */}
      <PromptDialog
        open={promptDialog.open}
        title={`重置密码：${promptDialog.username}`}
        label="新密码"
        placeholder="请输入新密码"
        type="password"
        confirmText="重置密码"
        minLength={6}
        onConfirm={handleResetPasswordConfirm}
        onCancel={() => setPromptDialog({ open: false, username: '' })}
      />

      {/* Snackbar */}
      <AppSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  );
};
