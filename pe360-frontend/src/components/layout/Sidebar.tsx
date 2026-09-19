import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, Trophy, Calendar, Users, ClipboardCheck,
  UserCircle, Shield, LogOut, Pin, UsersRound
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/sports', icon: Trophy, label: 'Sports' },
  { to: '/timetable', icon: Calendar, label: 'Timetable' },
  { to: '/students', icon: Users, label: 'Students' },
  { to: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
  { to: '/teams', icon: UsersRound, label: 'Teams' },
  { to: '/important', icon: Pin, label: 'Important' },
  { to: '/profile', icon: UserCircle, label: 'Profile' },
];

const adminItems = [
  { to: '/admin/users', icon: Shield, label: 'Users' },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-slate-100 h-screen sticky top-0 z-30">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">PE</span>
          </div>
          <div>
            <div className="font-bold text-slate-900 text-base leading-tight">PE360</div>
            <div className="text-xs text-slate-400 leading-tight">PE Management</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-0.5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {user?.role === 'admin' && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="px-3 mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Admin</span>
            </div>
            {adminItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} className={isActive ? 'text-purple-600' : 'text-slate-400'} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* User info */}
      <div className="px-3 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-800 truncate">{user?.name}</div>
            <div className="text-xs text-slate-400 capitalize">{user?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
