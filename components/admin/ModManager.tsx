import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ModDefinition } from '../../types';
import { modService } from '../../services/apiService';

interface ModManagerProps {
  token: string;
}

export const ModManager: React.FC<ModManagerProps> = ({ token }) => {
  const [mods, setMods] = useState<ModDefinition[]>([]);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');

  const loadMods = async () => {
    const res = await modService.list();
    if (res.success && res.data) setMods(res.data);
  };

  useEffect(() => {
    loadMods();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId || !newName) return;
    const res = await modService.create(token, { id: newId, name: newName });
    if (res.success) {
      setNewId('');
      setNewName('');
      loadMods();
    } else {
      alert(res.error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此 Mod 吗？这将影响所有关联的公告查询。')) return;
    const res = await modService.delete(token, id);
    if (res.success) loadMods();
    else alert(res.error);
  };

  return (
    <div>
      <form onSubmit={handleAdd} className="flex gap-3 mb-6 bg-slate-100 dark:bg-black/20 p-4 rounded-lg">
        <div className="flex-1">
          <input
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            placeholder="Mod ID (例DuckovCustomSoundsMod_v1, 仅英文)"
            className="w-full bg-white dark:bg-brand-base border border-slate-300 dark:border-brand-blue/30 rounded px-3 py-2 text-sm outline-none"
          />
          <p className="text-xs text-slate-400 mt-1">系统唯一标识，不可重复，不可含中文</p>
        </div>
        <div className="flex-1">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="显示名称 (如 鸭科夫自定义音乐音效Mod)"
            className="w-full bg-white dark:bg-brand-base border border-slate-300 dark:border-brand-blue/30 rounded px-3 py-2 text-sm outline-none"
          />
          <p className="text-xs text-slate-400 mt-1">用于 UI 显示，支持任意字符</p>
        </div>
        <button
          type="submit"
          className="bg-brand-blue dark:bg-brand-yellow text-white dark:text-brand-base px-4 py-2 rounded font-bold h-10"
        >
          添加
        </button>
      </form>

      <div className="space-y-2">
        {mods.map((mod) => (
          <div
            key={mod.id}
            className="flex items-center justify-between p-3 bg-white dark:bg-brand-card border border-slate-200 dark:border-brand-blue/10 rounded"
          >
            <div>
              <span className="font-bold text-slate-700 dark:text-brand-white mr-2">{mod.name}</span>
              <span className="font-mono text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                {mod.id}
              </span>
            </div>
            <button onClick={() => handleDelete(mod.id)} className="text-red-400 hover:text-red-500 p-2">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

