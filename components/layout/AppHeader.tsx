import React from 'react';
import { AppBar, Toolbar, Box, IconButton, ToggleButtonGroup, ToggleButton, Divider, useTheme } from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import ViewListIcon from '@mui/icons-material/ViewList';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { AuthSession, UserRole } from '@/types';
import { AppRoute } from '@/hooks/useHashRoute';
import { ThemeMode, ThemeToggle } from '../ThemeToggle';

interface AppHeaderProps {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  role: UserRole;
  session: AuthSession | null;
  onLogout: () => void;
  onLoginClick: () => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  onOpenApiModal: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeRoute,
  onNavigate,
  role,
  session,
  onLogout,
  onLoginClick,
  themeMode,
  setThemeMode,
  onOpenApiModal
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const showAdminTab = role === UserRole.SUPER || role === UserRole.EDITOR;
  const logoSrc = isDark ? '/logo_dark.jpg' : '/logo_light.jpg';

  // Header/Toolbar background color
  const headerBgColor = isDark ? '#024374' : '#EDEDED';

  return (
    <AppBar
      position="sticky"
      elevation={2}
      sx={{
        bgcolor: headerBgColor,
        borderBottom: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'divider',
      }}
    >
      <Toolbar
        sx={{
          maxWidth: 1280,
          width: '100%',
          mx: 'auto',
          px: { xs: 2, sm: 3, lg: 4 },
          minHeight: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo */}
        <Box
          component="img"
          src={logoSrc}
          alt="逃离鸭科夫 Mod 公告站"
          sx={{
            height: { xs: 36, sm: 42, md: 48 },
            width: 'auto',
            maxWidth: { xs: 140, sm: 180, md: 220 },
            objectFit: 'contain',
          }}
        />

        {/* Navigation & Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Route Toggle */}
          <ToggleButtonGroup
            value={activeRoute}
            exclusive
            onChange={(_, newValue) => {
              if (newValue !== null) {
                onNavigate(newValue);
              }
            }}
            size="small"
            sx={{
              bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
              borderRadius: 2,
              p: 0.5,
              '& .MuiToggleButton-root': {
                border: 'none',
                borderRadius: '6px !important',
                px: 1.5,
                py: 0.75,
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
                gap: 1,
                color: isDark ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                '&.Mui-selected': {
                  bgcolor: isDark ? 'rgba(255,255,255,0.15)' : '#fff',
                  color: isDark ? '#fff' : 'primary.main',
                  boxShadow: isDark ? 0 : 1,
                },
                '&:hover': {
                  bgcolor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.04)',
                },
              },
            }}
          >
            <ToggleButton value="announcements">
              <ViewListIcon sx={{ fontSize: 16 }} />
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                公告列表
              </Box>
            </ToggleButton>
            {showAdminTab && (
              <ToggleButton value="admin">
                <AdminPanelSettingsIcon sx={{ fontSize: 16 }} />
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  管理工具
                </Box>
              </ToggleButton>
            )}
          </ToggleButtonGroup>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'divider' }} />

          <ThemeToggle themeMode={themeMode} setThemeMode={setThemeMode} />

          {session && (
            <IconButton
              onClick={onOpenApiModal}
              title="API 调试"
              sx={{
                color: isDark ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                '&:hover': { color: isDark ? '#fff' : 'primary.main' },
              }}
            >
              <CodeIcon fontSize="small" />
            </IconButton>
          )}

          {session ? (
            <IconButton
              onClick={onLogout}
              title="退出登录"
              sx={{
                color: isDark ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                '&:hover': { color: 'error.main' },
              }}
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          ) : (
            <IconButton
              onClick={onLoginClick}
              title="登录"
              sx={{
                color: isDark ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                '&:hover': { color: isDark ? '#fff' : 'primary.main' },
              }}
            >
              <LoginIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};
