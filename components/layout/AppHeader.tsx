import React from 'react';
import { Code2, LayoutList, LogIn, LogOut, Shield } from 'lucide-react';
import { AuthSession, UserRole } from '../../types';
import { AppRoute } from '../../hooks/useHashRoute';
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
  const showAdminTab = role === UserRole.SUPER || role === UserRole.EDITOR;
  return (
    <header className="bg-white dark:bg-brand-card border-b border-slate-200 dark:border-brand-blue/20 sticky top-0 z-30 shadow-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Duckov"
            className="h-7 w-7 rounded"
            loading="eager"
            decoding="async"
            onError={(e) => {
              e.currentTarget.src = '/favicon.png';
            }}
          />
          <span className="font-bold text-lg tracking-tight hidden sm:inline">
            逃离鸭科夫
            <span className="text-slate-500 dark:text-brand-blue font-light">Mod公告板</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 dark:bg-black/20 rounded-lg p-1">
            <button
              onClick={() => onNavigate('announcements')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeRoute === 'announcements'
                  ? 'bg-white dark:bg-brand-blue/20 text-brand-blue dark:text-brand-yellow shadow-sm'
                  : 'text-slate-500 dark:text-brand-muted hover:text-slate-700'
              }`}
            >
              <LayoutList size={16} /> <span className="hidden sm:inline">公告列表</span>
            </button>
            {showAdminTab && (
              <button
                onClick={() => onNavigate('admin')}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  activeRoute === 'admin'
                    ? 'bg-white dark:bg-brand-blue/20 text-brand-blue dark:text-brand-yellow shadow-sm'
                    : 'text-slate-500 dark:text-brand-muted hover:text-slate-700'
                }`}
              >
                <Shield size={16} /> <span className="hidden sm:inline">管理工具</span>
              </button>
            )}
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-brand-blue/20 mx-1" />

          <ThemeToggle themeMode={themeMode} setThemeMode={setThemeMode} />

          {session && (
            <button
              onClick={onOpenApiModal}
              className="text-slate-500 hover:text-brand-blue dark:text-brand-muted dark:hover:text-brand-yellow transition-colors"
              title="API 调试"
            >
              <Code2 size={20} />
            </button>
          )}

          {session ? (
            <button
              onClick={onLogout}
              className="text-slate-500 hover:text-red-500 dark:text-brand-muted dark:hover:text-white transition-colors"
              title="退出登录"
            >
              <LogOut size={20} />
            </button>
          ) : (
            <button
              onClick={onLoginClick}
              className="text-slate-500 hover:text-brand-blue dark:text-brand-muted dark:hover:text-brand-yellow transition-colors"
              title="登录"
            >
              <LogIn size={20} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
