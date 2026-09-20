import { useState, useEffect } from 'react';
import { Plus, Pin, PinOff, Edit2, Trash2, Search, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { importantApi } from '../services/api';
import { useToastStore } from '../store/toastStore';
import { useAuthStore } from '../store/authStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import type { ImportantItem } from '../types';
import { cn } from '../utils/cn';

const CATEGORIES = ['General','Competition','Equipment','Instruction','Reminder','Note'];
const PRIORITIES = [
  { value: 'high', label: '🔴 High' },
  { value: 'medium', label: '🟡 Medium' },
  { value: 'low', label: '🟢 Low' },
];

const priorityConfig = {
  high: { badge: 'danger' as const, dot: 'bg-red-500' },
  medium: { badge: 'warning' as const, dot: 'bg-amber-500' },
  low: { badge: 'success' as const, dot: 'bg-green-500' },
};

export function Important() {
  const [items, setItems] = useState<ImportantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<ImportantItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { addToast } = useToastStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [form, setForm] = useState({
    title: '', description: '', category: 'General',
    date: format(new Date(), 'yyyy-MM-dd'), priority: 'medium', pinned: false,
    isGlobal: false,
  });

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const r = await importantApi.getAll();
      setItems(r.data.items || []);
    } catch {
      addToast('Failed to load items', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ title: '', description: '', category: 'General', date: format(new Date(), 'yyyy-MM-dd'), priority: 'medium', pinned: false, isGlobal: false });
    setShowModal(true);
  };

  const openEdit = (item: ImportantItem) => {
    setEditItem(item);
    setForm({ title: item.title, description: item.description, category: item.category, date: item.date.split('T')[0], priority: item.priority, pinned: item.pinned, isGlobal: item.isGlobal });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { addToast('Please enter a title', 'warning'); return; }
    try {
      if (editItem) {
        await importantApi.update(editItem.id, form);
        addToast('Item updated');
      } else {
        await importantApi.create(form);
        addToast('Item added');
      }
      setShowModal(false);
      fetchItems();
    } catch {
      addToast('Failed to save item', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await importantApi.delete(deleteId);
      addToast('Item deleted');
      fetchItems();
    } catch {
      addToast('Failed to delete item', 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const handlePin = async (id: number) => {
    try {
      await importantApi.togglePin(id);
      fetchItems();
    } catch {
      addToast('Failed to update pin', 'error');
    }
  };

  const filtered = items.filter(item =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.description.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  const pinned = filtered.filter(i => i.pinned);
  const unpinned = filtered.filter(i => !i.pinned);

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto lg:max-w-3xl lg:px-8 lg:py-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Important</h1>
          <p className="text-slate-500 text-sm mt-0.5">Save notes, reminders & key information</p>
        </div>
        <Button onClick={openCreate} icon={<Plus size={16} />}>Add</Button>
      </div>

      <div className="mb-5">
        <Input
          placeholder="Search notes, categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search size={15} />}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length > 0 ? (
        <>
          {pinned.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Pin size={14} className="text-amber-500" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pinned</span>
              </div>
              <div className="space-y-2.5">
                {pinned.map(item => <ItemCard key={item.id} item={item} onEdit={openEdit} onDelete={setDeleteId} onPin={handlePin} />)}
              </div>
            </div>
          )}

          {unpinned.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Other Notes</span>
                </div>
              )}
              <div className="space-y-2.5">
                {unpinned.map(item => <ItemCard key={item.id} item={item} onEdit={openEdit} onDelete={setDeleteId} onPin={handlePin} />)}
              </div>
            </div>
          )}
        </>
      ) : items.length === 0 ? (
        <EmptyState
          emoji="📌"
          title="No important items yet"
          description="Save competition dates, equipment lists, instructions, or any notes you need quick access to."
          action={{ label: '+ Add Important', onClick: openCreate }}
        />
      ) : (
        <EmptyState emoji="🔍" title="No results found" description={`No items match "${search}"`} />
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? 'Edit Item' : 'Add Important Item'}
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowModal(false)} fullWidth>Cancel</Button>
            <Button onClick={handleSave} fullWidth>{editItem ? 'Save' : 'Add Item'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Annual Sports Meet"
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Add details, notes, or instructions..."
            rows={4}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={CATEGORIES.map(c => ({ value: c, label: c }))}
            />
            <Select
              label="Priority"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              options={PRIORITIES}
            />
          </div>
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <label className="flex items-center gap-3 cursor-pointer py-1">
            <div
              onClick={() => setForm({ ...form, pinned: !form.pinned })}
              className={cn(
                'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                form.pinned ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
              )}
            >
              {form.pinned && <svg viewBox="0 0 10 8" className="w-3 h-3 text-white fill-current"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>}
            </div>
            <span className="text-sm text-slate-700">Pin this item to top</span>
          </label>
          {isAdmin && (
            <label className="flex items-center gap-3 cursor-pointer py-1">
              <div
                onClick={() => setForm({ ...form, isGlobal: !form.isGlobal })}
                className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                  form.isGlobal ? 'bg-green-600 border-green-600' : 'border-slate-300'
                )}
              >
                {form.isGlobal && <svg viewBox="0 0 10 8" className="w-3 h-3 text-white fill-current"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>}
              </div>
              <span className="text-sm text-slate-700 flex items-center gap-1">
                <Globe size={13} className="text-green-600" /> Visible to all PET users (Global)
              </span>
            </label>
          )}
        </div>
      </Modal>

      <ConfirmModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Item"
        message="Are you sure you want to delete this important item?"
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function ItemCard({ item, onEdit, onDelete, onPin }: {
  item: ImportantItem;
  onEdit: (item: ImportantItem) => void;
  onDelete: (id: number) => void;
  onPin: (id: number) => void;
}) {
  const pConfig = priorityConfig[item.priority];
  return (
    <Card padding="sm">
      <div className="flex items-start gap-3">
        <div className={cn('w-2 h-2 rounded-full mt-2 flex-shrink-0', pConfig.dot)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-800 text-sm leading-snug flex-1">
              {item.title}
              {item.isGlobal && (
                <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">
                  <Globe size={9} /> Global
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => onPin(item.id)} className={cn('p-1.5 rounded-lg transition-colors', item.pinned ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:text-amber-400 hover:bg-amber-50')}>
                {item.pinned ? <Pin size={13} /> : <PinOff size={13} />}
              </button>
              <button onClick={() => onEdit(item)} className="p-1.5 rounded-lg text-slate-300 hover:text-blue-500 hover:bg-blue-50">
                <Edit2 size={13} />
              </button>
              <button onClick={() => onDelete(item.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
          {item.description && (
            <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{item.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="default" size="sm">{item.category}</Badge>
            <Badge variant={pConfig.badge} size="sm">{item.priority}</Badge>
            <span className="text-xs text-slate-400 ml-auto">
              {format(new Date(item.date), 'd MMM yyyy')}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
