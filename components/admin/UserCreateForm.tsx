import React, { useState } from 'react';
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
  Alert,
} from '@mui/material';
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
      allowedModIds: role === UserRole.SUPER ? [] : Array.from(selectedMods),
    });
    setUsername('');
    setPassword('');
    setDisplayName('');
    setSelectedMods(new Set());
    setRole(UserRole.EDITOR);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        mb: 4,
        p: 3,
        bgcolor: 'action.hover',
        borderRadius: 2,
      }}
    >
      <Typography variant="overline" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
        添加新用户
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        <TextField
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          label="登录用户名"
          size="small"
        />
        <TextField
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          label="初始密码"
          type="password"
          size="small"
        />
        <TextField
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          label="显示昵称"
          size="small"
        />
        <FormControl size="small">
          <InputLabel>角色</InputLabel>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            label="角色"
          >
            <MenuItem value={UserRole.EDITOR}>Mod作者/协作者</MenuItem>
            <MenuItem value={UserRole.SUPER} disabled={!isRootAdmin}>
              管理员
            </MenuItem>
          </Select>
        </FormControl>
      </Box>

      {!isRootAdmin && (
        <Alert severity="info" sx={{ mt: 2 }} icon={false}>
          <Typography variant="caption">
            提示：只有系统管理员才能创建或管理其他管理员。
          </Typography>
        </Alert>
      )}

      {role === UserRole.EDITOR && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            允许管理的 Mod:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {mods.map((m) => (
              <Chip
                key={m.id}
                label={m.name}
                size="small"
                onClick={() => toggleMod(m.id)}
                color={selectedMods.has(m.id) ? 'primary' : 'default'}
                variant={selectedMods.has(m.id) ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </Box>
      )}

      <Button type="submit" variant="contained" fullWidth sx={{ mt: 3 }}>
        创建用户
      </Button>
    </Box>
  );
};
