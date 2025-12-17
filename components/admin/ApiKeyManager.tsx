import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Alert,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  AlertColor,
} from '@mui/material';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import { ApiKey, CreateApiKeyResponse, ModDefinition, UserRole } from '@/types';
import { apiKeyService, modService } from '@/services/apiService';
import { isAllowedModId } from '@/utils/modId';
import { Modal } from '../Modal';
import { ThreeStepConfirmDialog } from '../ThreeStepConfirmDialog';
import { AppSnackbar } from '../AppSnackbar';

interface ApiKeyManagerProps {
  token: string;
  currentUsername: string;
  isRootAdmin: boolean;
  role: UserRole;
  allowedModIds: string[];
}

const formatTime = (ts?: number) => {
  if (!ts) return '-';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
};

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({
  token,
  currentUsername,
  isRootAdmin,
  role,
  allowedModIds,
}) => {
  const [mods, setMods] = useState<ModDefinition[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);

  const [newName, setNewName] = useState('');
  const [newAllowedMods, setNewAllowedMods] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [created, setCreated] = useState<CreateApiKeyResponse | null>(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    keyId: string;
  }>({
    open: false,
    keyId: '',
  });

  const selectedKey = useMemo(() => keys.find((k) => k.id === confirmDialog.keyId), [keys, confirmDialog.keyId]);

  const showMessage = (message: string, severity: AlertColor = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const reload = useCallback(async () => {
    setLoadError('');
    setLoading(true);
    try {
      const [mRes, kRes] = await Promise.all([modService.list(), apiKeyService.list(token)]);
      if (mRes.success && mRes.data) {
        let nextMods = mRes.data;
        if (role === UserRole.EDITOR) {
          nextMods = nextMods.filter((m) => isAllowedModId(allowedModIds || [], m.id));
        }
        setMods(nextMods);
        if (nextMods.length > 0) {
          setNewAllowedMods((prev) => (prev.size ? prev : new Set([nextMods[0].id])));
        }
      }
      if (kRes.success && kRes.data) setKeys(kRes.data);
      if (!kRes.success) setLoadError(kRes.error || '加载 API key 失败');
    } catch {
      setLoadError('加载 API key 失败');
    } finally {
      setLoading(false);
    }
  }, [token, role, allowedModIds]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const visibleKeys = useMemo(() => {
    const sorted = [...keys].sort((a, b) => b.createdAt - a.createdAt);
    return isRootAdmin ? sorted : sorted.filter((k) => k.createdBy === currentUsername);
  }, [keys, isRootAdmin, currentUsername]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newName.trim();
    if (!trimmedName) {
      showMessage('请输入 API key 名称', 'warning');
      return;
    }
    const allowedMods = Array.from(newAllowedMods);
    if (allowedMods.length === 0) return;
    setIsCreating(true);
    const res = await apiKeyService.create(token, { name: trimmedName, allowedMods });
    setIsCreating(false);
    if (!res.success || !res.data) {
      showMessage(res.error || '创建失败', 'error');
      return;
    }
    setCreated(res.data);
    setTokenModalOpen(true);
    await reload();
  };

  const handleRevokeClick = (id: string) => {
    setConfirmDialog({ open: true, keyId: id });
  };

  const handleCopy = async (text: string) => {
    const ok = await copyText(text);
    if (ok) {
      showMessage('已复制到剪贴板', 'success');
    } else {
      showMessage('复制失败，请手动复制', 'error');
    }
  };

  return (
    <Stack spacing={3}>
      {/* Info Alert */}
      <Alert severity="info" icon={false}>
        用于 CI/流水线自动推送公告：API key 创建时仅返回一次明文 token，请立即保存；建议按流水线/仓库分别创建并在泄露时及时撤销。
      </Alert>

      {/* Create Form */}
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <VpnKeyIcon color="action" />
            <Typography variant="subtitle1" fontWeight={700}>
              创建 API key
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleCreate}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
              <TextField
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                label="名称（用于识别）"
                placeholder="例如 ci-release"
                size="small"
                required
                error={newName.length > 0 && !newName.trim()}
                helperText={newName.length > 0 && !newName.trim() ? '名称不能为空' : ''}
              />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  绑定 Mod（可多选）
                </Typography>
                <Box
                  sx={{
                    maxHeight: 128,
                    overflow: 'auto',
                    p: 1.5,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                  }}
                >
                  {mods.length ? (
                    <Stack spacing={0.5}>
                      {mods.map((m) => (
                        <FormControlLabel
                          key={m.id}
                          control={
                            <Checkbox
                              size="small"
                              checked={newAllowedMods.has(m.id)}
                              onChange={() => {
                                setNewAllowedMods((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(m.id)) next.delete(m.id);
                                  else next.add(m.id);
                                  return next;
                                });
                              }}
                            />
                          }
                          label={
                            <Typography variant="body2">
                              {m.name}{' '}
                              <Typography component="span" variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                ({m.id})
                              </Typography>
                            </Typography>
                          }
                        />
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      暂无 Mod（请先创建 Mod）
                    </Typography>
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {role === UserRole.EDITOR
                    ? '仅显示你被授权的 Mod。'
                    : '可绑定多个 Mod，便于一个流水线推送多个公告源。'}
                </Typography>
              </Box>
            </Box>

            <Button
              type="submit"
              variant="contained"
              disabled={isCreating || !newName.trim() || newAllowedMods.size === 0 || mods.length === 0}
            >
              {isCreating ? '创建中…' : '创建 API key'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Key List */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            {isRootAdmin ? '全部 API key（系统管理员视角）' : 'API key 记录'}
          </Typography>

          {loadError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {loadError}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Stack spacing={1}>
              {visibleKeys.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  暂无
                </Typography>
              ) : (
                visibleKeys.map((k) => (
                  <Card
                    key={k.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      bgcolor: k.status === 'active' ? 'background.paper' : 'action.disabledBackground',
                      opacity: k.status === 'active' ? 1 : 0.7,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        {/* 名称和状态 */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <VpnKeyIcon fontSize="small" color={k.status === 'active' ? 'primary' : 'disabled'} />
                          <Typography variant="subtitle1" fontWeight={700} noWrap>
                            {k.name}
                          </Typography>
                          <Chip
                            label={k.status === 'active' ? '有效' : '已撤销'}
                            size="small"
                            color={k.status === 'active' ? 'success' : 'default'}
                            variant={k.status === 'active' ? 'filled' : 'outlined'}
                          />
                        </Box>

                        {/* Key ID */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Key ID:
                          </Typography>
                          <Box
                            component="code"
                            sx={{
                              px: 1,
                              py: 0.25,
                              bgcolor: 'action.hover',
                              borderRadius: 0.5,
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              color: 'text.secondary',
                            }}
                          >
                            {k.id}
                          </Box>
                        </Box>

                        {/* 详细信息 */}
                        <Stack spacing={0.5}>
                          {isRootAdmin && (
                            <Typography variant="body2" color="text.secondary">
                              创建者：<Box component="span" sx={{ fontWeight: 500, color: 'text.primary' }}>{k.createdBy}</Box>
                            </Typography>
                          )}
                          <Typography variant="body2" color="text.secondary">
                            绑定 Mod：
                            {k.allowedMods.length > 0 ? (
                              k.allowedMods.map((modId) => (
                                <Chip
                                  key={modId}
                                  label={modId}
                                  size="small"
                                  variant="outlined"
                                  sx={{ ml: 0.5, fontFamily: 'monospace', fontSize: '0.7rem', height: 20 }}
                                />
                              ))
                            ) : (
                              <Box component="span" sx={{ color: 'text.disabled' }}>无</Box>
                            )}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            创建时间：<Box component="span" sx={{ fontWeight: 500, color: 'text.primary' }}>{formatTime(k.createdAt)}</Box>
                          </Typography>
                          {k.lastUsedAt && (
                            <Typography variant="body2" color="text.secondary">
                              最后使用：<Box component="span" sx={{ fontWeight: 500, color: 'text.primary' }}>{formatTime(k.lastUsedAt)}</Box>
                            </Typography>
                          )}
                        </Stack>
                      </Box>

                      {/* 操作按钮 */}
                      {k.status === 'active' && (
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<DeleteIcon fontSize="small" />}
                          onClick={() => handleRevokeClick(k.id)}
                        >
                          撤销
                        </Button>
                      )}
                    </Box>
                  </Card>
                ))
              )}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Token Created Modal */}
      <Modal
        isOpen={tokenModalOpen}
        onClose={() => {
          setTokenModalOpen(false);
          setCreated(null);
        }}
        title="API key 已创建（请立即保存）"
      >
        {created && (
          <Stack spacing={3}>
            <Alert severity="warning" sx={{ mt: 1 }}>
              该 token 仅在创建时返回一次，关闭后将无法再次查看；如遗失请撤销并重新创建。
            </Alert>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                apiKey（请求体字段）
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Box
                  component="code"
                  sx={{
                    flex: 1,
                    p: 1.5,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    wordBreak: 'break-all',
                    fontFamily: 'monospace',
                  }}
                >
                  {created.token}
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleCopy(created.token)}
                  sx={{ minWidth: 'auto', px: 1.5 }}
                >
                  <ContentCopyIcon fontSize="small" />
                </Button>
              </Box>
            </Box>

            <Typography variant="caption" color="text.secondary">
              推送接口：<Box component="span" sx={{ fontFamily: 'monospace' }}>POST /api/push/announcement</Box>（Body：
              <Box component="span" sx={{ fontFamily: 'monospace' }}>apiKey</Box>）
            </Typography>
          </Stack>
        )}
      </Modal>

      {/* Three-step Revoke API key Dialog */}
      <ThreeStepConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, keyId: '' })}
        subjectCodeLabel="API key ID"
        subjectCode={confirmDialog.keyId}
        step1={{
          title: '第 1 步：确认撤销',
          message: `您确定要撤销 API key「${selectedKey?.name || confirmDialog.keyId}」吗？`,
          warning: '撤销后将立即失效，相关流水线/服务会立刻无法推送公告。',
          confirmText: '确认',
          confirmColor: 'error',
        }}
        step2={{
          title: '第 2 步：再次确认',
          message: `请再次确认撤销 API key「${selectedKey?.name || confirmDialog.keyId}」。`,
          warning: '建议先更新相关 CI/服务配置，再进行撤销以避免生产中断。',
          confirmText: '确认',
          confirmColor: 'error',
        }}
        step3={{
          title: '第 3 步：最终确认',
          message: `最终确认：撤销 API key「${selectedKey?.name || confirmDialog.keyId}」？`,
          warning: '撤销操作不可撤销！',
          confirmText: '撤销',
          confirmColor: 'error',
        }}
        onFinalConfirm={async () => {
          const id = confirmDialog.keyId;
          const res = await apiKeyService.revoke(token, id);
          if (!res.success) {
            showMessage(res.error || '撤销失败', 'error');
            return;
          }
          showMessage('API key 已撤销', 'success');
          await reload();
        }}
      />

      {/* Snackbar */}
      <AppSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />
    </Stack>
  );
};
