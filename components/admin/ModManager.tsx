import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  IconButton,
  Stack,
  Chip,
  AlertColor,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import SaveIcon from '@mui/icons-material/Save';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { ModDefinition } from '../../types';
import { modService } from '../../services/apiService';
import { AppSnackbar } from '../AppSnackbar';

interface ModManagerProps {
  token: string;
}

type DeleteStep = 'idle' | 'step1' | 'step2' | 'step3' | 'cooldown';

export const ModManager: React.FC<ModManagerProps> = ({ token }) => {
  const [mods, setMods] = useState<ModDefinition[]>([]);
  const [originalOrder, setOriginalOrder] = useState<string[]>([]);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Three-step delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    modId: string;
    modName: string;
    step: DeleteStep;
    cooldownRemaining: number;
  }>({
    open: false,
    modId: '',
    modName: '',
    step: 'idle',
    cooldownRemaining: 0,
  });

  const showMessage = (message: string, severity: AlertColor = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const loadMods = async () => {
    const res = await modService.list();
    if (res.success && res.data) {
      setMods(res.data);
      setOriginalOrder(res.data.map((m) => m.id));
    }
  };

  useEffect(() => {
    loadMods();
  }, []);

  // Cooldown timer effect
  useEffect(() => {
    if (deleteDialog.step !== 'cooldown' || deleteDialog.cooldownRemaining <= 0) return;

    const timer = setInterval(() => {
      setDeleteDialog((prev) => {
        const next = prev.cooldownRemaining - 100;
        if (next <= 0) {
          return { ...prev, step: 'step3', cooldownRemaining: 0 };
        }
        return { ...prev, cooldownRemaining: next };
      });
    }, 100);

    return () => clearInterval(timer);
  }, [deleteDialog.step, deleteDialog.cooldownRemaining]);

  // Check if order has changed
  const hasOrderChanged = useCallback(() => {
    if (mods.length !== originalOrder.length) return true;
    return mods.some((mod, index) => mod.id !== originalOrder[index]);
  }, [mods, originalOrder]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId || !newName) return;
    const res = await modService.create(token, { id: newId, name: newName });
    if (res.success) {
      setNewId('');
      setNewName('');
      loadMods();
      showMessage('Mod 创建成功', 'success');
    } else {
      showMessage(res.error || '创建失败', 'error');
    }
  };

  const handleDeleteClick = (mod: ModDefinition) => {
    setDeleteDialog({
      open: true,
      modId: mod.id,
      modName: mod.name,
      step: 'step1',
      cooldownRemaining: 0,
    });
  };

  const handleDeleteStepConfirm = async () => {
    if (deleteDialog.step === 'step1') {
      setDeleteDialog((prev) => ({ ...prev, step: 'step2' }));
    } else if (deleteDialog.step === 'step2') {
      // Start 5 second cooldown
      setDeleteDialog((prev) => ({ ...prev, step: 'cooldown', cooldownRemaining: 5000 }));
    } else if (deleteDialog.step === 'step3') {
      // Execute deletion
      const res = await modService.delete(token, deleteDialog.modId);
      setDeleteDialog({ open: false, modId: '', modName: '', step: 'idle', cooldownRemaining: 0 });
      if (res.success) {
        loadMods();
        showMessage('Mod 已删除，相关用户权限已清理', 'success');
      } else {
        showMessage(res.error || '删除失败', 'error');
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, modId: '', modName: '', step: 'idle', cooldownRemaining: 0 });
  };

  const getDeleteDialogContent = () => {
    switch (deleteDialog.step) {
      case 'step1':
        return {
          title: '第 1 步：确认删除',
          message: `您确定要删除 Mod「${deleteDialog.modName}」吗？`,
          warning: '此操作将影响所有关联的公告查询。',
          buttonText: '确认',
          buttonDisabled: false,
        };
      case 'step2':
        return {
          title: '第 2 步：再次确认',
          message: `请再次确认删除 Mod「${deleteDialog.modName}」。`,
          warning: '删除后，所有授权该 Mod 的用户将自动失去相关权限。',
          buttonText: '确认',
          buttonDisabled: false,
        };
      case 'cooldown':
        return {
          title: '第 3 步：最终确认',
          message: '请等待冷却时间结束后进行最终确认...',
          warning: '这是最后一次确认机会，删除操作不可撤销！',
          buttonText: `等待 ${Math.ceil(deleteDialog.cooldownRemaining / 1000)} 秒...`,
          buttonDisabled: true,
        };
      case 'step3':
        return {
          title: '第 3 步：最终确认',
          message: `最终确认：删除 Mod「${deleteDialog.modName}」？`,
          warning: '点击"删除"后将永久删除此 Mod 及清理相关用户权限！',
          buttonText: '删除',
          buttonDisabled: false,
        };
      default:
        return {
          title: '',
          message: '',
          warning: '',
          buttonText: '',
          buttonDisabled: true,
        };
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newMods = [...mods];
    const [draggedItem] = newMods.splice(draggedIndex, 1);
    newMods.splice(dropIndex, 0, draggedItem);
    setMods(newMods);

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Save order
  const handleSaveOrder = async () => {
    setIsSaving(true);
    const orderedIds = mods.map((m) => m.id);
    const res = await modService.reorder(token, orderedIds);
    setIsSaving(false);

    if (res.success) {
      setOriginalOrder(orderedIds);
      showMessage('排序已保存', 'success');
    } else {
      showMessage(res.error || '保存失败', 'error');
    }
  };

  // Reset order
  const handleResetOrder = () => {
    const modMap = new Map(mods.map((m) => [m.id, m]));
    const restored = originalOrder.map((id) => modMap.get(id)).filter(Boolean) as ModDefinition[];
    setMods(restored);
  };

  const dialogContent = getDeleteDialogContent();

  return (
    <Box>
      {/* Create Form */}
      <Box
        component="form"
        onSubmit={handleAdd}
        sx={{
          display: 'flex',
          gap: 2,
          mb: 4,
          p: 3,
          bgcolor: 'action.hover',
          borderRadius: 2,
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        <Box sx={{ flex: 1 }}>
          <TextField
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            label="Mod ID"
            placeholder="例 DuckovCustomSoundsMod_v1, 仅英文"
            fullWidth
            size="small"
            helperText="系统唯一标识，不可重复，不可含中文"
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <TextField
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            label="显示名称"
            placeholder="如 鸭科夫自定义音乐音效Mod"
            fullWidth
            size="small"
            helperText="用于 UI 显示，支持任意字符"
          />
        </Box>
        <Button
          type="submit"
          variant="contained"
          sx={{ height: 40, alignSelf: { xs: 'stretch', md: 'flex-start' } }}
        >
          添加
        </Button>
      </Box>

      {/* Order Changed Alert */}
      {hasOrderChanged() && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Stack direction="row" spacing={1}>
              <Button color="inherit" size="small" onClick={handleResetOrder}>
                撤销
              </Button>
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={handleSaveOrder}
                disabled={isSaving}
              >
                {isSaving ? '保存中...' : '保存排序'}
              </Button>
            </Stack>
          }
        >
          排序已更改，请点击"保存排序"按钮保存更改
        </Alert>
      )}

      {/* Mod List */}
      <Stack spacing={1}>
        {mods.map((mod, index) => (
          <Card
            key={mod.id}
            variant="outlined"
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            sx={{
              cursor: 'grab',
              transition: 'all 0.2s ease',
              opacity: draggedIndex === index ? 0.5 : 1,
              transform: dragOverIndex === index ? 'scale(1.02)' : 'none',
              borderColor: dragOverIndex === index ? 'primary.main' : undefined,
              borderWidth: dragOverIndex === index ? 2 : 1,
              '&:hover': {
                borderColor: 'primary.light',
                bgcolor: 'action.hover',
              },
              '&:active': {
                cursor: 'grabbing',
              },
            }}
          >
            <CardContent
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1.5,
                '&:last-child': { pb: 1.5 },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <DragIndicatorIcon
                  sx={{
                    color: 'text.disabled',
                    cursor: 'grab',
                    '&:active': { cursor: 'grabbing' },
                  }}
                />
                <Typography variant="subtitle1" fontWeight={700}>
                  {mod.name}
                </Typography>
                <Chip
                  label={mod.id}
                  size="small"
                  variant="outlined"
                  sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                />
              </Box>
              <IconButton
                onClick={() => handleDeleteClick(mod)}
                color="error"
                size="small"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {mods.length === 0 && (
        <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
          暂无 Mod，请先添加
        </Typography>
      )}

      {/* Three-step Delete Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={handleDeleteCancel}
        maxWidth="xs"
        fullWidth
        slotProps={{
          backdrop: {
            sx: { backdropFilter: 'blur(4px)' },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="error" />
          {dialogContent.title}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>{dialogContent.message}</Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {dialogContent.warning}
          </Alert>
          {deleteDialog.step === 'cooldown' && (
            <LinearProgress
              variant="determinate"
              value={((5000 - deleteDialog.cooldownRemaining) / 5000) * 100}
              color="error"
            />
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Mod ID: <code>{deleteDialog.modId}</code>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleDeleteCancel}>取消</Button>
          <Button
            onClick={handleDeleteStepConfirm}
            variant="contained"
            color="error"
            disabled={dialogContent.buttonDisabled}
          >
            {dialogContent.buttonText}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <AppSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  );
};
