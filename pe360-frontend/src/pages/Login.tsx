import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { authApi } from '../services/api';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter email and password', 'warning');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      setAuth(res.data.user, res.data.token);
      addToast(`Welcome back, ${res.data.user.name}!`, 'success');
      navigate('/', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Invalid email or password. Please try again.';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900">
      {/* Left hero panel – desktop */}
      <div className="hidden lg:flex flex-col justify-center px-16 flex-1">
        <div className="max-w-md">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center">
              <span className="text-white font-black text-2xl">PE</span>
            </div>
            <div>
              <div className="text-white font-black text-4xl">360</div>
            </div>
          </div>
          <h1 className="text-white font-bold text-4xl leading-tight mb-4">
            Smart Physical<br />Education Management
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed">
            Everything a PE teacher needs — court dimensions, attendance, timetables,
            team generation and more — all in one place.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-4">
            {[
              { emoji: '🏟️', title: 'Sports Library', desc: '13+ sports with court drawings & rules' },
              { emoji: '✅', title: 'Fast Attendance', desc: 'Mark 40 students in under a minute' },
              { emoji: '📅', title: 'PE Timetable', desc: 'See today\'s classes at a glance' },
              { emoji: '👥', title: 'Team Generator', desc: 'Random or balanced teams instantly' },
            ].map((f) => (
              <div key={f.title} className="bg-white/8 backdrop-blur rounded-xl p-4">
                <div className="text-2xl mb-2">{f.emoji}</div>
                <div className="text-white font-semibold text-sm">{f.title}</div>
                <div className="text-blue-300 text-xs mt-0.5">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-10 lg:bg-white lg:max-w-lg">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center">
          <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-3xl flex items-center justify-center mx-auto mb-4">
            <div>
              <div className="text-white font-black text-3xl">PE</div>
              <div className="text-blue-200 font-black text-xl -mt-1">360</div>
            </div>
          </div>
          <h1 className="text-white font-bold text-2xl">PE360</h1>
          <p className="text-blue-200 text-sm mt-1">Smart Physical Education Management</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="lg:mb-8 mb-6">
            <h2 className="text-white lg:text-slate-900 font-bold text-2xl">Welcome back</h2>
            <p className="text-blue-200 lg:text-slate-500 text-sm mt-1">Sign in to your PE360 account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-100 lg:text-slate-700 mb-1.5">
                Email or Username
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.edu"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 lg:bg-white border border-white/20 lg:border-slate-200 text-white lg:text-slate-900 placeholder-white/40 lg:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 lg:focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-100 lg:text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-white/10 lg:bg-white border border-white/20 lg:border-slate-200 text-white lg:text-slate-900 placeholder-white/40 lg:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 lg:focus:ring-blue-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 lg:text-slate-400 hover:text-white lg:hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 lg:bg-blue-600 lg:hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}
