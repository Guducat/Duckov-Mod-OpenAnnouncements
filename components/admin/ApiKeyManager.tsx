import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Key, Trash2 } from 'lucide-react';
import { ApiKey, CreateApiKeyResponse, ModDefinition, UserRole } from '../../types';
import { apiKeyService, modService } from '../../services/apiService';
import { Modal } from '../Modal';

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

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ token, currentUsername, isRootAdmin, role, allowedModIds }) => {
  const [mods, setMods] = useState<ModDefinition[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);

  const [newName, setNewName] = useState('ci-release');
  const [newAllowedMods, setNewAllowedMods] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [created, setCreated] = useState<CreateApiKeyResponse | null>(null);

  const reload = useCallback(async () => {
    setLoadError('');
    setLoading(true);
    const [mRes, kRes] = await Promise.all([modService.list(), apiKeyService.list(token)]);
    if (mRes.success && mRes.data) {
      let nextMods = mRes.data;
      if (role === UserRole.EDITOR) {
        const allowed = new Set((allowedModIds || []).filter(Boolean));
        nextMods = nextMods.filter((m) => allowed.has(m.id));
      }
      setMods(nextMods);
      if (nextMods.length > 0) {
        setNewAllowedMods((prev) => (prev.size ? prev : new Set([nextMods[0].id])));
      }
    }
    if (kRes.success && kRes.data) setKeys(kRes.data);
    if (!kRes.success) setLoadError(kRes.error || '加载 API key 失败');
    setLoading(false);
  }, [token, role, allowedModIds]);

  useEffect(() => {
    reload();
  }, [reload]);

  const visibleKeys = useMemo(() => {
    const sorted = [...keys].sort((a, b) => b.createdAt - a.createdAt);
    return isRootAdmin ? sorted : sorted.filter((k) => k.createdBy === currentUsername);
  }, [keys, isRootAdmin, currentUsername]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const allowedMods = Array.from(newAllowedMods);
    if (allowedMods.length === 0) return;
    setIsCreating(true);
    const res = await apiKeyService.create(token, { name: newName.trim() || 'ci', allowedMods });
    setIsCreating(false);
    if (!res.success || !res.data) {
      alert(res.error || '创建失败');
      return;
    }
    setCreated(res.data);
    setTokenModalOpen(true);
    await reload();
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('确定撤销此 API key 吗？撤销后将立即失效。')) return;
    const res = await apiKeyService.revoke(token, id);
    if (!res.success) {
      alert(res.error || '撤销失败');
      return;
    }
    await reload();
  };

  return (
    <div className="space-y-6">
      <div className="p-3 bg-blue-50 dark:bg-brand-blue/10 rounded-lg border border-blue-100 dark:border-brand-blue/20">
        <p className="text-sm text-slate-600 dark:text-brand-muted">
          用于 CI/流水线自动推送公告：API key 创建时仅返回一次明文 token，请立即保存；建议按流水线/仓库分别创建并在泄露时及时撤销。
        </p>
      </div>

      <div className="bg-white dark:bg-brand-card border border-slate-200 dark:border-brand-blue/10 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Key size={18} className="text-slate-500 dark:text-brand-muted" />
          <div className="font-bold text-slate-800 dark:text-brand-white">创建 API key</div>
        </div>

        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 dark:text-brand-muted">名称（用于识别）</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-white dark:bg-brand-base border border-slate-300 dark:border-brand-blue/30 rounded px-3 py-2 text-sm outline-none"
                placeholder="例如 ci-release"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-brand-muted">绑定 Mod（可多选）</label>
              <div className="max-h-32 overflow-auto rounded border border-slate-200 dark:border-brand-blue/10 bg-slate-50 dark:bg-brand-base/30 p-2">
                {mods.length ? (
                  <div className="space-y-2">
                    {mods.map((m) => {
                      const checked = newAllowedMods.has(m.id);
                      return (
                        <label key={m.id} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setNewAllowedMods((prev) => {
                                const next = new Set(prev);
                                if (next.has(m.id)) next.delete(m.id);
                                else next.add(m.id);
                                return next;
                              });
                            }}
                            className="mt-1"
                          />
                          <span className="min-w-0">
                            <span className="font-medium">{m.name}</span>{' '}
                            <span className="font-mono text-xs text-slate-500">({m.id})</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 dark:text-brand-muted">暂无 Mod（请先创建 Mod）</div>
                )}
              </div>
              <div className="text-xs text-slate-500 dark:text-brand-muted mt-1">
                {role === UserRole.EDITOR ? '仅显示你被授权的 Mod。' : '可绑定多个 Mod，便于一个流水线推送多个公告源。'}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreating || newAllowedMods.size === 0 || mods.length === 0}
            className="bg-brand-blue dark:bg-brand-yellow text-white dark:text-brand-base px-4 py-2 rounded font-bold disabled:opacity-50"
          >
            {isCreating ? '创建中…' : '创建 API key'}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-brand-card border border-slate-200 dark:border-brand-blue/10 rounded-xl p-4">
        <div className="font-bold text-slate-800 dark:text-brand-white mb-3">
          {isRootAdmin ? '全部 API key（系统管理员视角）' : 'API key 记录'}
        </div>

        {loadError && <div className="text-sm text-red-500 mb-2">{loadError}</div>}
        {loading ? (
          <div className="text-sm text-slate-500 dark:text-brand-muted">加载中…</div>
        ) : (
          <div className="space-y-2">
            {visibleKeys.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-brand-muted">暂无</div>
            ) : (
              visibleKeys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-brand-base/30 rounded border border-slate-200 dark:border-brand-blue/10"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-slate-700 dark:text-slate-200">
                        {k.id}
                      </span>
                      <span className="font-bold text-slate-700 dark:text-brand-white truncate">{k.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded border ${
                          k.status === 'active'
                            ? 'text-green-700 border-green-200 bg-green-50 dark:text-green-300 dark:border-green-700/40 dark:bg-green-900/20'
                            : 'text-slate-600 border-slate-200 bg-slate-100 dark:text-slate-300 dark:border-slate-600/40 dark:bg-slate-800/30'
                        }`}
                      >
                        {k.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-brand-muted mt-1">
                      {isRootAdmin ? (
                        <>
                          createdBy: <span className="font-mono">{k.createdBy}</span> ·{' '}
                        </>
                      ) : null}
                      mod: <span className="font-mono">{k.allowedMods.join(', ') || '-'}</span> · createdAt:{' '}
                      {formatTime(k.createdAt)}
                      {k.lastUsedAt ? <> · lastUsedAt: {formatTime(k.lastUsedAt)}</> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {k.status === 'active' && (
                      <button onClick={() => handleRevoke(k.id)} className="text-red-500 hover:text-red-600 p-2">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={tokenModalOpen}
        onClose={() => {
          setTokenModalOpen(false);
          setCreated(null);
        }}
        title="API key 已创建（请立即保存）"
      >
        {created ? (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-yellow-900/20 rounded border border-amber-200 dark:border-yellow-700/30">
              <p className="text-sm text-amber-800 dark:text-yellow-200">
                该 token 仅在创建时返回一次，关闭后将无法再次查看；如遗失请撤销并重新创建。
              </p>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-brand-muted mb-1">apiKey（请求体字段）</div>
              <div className="flex gap-2">
                <code className="flex-1 bg-slate-100 dark:bg-brand-base/40 px-3 py-2 rounded text-xs break-all">
                  {created.token}
                </code>
                <button
                  onClick={async () => {
                    const ok = await copyText(created.token);
                    if (!ok) alert('复制失败，请手动复制');
                  }}
                  className="px-3 py-2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold"
                  title="复制到剪贴板"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-brand-muted">
              推送接口：<span className="font-mono">POST /api/push/announcement</span>（Body：<span className="font-mono">apiKey</span>）
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
