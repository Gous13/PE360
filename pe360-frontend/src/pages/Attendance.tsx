import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Save, Users, ChevronDown, History } from 'lucide-react';
import { attendanceApi, studentsApi } from '../services/api';
import { useToastStore } from '../store/toastStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import type { Student } from '../types';
import { cn } from '../utils/cn';

const CLASSES = ['6','7','8','9','10','11','12'];
const SECTIONS = ['A','B','C','D','E'];
const PERIODS = ['1','2','3','4','5','6','7','8'];

export function Attendance() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToastStore();

  const [tab, setTab] = useState<'mark' | 'history'>(
    searchParams.get('class') ? 'mark' : 'mark'
  );
  const [cls, setCls] = useState(searchParams.get('class') || '8');
  const [section, setSection] = useState(searchParams.get('section') || 'A');
  const [period, setPeriod] = useState(searchParams.get('period') || '1');
  const [date] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<number, 'present' | 'absent'>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // History state
  const [histClass, setHistClass] = useState('8');
  const [histSection, setHistSection] = useState('A');
  const [histMonth, setHistMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [histData, setHistData] = useState<any>(null);
  const [histLoading, setHistLoading] = useState(false);

  useEffect(() => { fetchStudents(); }, [cls, section]);
  useEffect(() => {
    if (searchParams.get('class')) {
      setCls(searchParams.get('class')!);
      setSection(searchParams.get('section') || 'A');
      setPeriod(searchParams.get('period') || '1');
    }
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    setSaved(false);
    try {
      const r = await studentsApi.getByClass(cls, section);
      const studs: Student[] = r.data.students || [];
      setStudents(studs);
      const init: Record<number, 'present' | 'absent'> = {};
      studs.forEach(s => { init[s.id] = 'present'; });
      setAttendance(init);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const markAll = (status: 'present' | 'absent') => {
    const updated: Record<number, 'present' | 'absent'> = {};
    students.forEach(s => { updated[s.id] = status; });
    setAttendance(updated);
  };

  const toggle = (id: number) => {
    setAttendance(prev => ({ ...prev, [id]: prev[id] === 'present' ? 'absent' : 'present' }));
  };

  const saveAttendance = async () => {
    if (!students.length) { addToast('No students to mark attendance for', 'warning'); return; }
    setSaving(true);
    try {
      const records = students.map(s => ({
        studentId: s.id,
        status: attendance[s.id] || 'present',
      }));
      await attendanceApi.saveSession({
        date, class: cls, section, period: Number(period),
        subject: 'Physical Education', records,
      });
      addToast('Attendance saved successfully');
      setSaved(true);
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to save attendance', 'error');
    } finally {
      setSaving(false);
    }
  };

  const fetchHistory = async () => {
    setHistLoading(true);
    try {
      const r = await attendanceApi.getMonthly(histClass, histSection, histMonth);
      setHistData(r.data);
    } catch {
      addToast('Failed to load attendance history', 'error');
      setHistData(null);
    } finally {
      setHistLoading(false);
    }
  };

  const generatePdf = async () => {
    try {
      const r = await attendanceApi.generatePdf({ class: histClass, section: histSection, month: histMonth });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Attendance_${histClass}-${histSection}_${histMonth}.pdf`;
      a.click();
      addToast('PDF downloaded');
    } catch {
      addToast('Failed to generate PDF', 'error');
    }
  };

  const presentCount = Object.values(attendance).filter(v => v === 'present').length;
  const absentCount = Object.values(attendance).filter(v => v === 'absent').length;

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto lg:max-w-3xl lg:px-8 lg:py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {(['mark', 'history'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-all', tab === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500')}
            >
              {t === 'mark' ? 'Mark' : 'History'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'mark' && (
        <>
          {/* Selector */}
          <Card className="mb-4">
            <div className="grid grid-cols-3 gap-3">
              <Select
                label="Class"
                value={cls}
                onChange={(e) => { setCls(e.target.value); setSaved(false); }}
                options={CLASSES.map(c => ({ value: c, label: `Class ${c}` }))}
              />
              <Select
                label="Section"
                value={section}
                onChange={(e) => { setSection(e.target.value); setSaved(false); }}
                options={SECTIONS.map(s => ({ value: s, label: `Sec ${s}` }))}
              />
              <Select
                label="Period"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                options={PERIODS.map(p => ({ value: p, label: `P ${p}` }))}
              />
            </div>
          </Card>

          {/* Header info */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-800">
                Class {cls}-{section} — Period {period}
              </h2>
              <p className="text-sm text-slate-500">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">{presentCount} Present</Badge>
              <Badge variant="danger">{absentCount} Absent</Badge>
            </div>
          </div>

          {/* Quick mark buttons */}
          {students.length > 0 && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => markAll('present')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium hover:bg-green-100 transition-colors"
              >
                <CheckCircle2 size={16} />
                All Present
              </button>
              <button
                onClick={() => markAll('absent')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium hover:bg-red-100 transition-colors"
              >
                <XCircle size={16} />
                All Absent
              </button>
            </div>
          )}

          {/* Student list */}
          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : students.length > 0 ? (
            <>
              <div className="space-y-2 mb-24">
                {students.map((student) => {
                  const status = attendance[student.id] || 'present';
                  return (
                    <button
                      key={student.id}
                      onClick={() => toggle(student.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all duration-150 text-left tap-target',
                        status === 'present'
                          ? 'border-green-200 bg-green-50'
                          : 'border-red-200 bg-red-50'
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                        status === 'present' ? 'bg-green-100' : 'bg-red-100'
                      )}>
                        <span className={cn('font-bold text-sm', status === 'present' ? 'text-green-700' : 'text-red-700')}>
                          {student.rollNo}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 text-sm">{student.name}</div>
                        <div className="text-xs text-slate-500 capitalize">{student.gender}</div>
                      </div>
                      <div className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold',
                        status === 'present' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      )}>
                        {status === 'present' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        {status === 'present' ? 'P' : 'A'}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Sticky save bar */}
              <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 px-4 py-3 bg-white/95 backdrop-blur border-t border-slate-100 z-20">
                <div className="max-w-2xl mx-auto lg:max-w-3xl flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-700">
                      {presentCount} / {students.length} Present
                    </div>
                    {saved && <div className="text-xs text-green-600">✓ Attendance saved</div>}
                  </div>
                  <Button onClick={saveAttendance} loading={saving} icon={<Save size={16} />} size="lg">
                    Save Attendance
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              emoji="👥"
              title="No students found"
              description={`No students imported for Class ${cls}-${section}. Import students first.`}
              action={{ label: 'Go to Students', onClick: () => navigate('/students') }}
            />
          )}
        </>
      )}

      {tab === 'history' && (
        <div>
          <Card className="mb-5">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Select
                label="Class"
                value={histClass}
                onChange={(e) => setHistClass(e.target.value)}
                options={CLASSES.map(c => ({ value: c, label: `Class ${c}` }))}
              />
              <Select
                label="Section"
                value={histSection}
                onChange={(e) => setHistSection(e.target.value)}
                options={SECTIONS.map(s => ({ value: s, label: `Sec ${s}` }))}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Month</label>
                <input
                  type="month"
                  value={histMonth}
                  onChange={(e) => setHistMonth(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <Button onClick={fetchHistory} loading={histLoading} fullWidth icon={<History size={15} />}>
              View Attendance
            </Button>
          </Card>

          {histData && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-4 gap-2 mb-5">
                {[
                  { label: 'Total Classes', value: histData.totalSessions, color: 'text-blue-600' },
                  { label: 'Students', value: histData.students?.length || 0, color: 'text-slate-700' },
                  { label: 'Avg Present', value: `${histData.avgAttendance || 0}%`, color: 'text-green-600' },
                  { label: 'Month', value: histMonth.split('-')[1], color: 'text-purple-600' },
                ].map(s => (
                  <Card key={s.label} padding="sm" className="text-center">
                    <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-tight">{s.label}</div>
                  </Card>
                ))}
              </div>

              {/* Download PDF */}
              <div className="flex gap-2 mb-4">
                <Button onClick={generatePdf} variant="outline" fullWidth>
                  📄 Download PDF Report
                </Button>
              </div>

              {/* Student rows */}
              {histData.students?.length > 0 ? (
                <div className="space-y-2">
                  {histData.students.map((s: any) => (
                    <Card key={s.studentId} padding="sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-slate-600">{s.rollNo}</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-800 text-sm">{s.name}</div>
                          <div className="text-xs text-slate-500">
                            Present: {s.present} | Absent: {s.absent}
                          </div>
                        </div>
                        <div className={cn(
                          'text-sm font-bold',
                          s.percentage >= 75 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {s.percentage}%
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState emoji="📋" title="No attendance records" description="No attendance was marked for this period." />
              )}
            </>
          )}

          {!histData && !histLoading && (
            <EmptyState
              emoji="📊"
              title="View attendance history"
              description="Select a class, section, and month, then tap View Attendance."
            />
          )}
        </div>
      )}
    </div>
  );
}
