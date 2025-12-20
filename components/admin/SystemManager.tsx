import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import type { ModDefinition } from '@/types';
import { modService, systemService, type SystemIndexStatus, type SystemRebuildIndexResult } from '@/services/apiService';

interface SystemManagerProps {
  token: string;
  isRootAdmin: boolean;
}

export const SystemManager: React.FC<SystemManagerProps> = ({ token, isRootAdmin }) => {
  const [mods, setMods] = useState<ModDefinition[]>([]);
  const [selectedModId, setSelectedModId] = useState<string>('');

  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [status, setStatus] = useState<SystemIndexStatus | null>(null);

  const [rebuildOpen, setRebuildOpen] = useState(false);
  const [rebuildLoading, setRebuildLoading] = useState(false);
  const [rebuildError, setRebuildError] = useState('');
  const [rebuildResult, setRebuildResult] = useState<SystemRebuildIndexResult | null>(null);

  const modMap = useMemo(() => new Map(mods.map((m) => [m.id, m])), [mods]);

  const loadMods = useCallback(async () => {
    try {
      const res = await modService.list();
      if (res.success && res.data) {
        setMods(res.data);
        if (selectedModId && !res.data.some((m) => m.id === selectedModId)) {
          setSelectedModId('');
        }
      }
    } catch {
      // ignore
    }
  }, [selectedModId]);

  const loadIndexStatus = useCallback(async () => {
    if (!isRootAdmin) return;
    setStatusError('');
    setStatusLoading(true);
    try {
      const res = await systemService.getIndexStatus(token);
      if (res.success && res.data) {
        setStatus(res.data);
      } else {
        setStatus(null);
        setStatusError(res.error || '获取索引状态失败');
      }
    } catch {
      setStatus(null);
      setStatusError('网络请求失败');
    } finally {
      setStatusLoading(false);
    }
  }, [isRootAdmin, token]);

  useEffect(() => {
    void loadMods();
  }, [loadMods]);

  useEffect(() => {
    void loadIndexStatus();
  }, [loadIndexStatus]);

  const renderIndexCount = (present: boolean, count: number) => {
    if (!present) return `缺失（0）`;
    return String(count);
  };

  const handleRebuild = async () => {
    if (!isRootAdmin) return;
    setRebuildError('');
    setRebuildResult(null);
    setRebuildLoading(true);
    try {
      const res = await systemService.rebuildIndex(token, selectedModId || undefined);
      if (res.success && res.data) {
        setRebuildResult(res.data);
        await loadIndexStatus();
      } else {
        setRebuildError(res.error || '重建失败');
      }
    } catch {
      setRebuildError('网络请求失败');
    } finally {
      setRebuildLoading(false);
      setRebuildOpen(false);
    }
  };

  const selectedModLabel = selectedModId ? (modMap.get(selectedModId)?.name || selectedModId) : '全部 Mod';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {!isRootAdmin && (
        <Alert severity="warning">
          仅系统管理员可执行系统级维护操作（例如索引重建、KV 规则升级）。
        </Alert>
      )}

      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 1 }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                索引状态
              </Typography>
              <Typography variant="body2" color="text.secondary">
                仅读取 KV，不消耗 <code>KV.list</code> 配额。
              </Typography>
            </Box>
            <Button variant="outlined" onClick={loadIndexStatus} disabled={!isRootAdmin || statusLoading}>
              刷新
            </Button>
          </Stack>

          {statusLoading && <LinearProgress sx={{ mb: 2 }} />}
          {statusError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {statusError}
            </Alert>
          )}

          {status && (
            <Stack spacing={1.25}>
              <Typography variant="body2">
                用户索引 <code>SYSTEM_USERS_INDEX</code>：{renderIndexCount(status.usersIndex.present, status.usersIndex.count)}
              </Typography>
              <Typography variant="body2">
                API key 索引 <code>SYSTEM_APIKEY_IDS</code>：{renderIndexCount(status.apiKeyIdsIndex.present, status.apiKeyIdsIndex.count)}
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Typography variant="body2" sx={{ mb: 0.75 }}>
                  公告索引（每个 Mod 一个 <code>ann_index:&lt;modId&gt;</code>）
                </Typography>
                <Stack spacing={0.5}>
                  {mods.map((m) => {
                    const c = status.announcementIndex[m.id];
                    const present = c?.present ?? false;
                    const count = c?.count ?? 0;
                    return (
                      <Typography key={m.id} variant="body2" color={present ? 'text.primary' : 'warning.main'}>
                        - {m.name}（{m.id}）：{renderIndexCount(present, count)}
                      </Typography>
                    );
                  })}
                </Stack>
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
            重建索引
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            用于从旧版本升级或索引异常时修复。此操作会调用 <code>KV.list</code>，请谨慎执行。
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel id="system-rebuild-mod-label">目标 Mod</InputLabel>
              <Select
                labelId="system-rebuild-mod-label"
                label="目标 Mod"
                value={selectedModId}
                onChange={(e) => setSelectedModId(String(e.target.value))}
              >
                <MenuItem value="">全部 Mod</MenuItem>
                {mods.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.name}（{m.id}）
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              color="warning"
              disabled={!isRootAdmin || rebuildLoading}
              onClick={() => setRebuildOpen(true)}
            >
              开始重建
            </Button>
          </Stack>

          {rebuildLoading && <LinearProgress sx={{ mt: 2 }} />}
          {rebuildError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {rebuildError}
            </Alert>
          )}
          {rebuildResult && (
            <Alert severity="success" sx={{ mt: 2 }}>
              重建完成：用户 {rebuildResult.users}，API key {rebuildResult.apiKeys}
              {Object.keys(rebuildResult.announcements).length
                ? `，公告索引：${Object.entries(rebuildResult.announcements)
                    .map(([id, c]) => `${id}=${c}`)
                    .join('，')}`
                : ''}
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
            KV 规则升级（v2）
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            预留入口：后续可在此加入 v2 schema 升级 / 迁移 / 回滚的可视化操作。
          </Typography>
          <Button variant="contained" disabled>
            升级到 v2（开发中）
          </Button>
        </CardContent>
      </Card>

      <Dialog open={rebuildOpen} onClose={() => setRebuildOpen(false)}>
        <DialogTitle>确认重建索引？</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            该操作会触发 KV 扫描（<code>KV.list</code>），可能消耗配额且耗时较长。
          </Alert>
          <Typography variant="body2">
            目标范围：{selectedModLabel}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRebuildOpen(false)} disabled={rebuildLoading}>
            取消
          </Button>
          <Button onClick={handleRebuild} variant="contained" color="warning" disabled={rebuildLoading}>
            确认执行
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

