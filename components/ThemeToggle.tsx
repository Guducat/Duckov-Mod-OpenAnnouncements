import React, { useState } from 'react';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeToggleProps {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ themeMode, setThemeMode }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (mode: ThemeMode) => {
    setThemeMode(mode);
    handleClose();
  };

  const options: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: '浅色', icon: <LightModeIcon fontSize="small" /> },
    { value: 'dark', label: '深色', icon: <DarkModeIcon fontSize="small" /> },
    { value: 'system', label: '跟随系统', icon: <SettingsBrightnessIcon fontSize="small" /> },
  ];

  const currentIcon = themeMode === 'light' ? <LightModeIcon />
    : themeMode === 'dark' ? <DarkModeIcon />
    : <SettingsBrightnessIcon />;

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="small"
        sx={{
          bgcolor: 'action.hover',
          '&:hover': {
            bgcolor: 'action.selected',
          },
        }}
        title="切换主题"
      >
        {currentIcon}
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            sx: { minWidth: 140, mt: 1 },
          },
        }}
      >
        {options.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => handleSelect(option.value)}
            selected={themeMode === option.value}
            sx={{
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
                '& .MuiListItemIcon-root': {
                  color: 'inherit',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              {option.icon}
            </ListItemIcon>
            <ListItemText primary={option.label} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
