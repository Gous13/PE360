import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Trophy, Calendar, Users, ClipboardCheck, UsersRound, Pin,
  ChevronRight, TrendingUp
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { timetableApi, studentsApi } from '../services/api';
import { Card } from '../components/ui/Card';
import type { TimetableEntry } from '../types';

const quickActions = [
  { icon: '🏟️', label: 'Sports', desc: 'Court dimensions & rules', to: '/sports', color: 'from-orange-50 to-orange-100 border-orange-100' },
  { icon: '📅', label: 'Timetable', desc: 'Today\'s PE periods', to: '/timetable', color: 'from-blue-50 to-blue-100 border-blue-100' },
  { icon: '👨‍🎓', label: 'Students', desc: 'Manage class-wise data', to: '/students', color: 'from-green-50 to-green-100 border-green-100' },
  { icon: '✅', label: 'Attendance', desc: 'Mark today\'s attendance', to: '/attendance', color: 'from-emerald-50 to-emerald-100 border-emerald-100' },
  { icon: '👥', label: 'Teams', desc: 'Generate random teams', to: '/teams', color: 'from-purple-50 to-purple-100 border-purple-100' },
  { icon: '📌', label: 'Important', desc: 'Saved notes & reminders', to: '/important', color: 'from-amber-50 to-amber-100 border-amber-100' },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function Home() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [todayClasses, setTodayClasses] = useState<TimetableEntry[]>([]);
  const [stats, setStats] = useState({ students: 0, classes: 0, periodsToday: 0 });
  const today = new Date();

  useEffect(() => {
    timetableApi.getToday()
      .then((r) => setTodayClasses(r.data.entries || []))
      .catch(() => {});

    studentsApi.getClasses()
      .then((r) => {
        const classes = r.data.classes || [];
        const totalStudents = classes.reduce((a: number, c: any) => a + (c.count || 0), 0);
        setStats({ students: totalStudents, classes: classes.length, periodsToday: 0 });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (todayClasses.length > 0) {
      setStats((s) => ({ ...s, periodsToday: todayClasses.length }));
    }
  }, [todayClasses]);

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto lg:max-w-full lg:px-8 lg:py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'PET'} 👋
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {format(today, 'EEEE, d MMMM yyyy')}
            </p>
          </div>
          <div className="w-11 h-11 bg-blue-600 rounded-full flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-base">
              {user?.name?.charAt(0)?.toUpperCase() || 'P'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Students', value: stats.students || '—', icon: Users, color: 'text-blue-600 bg-blue-50' },
          { label: 'Classes', value: stats.classes || '—', icon: Calendar, color: 'text-green-600 bg-green-50' },
          { label: 'PE Today', value: stats.periodsToday || todayClasses.length, icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
        ].map((stat) => (
          <Card key={stat.label} padding="sm" className="text-center">
            <div className={`w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center ${stat.color}`}>
              <stat.icon size={16} />
            </div>
            <div className="text-xl font-bold text-slate-900">{stat.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* Today's Classes */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
              <Calendar size={16} className="text-blue-600" />
            </div>
            <h2 className="font-semibold text-slate-800">Today's PE Classes</h2>
          </div>
          <button
            onClick={() => navigate('/timetable')}
            className="text-blue-600 text-xs font-medium flex items-center gap-0.5 hover:underline"
          >
            View all <ChevronRight size={12} />
          </button>
        </div>

        {todayClasses.length > 0 ? (
          <div className="space-y-2.5">
            {todayClasses.map((cls) => (
              <div key={cls.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="text-center min-w-[60px]">
                  <div className="text-xs text-slate-400 font-medium">{cls.time}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Period {cls.period}</div>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-800 text-sm">
                    Class {cls.class}-{cls.section}
                  </div>
                  <div className="text-xs text-slate-500">{cls.subject}</div>
                </div>
                <button
                  onClick={() => navigate(`/attendance?class=${cls.class}&section=${cls.section}&period=${cls.period}`)}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Mark
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">📅</div>
            <p className="text-slate-500 text-sm">No PE classes scheduled for today.</p>
            <button
              onClick={() => navigate('/timetable')}
              className="text-blue-600 text-sm font-medium mt-2 hover:underline"
            >
              Set up timetable →
            </button>
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="font-semibold text-slate-800 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.to)}
              className={`bg-gradient-to-br ${action.color} border rounded-2xl p-4 text-left tap-target active:scale-95 transition-all duration-150 hover:shadow-sm`}
            >
              <div className="text-2xl mb-2">{action.icon}</div>
              <div className="font-semibold text-slate-800 text-sm">{action.label}</div>
              <div className="text-xs text-slate-500 mt-0.5 leading-snug">{action.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Upcoming events placeholder */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
            <Trophy size={16} className="text-amber-600" />
          </div>
          <h2 className="font-semibold text-slate-800">Upcoming</h2>
        </div>
        <div
          className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 cursor-pointer hover:bg-amber-100 transition-colors"
          onClick={() => navigate('/important')}
        >
          <span className="text-xl">🏆</span>
          <div>
            <div className="text-sm font-medium text-slate-800">Annual Sports Meet</div>
            <div className="text-xs text-slate-500">Check Important section for details</div>
          </div>
          <ChevronRight size={16} className="ml-auto text-slate-400" />
        </div>
      </Card>
    </div>
  );
}
