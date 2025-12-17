import React, { useState } from 'react';
import { Box, Container, Typography, Button, Stack } from '@mui/material';
import { AuthSession, UserRole } from '../types';
import { ThemeMode } from '../components/ThemeToggle';
import { AppHeader } from '../components/layout/AppHeader';
import { ApiDebugModal } from '../components/layout/ApiDebugModal';
import { AdminTools } from '../components/admin/AdminTools';
import { AppRoute } from '../hooks/useHashRoute';
import { useSessionInfo } from '../hooks/useSessionInfo';

interface AdminPageProps {
  session: AuthSession | null;
  onLogout: () => void;
  onLoginClick: () => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  session,
  onLogout,
  onLoginClick,
  themeMode,
  setThemeMode,
  activeRoute,
  onNavigate
}) => {
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const { role } = useSessionInfo(session);
  const canAccessAdminTools = !!session && (role === UserRole.SUPER || role === UserRole.EDITOR);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        color: 'text.primary',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <AppHeader
        activeRoute={activeRoute}
        onNavigate={onNavigate}
        role={role}
        session={session}
        onLogout={onLogout}
        onLoginClick={onLoginClick}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        onOpenApiModal={() => setIsApiModalOpen(true)}
      />

      <Container component="main" maxWidth="lg" sx={{ flex: 1, py: 4 }}>
        {canAccessAdminTools ? (
          <Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h4" component="h1" fontWeight={700} sx={{ mb: 0.5 }}>
                {role === UserRole.SUPER ? '系统管理面板' : '管理工具'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {role === UserRole.SUPER ? '管理 Mod 分类、团队成员与 API key' : '管理并生成你的 CI API key'}
              </Typography>
            </Box>
            <AdminTools
              token={session.token}
              currentUsername={session.user.username}
              isRootAdmin={!!session.user.isRootAdmin}
              role={role}
              allowedModIds={session.user.allowedMods || []}
            />
          </Box>
        ) : (
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 3,
              border: '1px dashed',
              borderColor: 'divider',
              p: 4,
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
              无权限访问管理面板
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              该页面仅对管理员开放，请登录管理员账号。
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button variant="contained" onClick={onLoginClick}>
                去登录
              </Button>
              <Button variant="text" onClick={() => onNavigate('announcements')}>
                返回公告列表
              </Button>
            </Stack>
          </Box>
        )}
      </Container>

      <ApiDebugModal isOpen={isApiModalOpen} onClose={() => setIsApiModalOpen(false)} token={session?.token} />
    </Box>
  );
};
