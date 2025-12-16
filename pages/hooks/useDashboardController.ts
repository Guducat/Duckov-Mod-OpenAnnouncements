import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { announcementService, modService } from '../../services/apiService';
import { useSessionInfo } from '../../hooks/useSessionInfo';
import { Announcement, AuthSession, ModDefinition, UserRole } from '../../types';
import { isAllowedModId } from '../../utils/modId';
import { compareVersionTagDesc } from '../../utils/version';

type LocalCache<T> = {
  fetchedAt: number;
  data: T;
};

const isReloadNavigation = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const entries = performance.getEntriesByType?.('navigation') as PerformanceNavigationTiming[] | undefined;
    const nav = entries?.[0];
    if (nav && typeof nav.type === 'string') return nav.type === 'reload';
    // Fallback for older browsers
    const legacy = (performance as any).navigation?.type;
    return legacy === 1;
  } catch {
    return false;
  }
};

const normalizeVersionTag = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const sortAnnouncementsByVersion = (list: Announcement[]): Announcement[] => {
  const next = [...list];
  next.sort((a, b) => {
    const byVersion = compareVersionTagDesc(a.version, b.version);
    if (byVersion !== 0) return byVersion;
    return b.timestamp - a.timestamp;
  });
  return next;
};

interface UseDashboardControllerResult {
  token: string;
  role: UserRole;
  canEditCurrentMod: boolean;
  announcements: Announcement[];
  availableMods: ModDefinition[];
  currentModId: string;
  selectMod: (modId: string) => void;
  loading: boolean;
  loadError: string;
  refreshAnnouncements: (opts?: { force?: boolean }) => Promise<void>;
  isCreateModalOpen: boolean;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  newVersion: string;
  newTitle: string;
  newContent: string;
  updateNewVersion: (value: string) => void;
  updateNewTitle: (value: string) => void;
  updateNewContent: (value: string) => void;
  isSubmitting: boolean;
  handleCreate: (e: FormEvent) => Promise<void>;
  isEditModalOpen: boolean;
  editTarget: Announcement | null;
  openEditModal: (announcement: Announcement) => void;
  closeEditModal: () => void;
  editVersion: string;
  editTitle: string;
  editContent: string;
  updateEditVersion: (value: string) => void;
  updateEditTitle: (value: string) => void;
  updateEditContent: (value: string) => void;
  isEditSubmitting: boolean;
  handleEdit: (e: FormEvent) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
}

