import { useState } from 'react';
import { UserCircle, Lock, LogOut, Shield, User, Building2, Phone, Edit2, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { authApi } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';

export function Profile() {
  const { user, logout, updateUser } = useAuthStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [pwForm, setPwForm] = useState({ old: '', new: '', confirm: '' });
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    schoolName: user?.schoolName || '',
    phone: user?.phone || '',
  });
  const [saving, setSaving] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangePassword = async () => {
    if (!pwForm.old || !pwForm.new) {
      addToast('Please fill all fields', 'warning'); return;
    }
    if (pwForm.new !== pwForm.confirm) {
      addToast('New passwords do not match', 'warning'); return;
    }
    if (pwForm.new.length < 6) {
      addToast('Password must be at least 6 characters', 'warning'); return;
    }
    setSaving(true);
    try {
      await authApi.changePassword(pwForm.old, pwForm.new);
      addToast('Password changed successfully');
      setShowPasswordModal(false);
      setPwForm({ old: '', new: '', confirm: '' });
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to change password', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openProfileModal = () => {
    setProfileForm({
      name: user?.name || '',
      schoolName: user?.schoolName || '',
      phone: user?.phone || '',
    });
    setShowProfileModal(true);
  };

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) {
      addToast('Name is required', 'warning'); return;
    }
    setSaving(true);
    try {
      const r = await authApi.updateProfile({
        name: profileForm.name,
        schoolName: profileForm.schoolName,
        phone: profileForm.phone,
      });
      updateUser(r.data.user);
      addToast('Profile updated successfully');
      setShowProfileModal(false);
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 py-5 max-w-md mx-auto lg:px-8 lg:py-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Profile</h1>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl flex items-center justify-center shadow-lg mb-3">
          <span className="text-white font-black text-3xl">
            {user?.name?.charAt(0)?.toUpperCase() || 'P'}
          </span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
        <p className="text-slate-500 text-sm mt-0.5">{user?.email}</p>
        {user?.schoolName && (
          <p className="text-slate-400 text-xs mt-1 flex items-center gap-1">
            <Building2 size={11} /> {user.schoolName}
          </p>
        )}
        <div className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50">
          {user?.role === 'admin' ? <Shield size={13} className="text-blue-600" /> : <User size={13} className="text-blue-600" />}
          <span className="text-xs font-semibold text-blue-700 capitalize">{user?.role === 'admin' ? 'Admin' : 'PET'}</span>
        </div>
      </div>

      {/* Info card */}
      <Card className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Information</h3>
          <button
            onClick={openProfileModal}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            <Edit2 size={12} /> Edit
          </button>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Full Name', value: user?.name || '—', icon: UserCircle },
            { label: 'Email', value: user?.email || '—', icon: UserCircle },
            { label: 'School', value: user?.schoolName || 'Not set', icon: Building2 },
            { label: 'Phone', value: user?.phone || 'Not set', icon: Phone },
            { label: 'Role', value: user?.role === 'admin' ? 'Admin' : 'PE Teacher', icon: Shield },
            { label: 'Status', value: user?.status || 'active', icon: UserCircle, capitalize: true },
          ].map(({ label, value, icon: Icon, capitalize }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon size={15} className="text-slate-400" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-slate-400">{label}</div>
                <div className={`text-sm font-medium text-slate-700 ${capitalize ? 'capitalize' : ''}`}>{value}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={() => setShowPasswordModal(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:bg-slate-50 transition-colors text-left"
        >
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <Lock size={16} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-slate-800 text-sm">Change Password</div>
            <div className="text-xs text-slate-400">Update your account password</div>
          </div>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:bg-red-50 transition-colors text-left"
        >
          <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
            <LogOut size={16} className="text-red-500" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-red-600 text-sm">Logout</div>
            <div className="text-xs text-slate-400">Sign out of PE360</div>
          </div>
        </button>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-slate-400">PE360 — Smart Physical Education Management</p>
        <p className="text-xs text-slate-300 mt-0.5">Version 1.0.0</p>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Edit Profile"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowProfileModal(false)} fullWidth>Cancel</Button>
            <Button onClick={handleSaveProfile} loading={saving} fullWidth>Save Changes</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={profileForm.name}
            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
            placeholder="Your full name"
          />
          <Input
            label="School Name"
            value={profileForm.schoolName}
            onChange={(e) => setProfileForm({ ...profileForm, schoolName: e.target.value })}
            placeholder="e.g. ABC High School"
          />
          <Input
            label="Phone Number"
            value={profileForm.phone}
            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            placeholder="e.g. +91 98765 43210"
          />
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Change Password"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowPasswordModal(false)} fullWidth>Cancel</Button>
            <Button onClick={handleChangePassword} loading={saving} fullWidth>Update Password</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={pwForm.old}
            onChange={(e) => setPwForm({ ...pwForm, old: e.target.value })}
            placeholder="••••••••"
          />
          <Input
            label="New Password"
            type="password"
            value={pwForm.new}
            onChange={(e) => setPwForm({ ...pwForm, new: e.target.value })}
            placeholder="Minimum 6 characters"
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={pwForm.confirm}
            onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
            placeholder="Re-enter new password"
          />
        </div>
      </Modal>
    </div>
  );
}
