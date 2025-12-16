import React, { useState } from 'react';
import { Key, Server, User as UserIcon } from 'lucide-react';
import { ModManager } from './ModManager';
import { UserManager } from './UserManager';
import { ApiKeyManager } from './ApiKeyManager';
import { UserRole } from '../../types';

interface AdminToolsProps {
  token: string;
  currentUsername: string;
  isRootAdmin: boolean;
  role: UserRole;
  allowedModIds: string[];
}

export const AdminTools: React.FC<AdminToolsProps> = ({ token, currentUsername, isRootAdmin, role, allowedModIds }) => {
  const [activeTab, setActiveTab] = useState<'mods' | 'users' | 'apikeys'>(() => (role === UserRole.SUPER ? 'mods' : 'apikeys'));

  return (
    <div className="space-y-6">
      <div className="flex space-x-4 border-b border-slate-200 dark:border-brand-blue/20 pb-1">
        {role === UserRole.SUPER && (
          <>
            <button
              onClick={() => setActiveTab('mods')}
              className={`px-4 py-2 font-medium flex items-center gap-2 transition-colors ${
                activeTab === 'mods'
                  ? 'text-brand-blue dark:text-brand-yellow border-b-2 border-brand-blue dark:border-brand-yellow'
                  : 'text-slate-500 dark:text-brand-muted hover:text-slate-700 dark:hover:text-white'
              }`}
            >
              <Server size={18} /> Mod 管理
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 font-medium flex items-center gap-2 transition-colors ${
                activeTab === 'users'
                  ? 'text-brand-blue dark:text-brand-yellow border-b-2 border-brand-blue dark:border-brand-yellow'
                  : 'text-slate-500 dark:text-brand-muted hover:text-slate-700 dark:hover:text-white'
              }`}
            >
              <UserIcon size={18} /> 成员管理
            </button>
          </>
        )}
        <button
          onClick={() => setActiveTab('apikeys')}
          className={`px-4 py-2 font-medium flex items-center gap-2 transition-colors ${
            activeTab === 'apikeys'
              ? 'text-brand-blue dark:text-brand-yellow border-b-2 border-brand-blue dark:border-brand-yellow'
              : 'text-slate-500 dark:text-brand-muted hover:text-slate-700 dark:hover:text-white'
          }`}
        >
          <Key size={18} /> API Key
        </button>
      </div>

      <div className="min-h-[300px]">
        {role === UserRole.SUPER && activeTab === 'mods' ? <ModManager token={token} /> : null}
        {role === UserRole.SUPER && activeTab === 'users' ? (
          <UserManager token={token} currentUsername={currentUsername} isRootAdmin={isRootAdmin} />
        ) : null}
        {activeTab === 'apikeys' ? (
          <ApiKeyManager
            token={token}
            currentUsername={currentUsername}
            isRootAdmin={isRootAdmin}
            role={role}
            allowedModIds={allowedModIds}
          />
        ) : null}
      </div>

      <style>{`
        .input-std {
          width: 100%;
          background-color: transparent;
          border: 1px solid;
          border-color: #cbd5e1;
          border-radius: 0.25rem;
          padding: 0.5rem;
          font-size: 0.875rem;
          outline: none;
        }
        .dark .input-std {
          border-color: #334155;
          color: white;
        }
        .badge {
          font-size: 0.75rem;
          padding: 0.125rem 0.5rem;
          border-radius: 9999px;
          border-width: 1px;
        }
      `}</style>
    </div>
  );
};

