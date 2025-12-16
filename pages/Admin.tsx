import React, { useState } from 'react';
import { AuthSession, UserRole } from '../types';
import { ThemeMode } from '../components/ThemeToggle';
import { AppHeader } from '../components/layout/AppHeader';
import { ApiDebugModal } from '../components/layout/ApiDebugModal';
import { AdminTools } from '../components/AdminTools';
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
        {canAccessAdminTools ? (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-brand-white">
                {role === UserRole.SUPER ? '系统管理面板' : '管理工具'}
              </h1>
              <p className="text-slate-500 dark:text-brand-muted">
                {role === UserRole.SUPER ? '管理 Mod 分类、团队成员与 API key' : '管理并生成你的 CI API key'}
              </p>
            </div>
            <AdminTools
              token={session.token}
              currentUsername={session.user.username}
              isRootAdmin={!!session.user.isRootAdmin}
              role={role}
              allowedModIds={session.user.allowedMods || []}
            />
          </div>
        ) : (
          <div className="bg-white dark:bg-brand-card/50 rounded-xl border border-dashed border-slate-300 dark:border-brand-blue/20 p-8 text-center text-slate-600 dark:text-brand-muted">
            <div className="font-bold text-slate-800 dark:text-brand-white mb-2">无权限访问管理面板</div>
            <div className="text-sm mb-6">该页面仅对管理员开放，请登录管理员账号。</div>
            <div className="flex justify-center gap-3">
              <button
                onClick={onLoginClick}
                className="bg-brand-blue hover:bg-blue-600 dark:bg-brand-yellow dark:hover:bg-yellow-400 text-white dark:text-brand-base font-bold px-4 py-2 rounded-lg transition-colors"
              >
                去登录
              </button>
              <button
                onClick={() => onNavigate('announcements')}
                className="px-4 py-2 text-slate-500 hover:text-slate-900 dark:text-brand-muted dark:hover:text-brand-white transition-colors"
              >
                返回公告列表
              </button>
            </div>
          </div>
        )}
      </main>

      <ApiDebugModal isOpen={isApiModalOpen} onClose={() => setIsApiModalOpen(false)} />
    </div>
  );
};

