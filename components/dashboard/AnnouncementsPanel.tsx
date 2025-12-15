import React from 'react';
import { RefreshCw, Plus } from 'lucide-react';
import { Announcement, ModDefinition, UserRole } from '../../types';
import { AnnouncementCard } from '../AnnouncementCard';

interface AnnouncementsPanelProps {
  announcements: Announcement[];
  availableMods: ModDefinition[];
  currentModId: string;
  onSelectMod: (modId: string) => void;
  loadError: string;
  loading: boolean;
  onRefresh: () => void;
  onOpenCreateModal: () => void;
  role: UserRole;
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
  currentModName,
  onDelete,
  onEdit
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
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-brand-white mb-3">公告列表</h1>
          <div className="flex flex-wrap gap-2">
            {hasMods
              ? availableMods.map((mod) => (
                  <button
                    type="button"
                    key={mod.id}
                    onClick={() => onSelectMod(mod.id)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all border ${
                      currentModId === mod.id
                        ? 'bg-brand-blue dark:bg-brand-yellow text-white dark:text-brand-base border-brand-blue dark:border-brand-yellow shadow-md'
                        : 'bg-white dark:bg-brand-card text-slate-600 dark:text-brand-muted border-slate-200 dark:border-brand-blue/20 hover:border-brand-blue dark:hover:border-brand-yellow'
                    }`}
                  >
                    {mod.name}
                  </button>
                ))
              : (
                <span className="text-sm text-slate-500 dark:text-brand-muted">无权限或无数据</span>
              )}
          </div>
        </div>

        <div className="flex gap-3 shrink-0">
          <button
            onClick={onRefresh}
            className="p-2 text-slate-500 hover:text-brand-blue hover:bg-white dark:text-brand-muted dark:hover:text-brand-yellow dark:hover:bg-brand-card rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-transparent"
            title="刷新列表"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          {role !== UserRole.GUEST && (
            <button
              onClick={onOpenCreateModal}
              disabled={!hasMods}
              className="flex items-center gap-2 bg-brand-blue hover:bg-blue-600 dark:bg-brand-yellow dark:hover:bg-yellow-400 text-white dark:text-brand-base font-bold px-4 py-2 rounded-lg transition-colors shadow-lg shadow-blue-900/10 dark:shadow-yellow-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={20} />
              新建公告
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="mb-6 text-sm p-3 rounded border bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/40 dark:text-red-300">
          {loadError}
        </div>
      )}

      {loading && announcements.length === 0 ? (
        <div className="text-center py-20 text-slate-500 dark:text-brand-muted">加载中...</div>
      ) : (
        <>
          {announcements.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-brand-card/50 rounded-xl border border-dashed border-slate-300 dark:border-brand-blue/20 text-slate-500 dark:text-brand-muted">
              {renderEmptyState()}
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <AnnouncementCard
                  key={announcement.id}
                  data={announcement}
                  modName={currentModName}
                  userRole={role}
                  onDelete={onDelete}
                  onEdit={onEdit}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
