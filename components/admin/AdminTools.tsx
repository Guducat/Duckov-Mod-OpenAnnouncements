import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import StorageIcon from '@mui/icons-material/Storage';
import PersonIcon from '@mui/icons-material/Person';
import { ModManager } from './ModManager';
import { UserManager } from './UserManager';
import { ApiKeyManager } from './ApiKeyManager';
import { UserRole } from '@/types';

interface AdminToolsProps {
  token: string;
  currentUsername: string;
  isRootAdmin: boolean;
  role: UserRole;
  allowedModIds: string[];
}

type TabValue = 'mods' | 'users' | 'apikeys';

export const AdminTools: React.FC<AdminToolsProps> = ({ token, currentUsername, isRootAdmin, role, allowedModIds }) => {
  const [activeTab, setActiveTab] = useState<TabValue>(() => (role === UserRole.SUPER ? 'mods' : 'apikeys'));

  const handleTabChange = (_event: React.SyntheticEvent, newValue: TabValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              minHeight: 48,
              gap: 1,
            },
          }}
        >
          {role === UserRole.SUPER && (
            <Tab
              value="mods"
              icon={<StorageIcon fontSize="small" />}
              iconPosition="start"
              label="Mod 管理"
            />
          )}
          {role === UserRole.SUPER && (
            <Tab
              value="users"
              icon={<PersonIcon fontSize="small" />}
              iconPosition="start"
              label="成员管理"
            />
          )}
          <Tab
            value="apikeys"
            icon={<VpnKeyIcon fontSize="small" />}
            iconPosition="start"
            label="API Key"
          />
        </Tabs>
      </Box>

      <Box sx={{ minHeight: 300 }}>
        {role === UserRole.SUPER && activeTab === 'mods' && <ModManager token={token} />}
        {role === UserRole.SUPER && activeTab === 'users' && (
          <UserManager token={token} currentUsername={currentUsername} isRootAdmin={isRootAdmin} />
        )}
        {activeTab === 'apikeys' && (
          <ApiKeyManager
            token={token}
            currentUsername={currentUsername}
            isRootAdmin={isRootAdmin}
            role={role}
            allowedModIds={allowedModIds}
          />
        )}
      </Box>
    </Box>
  );
};
