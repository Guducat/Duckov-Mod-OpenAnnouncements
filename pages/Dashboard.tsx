import React, { useState } from 'react';
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
    token,
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
    newTitle,
    newContent,
    updateNewTitle,
    updateNewContent,
    isSubmitting,
    handleCreate,
    isEditModalOpen,
    editTarget,
    openEditModal,
    closeEditModal,
    editTitle,
    editContent,
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
    <div className="min-h-screen bg-slate-50 dark:bg-brand-base text-slate-900 dark:text-brand-white flex flex-col transition-colors duration-300">
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

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
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
          currentModName={currentModName}
          onDelete={handleDelete}
          onEdit={openEditModal}
        />
      </main>

      {role !== UserRole.GUEST && (
        <CreateAnnouncementModal
          isOpen={isCreateModalOpen}
          onClose={closeCreateModal}
          targetModId={currentModId}
          targetModName={currentModName}
          title={newTitle}
          content={newContent}
          onTitleChange={updateNewTitle}
          onContentChange={updateNewContent}
          onSubmit={handleCreate}
          isSubmitting={isSubmitting}
        />
      )}

      {role !== UserRole.GUEST && (
        <EditAnnouncementModal
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          modName={editModalModName}
          modId={editTarget?.modId || currentModId}
          title={editTitle}
          content={editContent}
          onTitleChange={updateEditTitle}
          onContentChange={updateEditContent}
          isSubmitting={isEditSubmitting}
          onSubmit={handleEdit}
        />
      )}

      <ApiDebugModal isOpen={isApiModalOpen} onClose={() => setIsApiModalOpen(false)} token={token} />
    </div>
  );
};
