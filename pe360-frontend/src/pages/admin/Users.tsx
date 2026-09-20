import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Building2, Users } from 'lucide-react';
import { usersApi } from '../../services/api';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import type { User } from '../../types';

interface UserSummary {
  userId: number;
  userName: string;
  email: string;
  schoolName: string;
  role: string;
  status: string;
  studentCount: number;
}

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { addToast } = useToastStore();
  const { user: currentUser } = useAuthStore();

  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'user', status: 'active',
    schoolName: '', phone: '',
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [usersRes, summaryRes] = await Promise.all([
        usersApi.getAll(),
        usersApi.getSummary().catch(() => ({ data: { summary: [] } })),
      ]);
      setUsers(usersRes.data.users || []);
      const s: Record<number, number> = {};
      (summaryRes.data.summary as UserSummary[]).forEach(u => { s[u.userId] = u.studentCount; });
      setSummary(s);
    } catch {
      addToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditUser(null);
    setForm({ name: '', email: '', password: '', role: 'user', status: 'active', schoolName: '', phone: '' });
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      status: user.status,
      schoolName: user.schoolName || '',
      phone: user.phone || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      addToast('Name and email are required', 'warning'); return;
    }
    if (!editUser && !form.password.trim()) {
      addToast('Password is required for new users', 'warning'); return;
    }
    if (form.password && form.password.length < 6) {
      addToast('Password must be at least 6 characters', 'warning'); return;
    }
    try {
      const payload: any = {
        name: form.name,
        email: form.email,
        role: form.role,
        status: form.status,
        schoolName: form.schoolName,
        phone: form.phone,
      };
      if (form.password) payload.password = form.password;
      if (editUser) {
        await usersApi.update(editUser.id, payload);
        addToast('User updated');
      } else {
        await usersApi.create(payload);
        addToast('User created');
      }
      setShowModal(false);
      fetchAll();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to save user', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await usersApi.delete(deleteId);
      addToast('User and their school data deleted');
      fetchAll();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to delete user', 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const handleToggleStatus = async (userId: number) => {
    try {
      await usersApi.toggleStatus(userId);
      fetchAll();
      addToast('User status updated');
    } catch {
      addToast('Failed to update status', 'error');
    }
  };

  const petUsers = users.filter(u => u.role !== 'admin');
  const adminUsers = users.filter(u => u.role === 'admin');

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto lg:max-w-3xl lg:px-8 lg:py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">{users.length} users · {petUsers.length} PET teachers</p>
        </div>
        <Button onClick={openCreate} icon={<Plus size={16} />}>Create User</Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : users.length > 0 ? (
        <>
          {/* PET Users section */}
          {petUsers.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                PET Teachers ({petUsers.length})
              </p>
              <div className="space-y-3">
                {petUsers.map((u) => (
                  <UserRow
                    key={u.id}
                    u={u}
                    studentCount={summary[u.id] ?? 0}
                    currentUserId={currentUser?.id}
                    onEdit={openEdit}
                    onDelete={setDeleteId}
                    onToggle={handleToggleStatus}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Admin Users section */}
          {adminUsers.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Admins ({adminUsers.length})
              </p>
              <div className="space-y-3">
                {adminUsers.map((u) => (
                  <UserRow
                    key={u.id}
                    u={u}
                    studentCount={summary[u.id] ?? 0}
                    currentUserId={currentUser?.id}
                    onEdit={openEdit}
                    onDelete={setDeleteId}
                    onToggle={handleToggleStatus}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          emoji="👤"
          title="No users found"
          description="Create user accounts for PE teachers."
          action={{ label: '+ Create User', onClick: openCreate }}
        />
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editUser ? 'Edit User' : 'Create PET User'}
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowModal(false)} fullWidth>Cancel</Button>
            <Button onClick={handleSave} fullWidth>{editUser ? 'Save Changes' : 'Create User'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="PE Teacher name"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="teacher@school.edu"
          />
          <Input
            label={editUser ? 'New Password (leave blank to keep)' : 'Password'}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Minimum 6 characters"
          />
          <Input
            label="School Name"
            value={form.schoolName}
            onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
            placeholder="e.g. ABC High School"
          />
          <Input
            label="Phone Number"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="e.g. +91 98765 43210"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              options={[
                { value: 'user', label: 'PET / User' },
                { value: 'admin', label: 'Admin' },
              ]}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete User"
        message="This will permanently delete the user and all their school data (students, timetable, attendance). Global resources will be preserved. This cannot be undone."
        confirmLabel="Delete User & Data"
        danger
      />
    </div>
  );
}

function UserRow({ u, studentCount, currentUserId, onEdit, onDelete, onToggle }: {
  u: User;
  studentCount: number;
  currentUserId?: number;
  onEdit: (u: User) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number) => void;
}) {
  return (
    <Card padding="sm">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-white font-bold text-base">
            {u.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800 text-sm">{u.name}</span>
            <Badge variant={u.role === 'admin' ? 'purple' : 'info'} size="sm">
              {u.role === 'admin' ? '👑 Admin' : '👤 PET'}
            </Badge>
            <Badge variant={u.status === 'active' ? 'success' : 'danger'} size="sm">
              {u.status}
            </Badge>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{u.email}</div>
          <div className="flex items-center gap-3 mt-1">
            {u.schoolName && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Building2 size={10} /> {u.schoolName}
              </span>
            )}
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Users size={10} /> {studentCount} students
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {u.id !== currentUserId && (
            <button
              onClick={() => onToggle(u.id)}
              className={`p-2 rounded-lg transition-colors ${u.status === 'active' ? 'text-green-500 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-50'}`}
              title={u.status === 'active' ? 'Deactivate' : 'Activate'}
            >
              {u.status === 'active' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            </button>
          )}
          <button onClick={() => onEdit(u)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50">
            <Edit2 size={15} />
          </button>
          {u.id !== currentUserId && (
            <button
              onClick={() => onDelete(u.id)}
              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
