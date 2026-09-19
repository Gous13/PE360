import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, Trophy, ClipboardCheck, UsersRound, MoreHorizontal,
  Calendar, Users, Pin, UserCircle, Shield, LogOut, X
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';

const bottomItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/sports', icon: Trophy, label: 'Sports' },
  { to: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
  { to: '/teams', icon: UsersRound, label: 'Teams' },
];

export function MobileNav() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 safe-bottom">
        <div className="flex items-center justify-around px-2 py-1">
          {bottomItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-150 tap-target justify-center',
                  isActive ? 'text-blue-600' : 'text-slate-500'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span className="text-[10px] font-medium leading-tight">{label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl text-slate-500 tap-target justify-center"
          >
            <MoreHorizontal size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-medium leading-tight">More</span>
          </button>
        </div>
      </nav>

      {/* Drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl pb-8 safe-bottom">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>

            {/* User info */}
            <div className="px-5 py-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{user?.name}</div>
                  <div className="text-sm text-slate-400 capitalize">{user?.role} • PE360</div>
                </div>
                <button onClick={() => setDrawerOpen(false)} className="ml-auto p-2 text-slate-400">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="px-4 py-3 grid grid-cols-3 gap-2">
              {[
                { to: '/timetable', icon: Calendar, label: 'Timetable', color: 'text-blue-600 bg-blue-50' },
                { to: '/students', icon: Users, label: 'Students', color: 'text-green-600 bg-green-50' },
                { to: '/important', icon: Pin, label: 'Important', color: 'text-amber-600 bg-amber-50' },
                { to: '/profile', icon: UserCircle, label: 'Profile', color: 'text-slate-600 bg-slate-50' },
                ...(user?.role === 'admin'
                  ? [{ to: '/admin/users', icon: Shield, label: 'Users', color: 'text-purple-600 bg-purple-50' }]
                  : []),
              ].map(({ to, icon: Icon, label, color }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setDrawerOpen(false)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all"
                >
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
                    <Icon size={20} />
                  </div>
                  <span className="text-xs font-medium text-slate-700">{label}</span>
                </NavLink>
              ))}
            </div>

            <div className="px-5 pt-2">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              >
                <LogOut size={18} />
                <span className="font-medium text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