export const useDashboardController = (session: AuthSession | null): UseDashboardControllerResult => {
  const SELECTED_MOD_STORAGE_KEY = 'selected_mod_id';
  const MODS_CACHE_KEY = 'dashboard_cache_mods_v1';
  const announcementsCacheKey = (modId: string) => `dashboard_cache_announcements_v1:${modId}`;
  const CACHE_TTL_MS = 5 * 60 * 60 * 1000; // 5 小时

  const forceReloadModsOnceRef = useRef(isReloadNavigation());
  const forceReloadAnnouncementsOnceRef = useRef(isReloadNavigation());

  const readCache = useCallback(<T,>(key: string): LocalCache<T> | null => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<LocalCache<T>>;
      if (!parsed || typeof parsed !== 'object') return null;
      if (typeof parsed.fetchedAt !== 'number') return null;
      if (!('data' in parsed)) return null;
      return parsed as LocalCache<T>;
    } catch {
      return null;
    }
  }, []);

  const writeCache = useCallback(<T,>(key: string, data: T) => {
    if (typeof window === 'undefined') return;
    try {
      const payload: LocalCache<T> = { fetchedAt: Date.now(), data };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // ignore storage quota / blocked storage
    }
  }, []);

  const isFresh = useCallback((fetchedAt: number) => Date.now() - fetchedAt < CACHE_TTL_MS, [CACHE_TTL_MS]);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [availableMods, setAvailableMods] = useState<ModDefinition[]>([]);
  const [currentModId, setCurrentModId] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(SELECTED_MOD_STORAGE_KEY) || '';
  });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [editVersion, setEditVersion] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const { role, token } = useSessionInfo(session);

  const canEditMod = useCallback(
    (modId: string): boolean => {
      if (!modId) return false;
      if (role === UserRole.SUPER) return true;
      if (role === UserRole.EDITOR) return isAllowedModId(session?.user.allowedMods, modId);
      return false;
    },
    [role, session]
  );

  const canEditCurrentMod = !!currentModId && canEditMod(currentModId);

  const loadMods = useCallback(async (opts?: { force?: boolean }) => {
    setLoadError('');
    const force = !!opts?.force;

    if (!force) {
      const cached = readCache<ModDefinition[]>(MODS_CACHE_KEY);
      if (cached && isFresh(cached.fetchedAt) && Array.isArray(cached.data)) {
        const mods = cached.data;
        setAvailableMods(mods);
        if (mods.length > 0) {
          const stillExists = currentModId ? mods.some((m) => m.id === currentModId) : false;
          const nextModId = stillExists ? currentModId : mods[0].id;
          if (nextModId !== currentModId) setCurrentModId(nextModId);
          if (typeof window !== 'undefined') localStorage.setItem(SELECTED_MOD_STORAGE_KEY, nextModId);
        }
        return;
      }
    }

    const res = await modService.list();
    if (res.success && res.data) {
      const mods = res.data;
      setAvailableMods(mods);
      writeCache(MODS_CACHE_KEY, mods);
      if (mods.length > 0) {
        const stillExists = currentModId ? mods.some((m) => m.id === currentModId) : false;
        const nextModId = stillExists ? currentModId : mods[0].id;
        if (nextModId !== currentModId) setCurrentModId(nextModId);
        if (typeof window !== 'undefined') localStorage.setItem(SELECTED_MOD_STORAGE_KEY, nextModId);
      }
    } else {
      setLoadError(res.error || '加载 Mod 列表失败');
    }
  }, [readCache, writeCache, isFresh, currentModId]);

  useEffect(() => {
    const forceOnce = forceReloadModsOnceRef.current;
    loadMods({ force: forceOnce });
    if (forceOnce) forceReloadModsOnceRef.current = false;
  }, [loadMods]);

  const refreshAnnouncements = useCallback(async (opts?: { force?: boolean }) => {
    if (!currentModId) return;

    const force = !!opts?.force;
    const cacheKey = announcementsCacheKey(currentModId);
    if (!force) {
      const cached = readCache<Announcement[]>(cacheKey);
      if (cached && isFresh(cached.fetchedAt) && Array.isArray(cached.data)) {
        setLoadError('');
        setAnnouncements(sortAnnouncementsByVersion(cached.data));
        return;
      }
    }

    setLoading(true);
    const result = await announcementService.list(currentModId);
    if (result.success && result.data) {
      setLoadError('');
      setAnnouncements(sortAnnouncementsByVersion(result.data));
      writeCache(cacheKey, result.data);
    } else if (!result.success && result.error) {
      setLoadError(result.error);
    }
    setLoading(false);
  }, [currentModId, readCache, writeCache, isFresh]);

  useEffect(() => {
    const shouldForce = forceReloadAnnouncementsOnceRef.current && !!currentModId;
    refreshAnnouncements({ force: shouldForce });
    if (shouldForce) forceReloadAnnouncementsOnceRef.current = false;
  }, [refreshAnnouncements, currentModId]);

  const handleCreate = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (role === UserRole.GUEST || !canEditMod(currentModId) || !newTitle.trim() || !newContent.trim()) return;

      setIsSubmitting(true);
      const result = await announcementService.create(token, {
        modId: currentModId,
        version: normalizeVersionTag(newVersion),
        title: newTitle,
        content_html: newContent,
        content_text: newContent,
        author: session?.user.displayName || session?.user.username || 'guest'
      });

      if (result.success) {
        setIsCreateModalOpen(false);
        setNewVersion('');
        setNewTitle('');
        setNewContent('');
        refreshAnnouncements({ force: true });
      } else {
        alert(result.error);
      }
      setIsSubmitting(false);
    },
    [role, canEditMod, newVersion, newTitle, newContent, token, currentModId, session, refreshAnnouncements]
  );

  const openEditModal = useCallback(
    (announcement: Announcement) => {
      if (role === UserRole.GUEST || !canEditMod(announcement.modId)) return;
      setEditTarget(announcement);
      setEditVersion(announcement.version ?? '');
      setEditTitle(announcement.title);
      setEditContent(announcement.content_html);
      setIsEditModalOpen(true);
    },
    [role, canEditMod]
  );

  const handleEdit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (
        role === UserRole.GUEST ||
        !session ||
        !editTarget ||
        !canEditMod(editTarget.modId) ||
        !editTitle.trim() ||
        !editContent.trim()
      )
        return;

      setIsEditSubmitting(true);
      const result = await announcementService.update(session.token, {
        id: editTarget.id,
        modId: editTarget.modId,
        version: editVersion.trim(),
        title: editTitle,
        content_html: editContent,
        content_text: editContent
      });

      if (result.success && result.data) {
        const updatedAnnouncement = result.data;
        const cacheKey = announcementsCacheKey(editTarget.modId);
        setAnnouncements((prev) => {
          const next = sortAnnouncementsByVersion(prev.map((a) => (a.id === editTarget.id ? updatedAnnouncement : a)));
          writeCache(cacheKey, next);
          return next;
        });
        setIsEditModalOpen(false);
        setEditTarget(null);
      } else {
        alert(result.error);
      }
      setIsEditSubmitting(false);
    },
    [role, session, editTarget, canEditMod, editVersion, editTitle, editContent, writeCache]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const result = await announcementService.delete(token, currentModId, id);
      if (result.success) {
        const cacheKey = announcementsCacheKey(currentModId);
        setAnnouncements((prev) => {
          const next = prev.filter((a) => a.id !== id);
          writeCache(cacheKey, next);
          return next;
        });
      } else {
        alert(result.error);
      }
    },
    [token, currentModId, writeCache]
  );

  return {
    token,
    role,
    canEditCurrentMod,
    announcements,
    availableMods,
    currentModId,
    selectMod: (modId: string) => {
      if (modId === currentModId) return;
      setCurrentModId(modId);
      setLoadError('');
      const cached = readCache<Announcement[]>(announcementsCacheKey(modId));
      if (cached && isFresh(cached.fetchedAt) && Array.isArray(cached.data)) {
        setAnnouncements(sortAnnouncementsByVersion(cached.data));
      } else {
        setAnnouncements([]);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(SELECTED_MOD_STORAGE_KEY, modId);
      }
    },
    loading,
    loadError,
    refreshAnnouncements,
    isCreateModalOpen,
    openCreateModal: () => {
      if (!canEditMod(currentModId)) {
        alert('当前 Mod 仅可查看，暂无编辑/发布权限。');
        return;
      }
      setIsCreateModalOpen(true);
    },
    closeCreateModal: () => setIsCreateModalOpen(false),
    newVersion,
    newTitle,
    newContent,
    updateNewVersion: (value: string) => setNewVersion(value),
    updateNewTitle: (value: string) => setNewTitle(value),
    updateNewContent: (value: string) => setNewContent(value),
    isSubmitting,
    handleCreate,
    isEditModalOpen,
    editTarget,
    openEditModal,
    closeEditModal: () => {
      setIsEditModalOpen(false);
      setEditTarget(null);
    },
    editVersion,
    editTitle,
    editContent,
    updateEditVersion: (value: string) => setEditVersion(value),
    updateEditTitle: (value: string) => setEditTitle(value),
    updateEditContent: (value: string) => setEditContent(value),
    isEditSubmitting,
    handleEdit,
    handleDelete
  };
};
