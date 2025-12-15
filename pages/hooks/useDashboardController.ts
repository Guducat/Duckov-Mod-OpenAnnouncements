import { FormEvent, useCallback, useEffect, useState } from 'react';
import { announcementService, modService } from '../../services/apiService';
import { useSessionInfo } from '../../hooks/useSessionInfo';
import { Announcement, AuthSession, ModDefinition, UserRole } from '../../types';
import { compareVersionTagDesc } from '../../utils/version';

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
  announcements: Announcement[];
  availableMods: ModDefinition[];
  currentModId: string;
  selectMod: (modId: string) => void;
  loading: boolean;
  loadError: string;
  refreshAnnouncements: () => Promise<void>;
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

  const loadMods = useCallback(async () => {
    setLoadError('');
    const res = await modService.list();
    if (res.success && res.data) {
      let mods = res.data;
      if (role === UserRole.EDITOR) {
        mods = mods.filter((m) => session?.user.allowedMods?.includes(m.id));
      }
      setAvailableMods(mods);
      if (mods.length > 0) {
        const stillExists = currentModId ? mods.some((m) => m.id === currentModId) : false;
        const nextModId = stillExists ? currentModId : mods[0].id;
        if (nextModId !== currentModId) {
          setCurrentModId(nextModId);
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem(SELECTED_MOD_STORAGE_KEY, nextModId);
        }
      }
    } else {
      setLoadError(res.error || '加载 Mod 列表失败');
    }
  }, [role, session, currentModId]);

  useEffect(() => {
    loadMods();
  }, [loadMods]);

  const refreshAnnouncements = useCallback(async () => {
    if (!currentModId) return;
    setLoading(true);
    const result = await announcementService.list(currentModId);
    if (result.success && result.data) {
      setAnnouncements(sortAnnouncementsByVersion(result.data));
    } else if (!result.success && result.error) {
      setLoadError(result.error);
    }
    setLoading(false);
  }, [currentModId]);

  useEffect(() => {
    refreshAnnouncements();
  }, [refreshAnnouncements]);

  const handleCreate = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (role === UserRole.GUEST || !newTitle.trim() || !newContent.trim()) return;

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
        refreshAnnouncements();
      } else {
        alert(result.error);
      }
      setIsSubmitting(false);
    },
    [role, newVersion, newTitle, newContent, token, currentModId, session, refreshAnnouncements]
  );

  const openEditModal = useCallback(
    (announcement: Announcement) => {
      if (role === UserRole.GUEST) return;
      setEditTarget(announcement);
      setEditVersion(announcement.version ?? '');
      setEditTitle(announcement.title);
      setEditContent(announcement.content_html);
      setIsEditModalOpen(true);
    },
    [role]
  );

  const handleEdit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (role === UserRole.GUEST || !session || !editTarget || !editTitle.trim() || !editContent.trim()) return;

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
        setAnnouncements((prev) =>
          sortAnnouncementsByVersion(prev.map((a) => (a.id === editTarget.id ? updatedAnnouncement : a)))
        );
        setIsEditModalOpen(false);
        setEditTarget(null);
      } else {
        alert(result.error);
      }
      setIsEditSubmitting(false);
    },
    [role, session, editTarget, editVersion, editTitle, editContent]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const result = await announcementService.delete(token, currentModId, id);
      if (result.success) {
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      } else {
        alert(result.error);
      }
    },
    [token, currentModId]
  );

  return {
    token,
    role,
    announcements,
    availableMods,
    currentModId,
    selectMod: (modId: string) => {
      setCurrentModId(modId);
      if (typeof window !== 'undefined') {
        localStorage.setItem(SELECTED_MOD_STORAGE_KEY, modId);
      }
    },
    loading,
    loadError,
    refreshAnnouncements,
    isCreateModalOpen,
    openCreateModal: () => setIsCreateModalOpen(true),
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
