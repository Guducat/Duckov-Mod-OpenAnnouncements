import React from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Alert,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import { Announcement, ModDefinition, UserRole } from '../../types';
import { AnnouncementCard } from '../AnnouncementCard';

interface AnnouncementsPanelProps {
  announcements: Announcement[];
  availableMods: ModDefinition[];
  currentModId: string;
  onSelectMod: (modId: string) => void;
  loadError: string;
  loading: boolean;
  onRefresh: (opts?: { force?: boolean }) => void;
  onOpenCreateModal: () => void;
  role: UserRole;
  canEditCurrentMod: boolean;
  currentModName: string;
  onDelete: (id: string) => void;
  onEdit: (announcement: Announcement) => void;
}

export const AnnouncementsPanel: React.FC<AnnouncementsPanelProps> = ({
  announcements,
  availableMods,
  currentModId,
  onSelectMod,
  loadError,
  loading,
  onRefresh,
  onOpenCreateModal,
  role,
  canEditCurrentMod,
  currentModName,
  onDelete,
  onEdit,
}) => {
  const hasMods = availableMods.length > 0;

  const renderEmptyState = () => {
    if (!hasMods) {
      return '您当前没有访问任何 Mod 公告板的权限。';
    }
    return (
      <span>
        在 <strong>{currentModName}</strong> 分组下未找到公告。
      </span>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'flex-start' },
          mb: 3,
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h2" component="h1" sx={{ mb: 2 }}>
            公告列表
          </Typography>

          {/* Mod Selector */}
          {hasMods ? (
            <Stack spacing={1.25}>
              <ToggleButtonGroup
                value={currentModId}
                exclusive
                onChange={(_, newValue) => {
                  if (newValue !== null) {
                    onSelectMod(newValue);
                  }
                }}
                size="small"
                sx={{
                  flexWrap: 'wrap',
                  gap: 0.5,
                  '& .MuiToggleButton-root': {
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: '8px !important',
                    px: 2,
                    py: 0.75,
                    textTransform: 'none',
                    fontWeight: 500,
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      borderColor: 'primary.main',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                    },
                  },
                }}
              >
                {availableMods.map((mod) => (
                  <ToggleButton key={mod.id} value={mod.id}>
                    {mod.name}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>

              {role === UserRole.EDITOR && !canEditCurrentMod && (
                <Alert severity="info" sx={{ py: 0.5 }}>
                  当前 Mod 仅可查看，暂无编辑/发布权限（如需编辑请联系管理员授权）。
                </Alert>
              )}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              无权限或无数据
            </Typography>
          )}
        </Box>

        {/* Actions */}
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <IconButton
            onClick={() => onRefresh({ force: true })}
            title="刷新列表"
            sx={{
              border: 1,
              borderColor: 'transparent',
              '&:hover': {
                borderColor: 'divider',
              },
            }}
          >
            <RefreshIcon
              sx={{
                animation: loading ? 'spin 1s linear infinite' : 'none',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' },
                },
              }}
            />
          </IconButton>
          {role !== UserRole.GUEST && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onOpenCreateModal}
              disabled={!hasMods || !canEditCurrentMod}
            >
              新建公告
            </Button>
          )}
        </Stack>
      </Box>

      {/* Error Alert */}
      {loadError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {loadError}
        </Alert>
      )}

      {/* Content */}
      {loading && announcements.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {announcements.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 10,
                bgcolor: 'background.paper',
                borderRadius: 2,
                border: '1px dashed',
                borderColor: 'divider',
                color: 'text.secondary',
              }}
            >
              {renderEmptyState()}
            </Box>
          ) : (
            <Stack spacing={2}>
              {announcements.map((announcement) => (
                <AnnouncementCard
                  key={announcement.id}
                  data={announcement}
                  modName={currentModName}
                  userRole={role}
                  onDelete={onDelete}
                  onEdit={canEditCurrentMod ? onEdit : undefined}
                />
              ))}
            </Stack>
          )}
        </>
      )}
    </Box>
  );
};
