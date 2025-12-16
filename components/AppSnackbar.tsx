import React from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

export interface SnackbarMessage {
  message: string;
  severity: AlertColor;
}

interface AppSnackbarProps {
  open: boolean;
  message: string;
  severity: AlertColor;
  onClose: () => void;
  autoHideDuration?: number;
}

export const AppSnackbar: React.FC<AppSnackbarProps> = ({
  open,
  message,
  severity,
  onClose,
  autoHideDuration = 4000,
}) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        variant="filled"
        sx={{
          width: '100%',
          ...(severity === 'success'
            ? {
                color: '#ffffff',
                '& .MuiAlert-icon': { color: '#ffffff' },
                '& .MuiAlert-action': { color: '#ffffff' },
              }
            : {}),
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};
