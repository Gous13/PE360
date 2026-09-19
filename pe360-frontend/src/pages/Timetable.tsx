import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { timetableApi } from '../services/api';
import { useToastStore } from '../store/toastStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import type { TimetableEntry } from '../types';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CLASSES = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const SECTIONS = ['A','B','C','D','E'];
const PERIODS = ['1','2','3','4','5','6','7','8'];

export function Timetable() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(DAYS[new Date().getDay() - 1] || 'Monday');
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<TimetableEntry | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { addToast } = useToastStore();

  const [form, setForm] = useState({
    day: 'Monday', period: '1', class: '8', section: 'A',
    time: '09:00', subject: 'Physical Education', teacherName: '',
  });

  useEffect(() => { fetchEntries(); }, []);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const r = await timetableApi.getAll();
      setEntries(r.data.entries || []);
    } catch {
      addToast('Failed to load timetable', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditEntry(null);
    setForm({ day: selectedDay, period: '1', class: '8', section: 'A', time: '09:00', subject: 'Physical Education', teacherName: '' });
    setShowModal(true);
  };

  const openEdit = (entry: TimetableEntry) => {
    setEditEntry(entry);
    setForm({
      day: entry.day, period: String(entry.period), class: entry.class,
      section: entry.section, time: entry.time, subject: entry.subject,
      teacherName: entry.teacherName,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.teacherName.trim()) {
      addToast('Please enter teacher name', 'warning'); return;
    }
    try {
      const payload = { ...form, period: Number(form.period) };
      if (editEntry) {
        await timetableApi.update(editEntry.id, payload);
        addToast('Period updated');
      } else {
        await timetableApi.create(payload);
        addToast('Period added');
      }
      setShowModal(false);
      fetchEntries();
    } catch {
      addToast('Failed to save period', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await timetableApi.delete(deleteId);
      addToast('Period removed');
      fetchEntries();
    } catch {
      addToast('Failed to delete period', 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const todayName = DAYS[new Date().getDay() - 1] || '';
  const dayEntries = entries.filter((e) => e.day === selectedDay).sort((a, b) => a.period - b.period);

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto lg:max-w-3xl lg:px-8 lg:py-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">PE Timetable</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Today: {format(new Date(), 'EEEE, d MMM')}
          </p>
        </div>
        <Button onClick={openCreate} icon={<Plus size={16} />} size="md">
          Add Period
        </Button>
      </div>

      {/* Day selector */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-5 pb-1">
        {DAYS.map((day) => {
          const count = entries.filter((e) => e.day === day).length;
          const isToday = day === todayName;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedDay === day
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'
              }`}
            >
              {day.slice(0, 3)}
              {isToday && <span className="ml-1 text-[10px] opacity-80">•Today</span>}
              {count > 0 && <span className={`ml-1 text-[10px] ${selectedDay === day ? 'opacity-80' : 'text-blue-600'}`}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Entries */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : dayEntries.length > 0 ? (
        <div className="space-y-2.5">
          {dayEntries.map((entry) => (
            <Card key={entry.id} padding="sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-blue-700 font-bold text-sm">P{entry.period}</span>
                  <span className="text-blue-400 text-[10px]">{entry.time}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 text-sm">
                    Class {entry.class}-{entry.section}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Clock size={10} />
                    {entry.time} • {entry.subject}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">PET: {entry.teacherName}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(entry)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => setDeleteId(entry.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          emoji="📅"
          title={`No periods on ${selectedDay}`}
          description="Add PE periods for this day to see them here."
          action={{ label: '+ Add Period', onClick: openCreate }}
        />
      )}

      {/* Summary */}
      {entries.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Card padding="sm" className="text-center">
            <div className="text-2xl font-bold text-blue-600">{entries.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">Total Periods/Week</div>
          </Card>
          <Card padding="sm" className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {new Set(entries.map(e => `${e.class}-${e.section}`)).size}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Classes Covered</div>
          </Card>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editEntry ? 'Edit Period' : 'Add PE Period'}
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowModal(false)} fullWidth>Cancel</Button>
            <Button onClick={handleSave} fullWidth>{editEntry ? 'Save Changes' : 'Add Period'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Day"
            value={form.day}
            onChange={(e) => setForm({ ...form, day: e.target.value })}
            options={DAYS.map(d => ({ value: d, label: d }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Period"
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value })}
              options={PERIODS.map(p => ({ value: p, label: `Period ${p}` }))}
            />
            <Input
              label="Time"
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Class"
              value={form.class}
              onChange={(e) => setForm({ ...form, class: e.target.value })}
              options={CLASSES.map(c => ({ value: c, label: `Class ${c}` }))}
            />
            <Select
              label="Section"
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
              options={SECTIONS.map(s => ({ value: s, label: `Section ${s}` }))}
            />
          </div>
          <Input
            label="Subject"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="Physical Education"
          />
          <Input
            label="PE Teacher Name"
            value={form.teacherName}
            onChange={(e) => setForm({ ...form, teacherName: e.target.value })}
            placeholder="Your name"
          />
        </div>
      </Modal>

      <ConfirmModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Remove Period"
        message="Are you sure you want to remove this PE period from the timetable?"
        confirmLabel="Remove"
        danger
      />
    </div>
  );
}
