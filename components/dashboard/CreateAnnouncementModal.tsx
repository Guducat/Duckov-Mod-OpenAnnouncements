import React from 'react';
import {
  Box,
  TextField,
  Button,
  Stack,
  Alert,
  Typography,
} from '@mui/material';
import { Modal } from '../Modal';
import { Editor } from '../Editor';

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetModId: string;
  targetModName: string;
  version: string;
  title: string;
  content: string;
  onVersionChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({
  isOpen,
  onClose,
  targetModId,
  targetModName,
  version,
  title,
  content,
  onVersionChange,
  onTitleChange,
  onContentChange,
  onSubmit,
  isSubmitting,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title="发布新公告" maxWidth="md">
    <Box component="form" onSubmit={onSubmit}>
      <Stack spacing={3}>
        {/* Target Mod Info */}
        <Alert severity="info" icon={false}>
          <Typography variant="body2" color="text.secondary" component="span">
            发布至:{' '}
          </Typography>
          <Typography variant="body2" color="primary" fontWeight={700} component="span">
            {targetModName || '未选择 Mod'} {targetModId ? `(${targetModId})` : ''}
          </Typography>
        </Alert>

        {/* Title */}
        <TextField
          label="标题"
          required
          fullWidth
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="例如：v1.2 版本更新说明"
        />

        {/* Version */}
        <Box>
          <TextField
            label="Version（可选）"
            fullWidth
            value={version}
            onChange={(e) => onVersionChange(e.target.value)}
            placeholder="例如：1.0.1 / 1.0.0 Beta / 1.0.0 Alpha"
            slotProps={{
              input: {
                sx: { fontFamily: 'monospace' },
              },
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            用于展示版本标签，并在列表中按版本号排序（高版本在上）。
          </Typography>
        </Box>

        {/* Content Editor */}
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            内容详情
          </Typography>
          <Editor value={content} onChange={onContentChange} />
        </Box>

        {/* Actions */}
        <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ pt: 2 }}>
          <Button onClick={onClose} color="inherit">
            取消
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || !title || !content}
          >
            {isSubmitting ? '发布中...' : '发布公告'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  </Modal>
);
