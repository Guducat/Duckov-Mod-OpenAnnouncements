import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import EditIcon from '@mui/icons-material/Edit';
import CodeIcon from '@mui/icons-material/Code';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Announcement, UserRole } from '@/types';
import { ConfirmDialog } from './ConfirmDialog';

interface AnnouncementCardProps {
  data: Announcement;
  modName?: string;
  userRole: UserRole;
  onDelete: (id: string) => void;
  onEdit?: (a: Announcement) => void;
}

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  data,
  modName,
  userRole,
  onDelete,
  onEdit,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [apiDebugOpen, setApiDebugOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // 检查内容是否溢出（需要“展开”按钮）
  useEffect(() => {
    const checkOverflow = () => {
      if (contentRef.current && !expanded) {
        const { scrollHeight, clientHeight } = contentRef.current;
        setIsOverflowing(scrollHeight > clientHeight);
      }
    };

    checkOverflow();
    // Re-check on window resize
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [data.content_html, expanded]);

  const dateStr = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(data.timestamp));

  const handleDeleteConfirm = () => {
    onDelete(data.id);
    setDeleteConfirmOpen(false);
  };

  const apiResponse = JSON.stringify(
    {
      code: 200,
      result: 'ok',
      data: {
        mod: { id: data.modId, name: modName ?? '' },
        announcement: data,
      },
    },
    null,
    2
  );

  const handleCopyApiResponse = async () => {
    try {
      await navigator.clipboard.writeText(apiResponse);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <>
      <Card
        sx={{
          mb: 2,
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: 4,
            borderColor: 'primary.light',
          },
        }}
      >
        <CardContent sx={{ p: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1 }}>
              {/* Title and Tags */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
                <Typography variant="h3" component="h3" sx={{ fontWeight: 700 }}>
                  {data.title}
                </Typography>
                <Chip
                  label={data.modId}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                />
                {data.version?.trim() && (
                  <Chip
                    label={data.version.trim()}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      borderColor: 'divider',
                      color: 'text.secondary',
                    }}
                  />
                )}
              </Box>

              {/* Meta Info */}
              <Box sx={{ display: 'flex', gap: 2, color: 'text.secondary', fontSize: '0.875rem', mb: 2 }}>
                <Typography variant="body2">
                  发布者:{' '}
                  <Box component="span" sx={{ color: 'primary.main', fontWeight: 500 }}>
                    {data.author}
                  </Box>
                </Typography>
                <Typography variant="body2">{dateStr}</Typography>
              </Box>
            </Box>

            {/* Actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {userRole !== UserRole.GUEST && (
                <IconButton
                  onClick={() => setApiDebugOpen(true)}
                  size="small"
                  title="查看 API 返回数据"
                  sx={{
                    color: 'text.secondary',
                    '&:hover': {
                      color: 'info.main',
                      backgroundColor: 'rgba(2, 136, 209, 0.08)',
                    },
                  }}
                >
                  <CodeIcon fontSize="small" />
                </IconButton>
              )}
              {userRole !== UserRole.GUEST && onEdit && (
                <IconButton
                  onClick={() => onEdit(data)}
                  size="small"
                  title="编辑公告"
                  sx={{
                    color: 'text.secondary',
                    '&:hover': {
                      color: 'primary.main',
                      bgcolor: 'primary.main',
                      backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    },
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
              {userRole === UserRole.SUPER && (
                <IconButton
                  onClick={() => setDeleteConfirmOpen(true)}
                  size="small"
                  title="删除公告"
                  sx={{
                    color: 'error.main',
                    '&:hover': {
                      bgcolor: 'error.main',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    },
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          </Box>

          {/* Content */}
          <Box
            ref={contentRef}
            sx={{
              color: 'text.secondary',
              '& p': { margin: 0, mb: 1 },
              '& a': { color: 'primary.main' },
              '& ul, & ol': { pl: 3 },
              ...(!expanded && {
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }),
            }}
            dangerouslySetInnerHTML={{ __html: data.content_html }}
          />

          {/* Expand Button - only show when content is truncated */}
          {(isOverflowing || expanded) && (
            <Button
              onClick={() => setExpanded(!expanded)}
              size="small"
              sx={{
                mt: 2,
                textTransform: 'none',
                fontWeight: 500,
              }}
              endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            >
              {expanded ? '收起内容' : '阅读全文'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="删除公告"
        message="确定要删除这条公告吗？此操作不可恢复。"
        confirmText="删除"
        confirmColor="error"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      {/* API Debug Dialog */}
      <Dialog
        open={apiDebugOpen}
        onClose={() => setApiDebugOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          backdrop: {
            sx: { backdropFilter: 'blur(4px)' },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          API 返回数据（调试）
          <IconButton onClick={() => setApiDebugOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Button
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={handleCopyApiResponse}
              sx={{ textTransform: 'none' }}
            >
              {copied ? '已复制' : '复制'}
            </Button>
          </Box>
          <Box
            component="pre"
            sx={{
              p: 2,
              borderRadius: 1,
              bgcolor: 'action.hover',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              color: 'text.secondary',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              m: 0,
              maxHeight: 400,
              overflow: 'auto',
            }}
          >
            {apiResponse}
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};
