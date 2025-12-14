
import React, { useEffect, useState, useCallback } from 'react';
import { Announcement, UserRole, AuthSession, ModDefinition } from '../types';
import { announcementService, modService } from '../services/apiService';
import { AnnouncementCard } from '../components/AnnouncementCard';
import { Editor } from '../components/Editor';
import { Modal } from '../components/Modal';
import { ThemeToggle, ThemeMode } from '../components/ThemeToggle';
import { AdminTools } from '../components/AdminTools';
import { LogOut, Plus, RefreshCw, Shield, LayoutList, LogIn } from 'lucide-react';

interface DashboardProps {
  session: AuthSession | null;
  onLogout: () => void;
  onLoginClick: () => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ session, onLogout, onLoginClick, themeMode, setThemeMode }) => {
  // 标签页: 'announcements' | 'admin'
  const [currentTab, setCurrentTab] = useState('announcements');
  
  // 数据状态
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [availableMods, setAvailableMods] = useState<ModDefinition[]>([]);
  const [currentModId, setCurrentModId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  
  // 创建模态框状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 编辑模态框状态
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const role = session?.user.role ?? UserRole.GUEST;
  const token = session?.token ?? '';
  const currentModName = availableMods.find(m => m.id === currentModId)?.name || '';

  // 初始加载：获取允许的 Mod 列表
  useEffect(() => {
    const init = async () => {
      setLoadError('');
      const res = await modService.list();
      if (res.success && res.data) {
        let mods = res.data;
        // 仅对 EDITOR 过滤；SUPER 和 GUEST 可以浏览所有 Mod
        if (role === UserRole.EDITOR) {
          mods = mods.filter(m => session?.user.allowedMods?.includes(m.id));
        }
        setAvailableMods(mods);
        if (mods.length > 0) setCurrentModId(mods[0].id);
      } else {
        setLoadError(res.error || '加载 Mod 列表失败');
      }
    };
    init();
  }, [role, session]);

  const fetchAnnouncements = useCallback(async () => {
    if (!currentModId) return;
    setLoading(true);
    const result = await announcementService.list(currentModId);
    if (result.success && result.data) {
      setAnnouncements(result.data);
    } else if (!result.success) {
      // 保留列表但显示消息
      if (result.error) setLoadError(result.error);
    }
    setLoading(false);
  }, [currentModId]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === UserRole.GUEST) return;
    if (!newTitle.trim() || !newContent.trim()) return;

    setIsSubmitting(true);
    // Unity 客户端内容：保持原始 HTML/富文本源字符串（是否/如何解析由 Unity 客户端决定）
    const unityContent = newContent;

    const result = await announcementService.create(token, {
      modId: currentModId,
      title: newTitle,
      content_html: newContent,
      content_text: unityContent,
      author: session?.user.displayName || session?.user.username || 'guest'
    });

    if (result.success) {
      setIsModalOpen(false);
      setNewTitle('');
      setNewContent('');
      fetchAnnouncements();
    } else {
      alert(result.error);
    }
    setIsSubmitting(false);
  };

  const openEdit = (a: Announcement) => {
    if (role === UserRole.GUEST) return;
    setEditTarget(a);
    setEditTitle(a.title);
    setEditContent(a.content_html);
    setIsEditModalOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === UserRole.GUEST || !session || !editTarget) return;
    if (!editTitle.trim() || !editContent.trim()) return;

    setIsEditSubmitting(true);
    const result = await announcementService.update(session.token, {
      id: editTarget.id,
      modId: editTarget.modId,
      title: editTitle,
      content_html: editContent,
      content_text: editContent
    });

    if (result.success && result.data) {
      setAnnouncements(prev => prev.map(a => (a.id === editTarget.id ? result.data! : a)));
      setIsEditModalOpen(false);
      setEditTarget(null);
    } else {
      alert(result.error);
    }
    setIsEditSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const result = await announcementService.delete(token, currentModId, id);
    if (result.success) {
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } else {
      alert(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-brand-base text-slate-900 dark:text-brand-white flex flex-col transition-colors duration-300">
      {/* 头部 */}
      <header className="bg-white dark:bg-brand-card border-b border-slate-200 dark:border-brand-blue/20 sticky top-0 z-30 shadow-md transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Duckov"
              className="h-7 w-7 rounded"
              loading="eager"
              decoding="async"
              onError={(e) => {
                e.currentTarget.src = '/favicon.png';
              }}
            />
            <span className="font-bold text-lg tracking-tight hidden sm:inline">逃离鸭科夫<span className="text-slate-500 dark:text-brand-blue font-light">Mod公告板</span></span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* 主导航标签页 */}
            <div className="flex bg-slate-100 dark:bg-black/20 rounded-lg p-1">
              <button
                onClick={() => setCurrentTab('announcements')}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  currentTab === 'announcements' 
                    ? 'bg-white dark:bg-brand-blue/20 text-brand-blue dark:text-brand-yellow shadow-sm' 
                    : 'text-slate-500 dark:text-brand-muted hover:text-slate-700'
                }`}
              >
                <LayoutList size={16} /> <span className="hidden sm:inline">公告列表</span>
              </button>
              {role === UserRole.SUPER && (
                <button
                  onClick={() => setCurrentTab('admin')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    currentTab === 'admin' 
                      ? 'bg-white dark:bg-brand-blue/20 text-brand-blue dark:text-brand-yellow shadow-sm' 
                      : 'text-slate-500 dark:text-brand-muted hover:text-slate-700'
                  }`}
                >
                  <Shield size={16} /> <span className="hidden sm:inline">系统管理</span>
                </button>
              )}
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-brand-blue/20 mx-1"></div>
            
            <ThemeToggle themeMode={themeMode} setThemeMode={setThemeMode} />

            {session ? (
              <button 
                onClick={onLogout}
                className="text-slate-500 hover:text-red-500 dark:text-brand-muted dark:hover:text-white transition-colors"
                title="退出登录"
              >
                <LogOut size={20} />
              </button>
            ) : (
              <button
                onClick={onLoginClick}
                className="text-slate-500 hover:text-brand-blue dark:text-brand-muted dark:hover:text-brand-yellow transition-colors"
                title="登录"
              >
                <LogIn size={20} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        
        {currentTab === 'admin' && role === UserRole.SUPER && session ? (
          // 管理面板视图
          <div className="animate-fade-in">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-brand-white">系统管理面板</h1>
              <p className="text-slate-500 dark:text-brand-muted">管理 Mod 分类与团队成员权限</p>
            </div>
            <AdminTools token={session.token} currentUsername={session.user.username} isRootAdmin={!!session.user.isRootAdmin} />
          </div>
        ) : (
          // 公告列表视图
          <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-brand-white">公告列表</h1>
                
                {/* Mod 选择器下拉菜单 */}
                <div className="relative">
                  <select 
                    value={currentModId}
                    onChange={(e) => setCurrentModId(e.target.value)}
                    className="appearance-none bg-slate-100 dark:bg-brand-card border border-slate-200 dark:border-brand-blue/30 text-slate-700 dark:text-brand-white py-2 pl-3 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/50 font-medium text-sm transition-colors"
                  >
                    {availableMods.length === 0 && <option value="">无权限或无数据</option>}
                    {availableMods.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={fetchAnnouncements} 
                  className="p-2 text-slate-500 hover:text-brand-blue hover:bg-white dark:text-brand-muted dark:hover:text-brand-yellow dark:hover:bg-brand-card rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-transparent"
                  title="刷新列表"
                >
                  <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
                {role !== UserRole.GUEST && (
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    disabled={availableMods.length === 0}
                    className="flex items-center gap-2 bg-brand-blue hover:bg-blue-600 dark:bg-brand-yellow dark:hover:bg-yellow-400 text-white dark:text-brand-base font-bold px-4 py-2 rounded-lg transition-colors shadow-lg shadow-blue-900/10 dark:shadow-yellow-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={20} />
                    新建公告
                  </button>
                )}
              </div>
            </div>

            {loadError && (
              <div className="mb-6 text-sm p-3 rounded border bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/40 dark:text-red-300">
                {loadError}
              </div>
            )}

            {loading && announcements.length === 0 ? (
              <div className="text-center py-20 text-slate-500 dark:text-brand-muted">加载中...</div>
            ) : (
              <>
                {announcements.length === 0 ? (
                  <div className="text-center py-20 bg-white dark:bg-brand-card/50 rounded-xl border border-dashed border-slate-300 dark:border-brand-blue/20 text-slate-500 dark:text-brand-muted">
                    {availableMods.length === 0 
                      ? "您当前没有访问任何 Mod 公告板的权限。" 
                      : <span>在 <strong>{availableMods.find(m => m.id === currentModId)?.name}</strong> 分组下未找到公告。</span>
                    }
                  </div>
                ) : (
                  <div className="space-y-4">
                    {announcements.map(ann => (
                      <AnnouncementCard 
                        key={ann.id} 
                        data={ann} 
                        modName={currentModName}
                        userRole={role} 
                        onDelete={handleDelete}
                        onEdit={openEdit}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* 创建模态框 */}
      {role !== UserRole.GUEST && (
        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)}
          title="发布新公告"
        >
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="bg-blue-50 dark:bg-brand-blue/10 p-3 rounded border border-blue-100 dark:border-brand-blue/20">
               <span className="text-sm text-slate-500 dark:text-brand-muted">发布至: </span>
               <span className="font-bold text-brand-blue dark:text-brand-yellow">
                 {availableMods.find(m => m.id === currentModId)?.name} ({currentModId})
               </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-brand-muted mb-1">标题</label>
              <input 
                type="text" 
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-brand-base border border-slate-300 dark:border-brand-blue/30 rounded-lg px-4 py-2 text-slate-900 dark:text-brand-white focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-yellow focus:border-transparent outline-none placeholder-slate-400 dark:placeholder-gray-600"
                placeholder="例如：v1.2 版本更新说明"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-brand-muted mb-1">内容详情</label>
              <Editor 
                value={newContent}
                onChange={setNewContent}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-500 hover:text-slate-900 dark:text-brand-muted dark:hover:text-brand-white transition-colors"
              >
                取消
              </button>
              <button 
                type="submit"
                disabled={isSubmitting || !newTitle || !newContent}
                className="bg-brand-blue hover:bg-blue-600 dark:bg-brand-yellow dark:hover:bg-yellow-400 text-white dark:text-brand-base font-bold px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '发布中...' : '发布公告'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 编辑模态框 */}
      {role !== UserRole.GUEST && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditTarget(null);
          }}
          title="编辑公告"
        >
          <form onSubmit={handleEdit} className="space-y-6">
            <div className="bg-blue-50 dark:bg-brand-blue/10 p-3 rounded border border-blue-100 dark:border-brand-blue/20">
              <span className="text-sm text-slate-500 dark:text-brand-muted">修改: </span>
              <span className="font-bold text-brand-blue dark:text-brand-yellow">
                {currentModName} ({currentModId})
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-brand-muted mb-1">标题</label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-brand-base border border-slate-300 dark:border-brand-blue/30 rounded-lg px-4 py-2 text-slate-900 dark:text-brand-white focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-yellow focus:border-transparent outline-none placeholder-slate-400 dark:placeholder-gray-600"
                placeholder="例如：v1.2 版本更新说明"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-brand-muted mb-1">内容详情</label>
              <Editor value={editContent} onChange={setEditContent} />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditTarget(null);
                }}
                className="px-4 py-2 text-slate-500 hover:text-slate-900 dark:text-brand-muted dark:hover:text-brand-white transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isEditSubmitting || !editTitle || !editContent}
                className="bg-brand-blue hover:bg-blue-600 dark:bg-brand-yellow dark:hover:bg-yellow-400 text-white dark:text-brand-base font-bold px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEditSubmitting ? '保存中...' : '保存修改'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
