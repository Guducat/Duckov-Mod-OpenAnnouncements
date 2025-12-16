import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';

interface PromptDialogProps {
  open: boolean;
  title: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'password';
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  loading?: boolean;
  minLength?: number;
}

export const PromptDialog: React.FC<PromptDialogProps> = ({
  open,
  title,
  label,
  placeholder,
  type = 'text',
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
  loading = false,
  minLength,
}) => {
  const [value, setValue] = useState('');

  const handleConfirm = () => {
    if (value.trim()) {
      onConfirm(value);
      setValue('');
    }
  };

  const handleCancel = () => {
    setValue('');
    onCancel();
  };

  const isValid = !minLength || value.length >= minLength;

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="xs"
      fullWidth
      slotProps={{
        backdrop: {
          sx: { backdropFilter: 'blur(4px)' },
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label={label}
          placeholder={placeholder}
          type={type}
          fullWidth
          value={value}
          onChange={(e) => setValue(e.target.value)}
          size="small"
          sx={{ mt: 1 }}
          slotProps={{
            htmlInput: { minLength },
          }}
          helperText={minLength ? `至少 ${minLength} 个字符` : undefined}
          error={value.length > 0 && !isValid}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleCancel} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={loading || !value.trim() || !isValid}
        >
          {loading ? '处理中...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
