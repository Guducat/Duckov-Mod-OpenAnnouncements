import React from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Chip,
  Stack,
} from '@mui/material';
import { ModDefinition, UserRole } from '@/types';
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
  onSubmit,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={3} sx={{ mt: 1.5 }}>
          <TextField
            label="显示昵称"
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            required
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <Box>
            <FormControl fullWidth>
              <InputLabel shrink>角色</InputLabel>
              <Select
                value={role}
                onChange={(e) => onRoleChange(e.target.value as UserRole)}
                label="角色"
                notched
                disabled={!isRootAdmin && role !== UserRole.SUPER}
              >
                <MenuItem value={UserRole.EDITOR}>Mod作者/协作者</MenuItem>
                <MenuItem value={UserRole.SUPER} disabled={!isRootAdmin}>
                  管理员
                </MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {isRootAdmin
                ? '超级管理员默认拥有全部 Mod 权限（不会使用 allowedMods）。'
                : '只有系统管理员才能授予或修改管理员权限。'}
            </Typography>
          </Box>

          {role === UserRole.EDITOR && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                允许管理的 Mod
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {mods.map((m) => (
                  <Chip
                    key={m.id}
                    label={m.name}
                    size="small"
                    onClick={() => onToggleAllowedMod(m.id)}
                    color={allowedModIds.has(m.id) ? 'primary' : 'default'}
                    variant={allowedModIds.has(m.id) ? 'filled' : 'outlined'}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Stack>
            </Box>
          )}

          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ pt: 1 }}>
            <Button onClick={onClose} color="inherit">
              取消
            </Button>
            <Button type="submit" variant="contained">
              保存
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Modal>
  );
};
