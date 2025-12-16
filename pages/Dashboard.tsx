import React, { useState } from 'react';
import { Box, Container } from '@mui/material';
import { AuthSession, UserRole } from '../types';
import { ThemeMode } from '../components/ThemeToggle';
import { AppHeader } from '../components/layout/AppHeader';
import { AnnouncementsPanel } from '../components/dashboard/AnnouncementsPanel';
import { CreateAnnouncementModal } from '../components/dashboard/CreateAnnouncementModal';
import { EditAnnouncementModal } from '../components/dashboard/EditAnnouncementModal';
import { ApiDebugModal } from '../components/layout/ApiDebugModal';
import { AppRoute } from '../hooks/useHashRoute';
import { useDashboardController } from './hooks/useDashboardController';

interface DashboardProps {
  session: AuthSession | null;
  onLogout: () => void;
  onLoginClick: () => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  session,
  onLogout,
  onLoginClick,
  themeMode,
  setThemeMode,
  activeRoute,
  onNavigate
}) => {
  const {
    role,
    canEditCurrentMod,
    announcements,
    availableMods,
    currentModId,
    selectMod,
    loading,
    loadError,
    refreshAnnouncements,
    isCreateModalOpen,
    openCreateModal,
    closeCreateModal,
    newVersion,
    newTitle,
    newContent,
    updateNewVersion,
    updateNewTitle,
    updateNewContent,
    isSubmitting,
    handleCreate,
    isEditModalOpen,
    editTarget,
    openEditModal,
    closeEditModal,
    editVersion,
    editTitle,
    editContent,
    updateEditVersion,
    updateEditTitle,
    updateEditContent,
    isEditSubmitting,
    handleEdit,
    handleDelete
  } = useDashboardController(session);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);

  const currentModName = availableMods.find((m) => m.id === currentModId)?.name || '';
  const editModalModName = editTarget
    ? availableMods.find((m) => m.id === editTarget.modId)?.name || currentModName
    : currentModName;

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
        <AnnouncementsPanel
          announcements={announcements}
          availableMods={availableMods}
          currentModId={currentModId}
          onSelectMod={selectMod}
          loadError={loadError}
          loading={loading}
          onRefresh={refreshAnnouncements}
          onOpenCreateModal={openCreateModal}
          role={role}
          canEditCurrentMod={canEditCurrentMod}
          currentModName={currentModName}
          onDelete={handleDelete}
          onEdit={openEditModal}
        />
      </Container>

      {role !== UserRole.GUEST && canEditCurrentMod && (
        <CreateAnnouncementModal
          isOpen={isCreateModalOpen}
          onClose={closeCreateModal}
          targetModId={currentModId}
          targetModName={currentModName}
          version={newVersion}
          title={newTitle}
          content={newContent}
          onVersionChange={updateNewVersion}
          onTitleChange={updateNewTitle}
          onContentChange={updateNewContent}
          onSubmit={handleCreate}
          isSubmitting={isSubmitting}
        />
      )}

      {role !== UserRole.GUEST && canEditCurrentMod && (
        <EditAnnouncementModal
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          modName={editModalModName}
          modId={editTarget?.modId || currentModId}
          version={editVersion}
          title={editTitle}
          content={editContent}
          onVersionChange={updateEditVersion}
          onTitleChange={updateEditTitle}
          onContentChange={updateEditContent}
          isSubmitting={isEditSubmitting}
          onSubmit={handleEdit}
        />
      )}

      <ApiDebugModal isOpen={isApiModalOpen} onClose={() => setIsApiModalOpen(false)} token={session?.token} />
    </Box>
  );
};
