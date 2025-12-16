import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Button,
  Stack,
  Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
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
  onDelete,
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
    <Stack spacing={2}>
      {activeSuperCount <= 1 && (
        <Alert severity="warning">
          当前仅剩 1 个启用的超级管理员，系统会阻止"停用/删除最后一个超级管理员"。
        </Alert>
      )}

      {users.map((u) => (
        <Card key={u.username} variant="outlined">
          <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2, '&:last-child': { pb: 2 } }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {u.displayName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  @{u.username}
                </Typography>
                {u.role === UserRole.SUPER ? (
                  <Chip label="管理员" size="small" color="secondary" variant="outlined" />
                ) : (
                  <Chip label="Mod作者/协作者" size="small" color="primary" variant="outlined" />
                )}
                {u.status === UserStatus.DISABLED && (
                  <Chip label="已停用" size="small" color="default" variant="outlined" />
                )}
              </Box>
              {u.role !== UserRole.SUPER && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  权限: {u.allowedMods?.join(', ') || '无'}
                </Typography>
              )}
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditIcon fontSize="small" />}
                onClick={() => onEdit(u)}
                disabled={!canManageUser(u)}
              >
                编辑
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => onResetPassword(u)}
                disabled={!canManageUser(u)}
              >
                重置密码
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => onToggleStatus(u)}
                disabled={!canDisableOrDeleteUser(u)}
              >
                {u.status === UserStatus.ACTIVE ? '停用' : '启用'}
              </Button>
              <IconButton
                size="small"
                onClick={() => onDelete(u.username)}
                disabled={!canDisableOrDeleteUser(u)}
                color="error"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
};
