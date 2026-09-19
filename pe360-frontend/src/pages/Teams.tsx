import { useState } from 'react';
import { Shuffle, Users, Printer } from 'lucide-react';
import { studentsApi } from '../services/api';
import { useToastStore } from '../store/toastStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import type { Student, Team } from '../types';

const CLASSES = ['6','7','8','9','10','11','12'];
const SECTIONS = ['A','B','C','D','E'];
const SPORTS = ['Football','Basketball','Volleyball','Cricket','Kabaddi','Kho-Kho','Badminton','Hockey','Handball','Athletics','Other'];
const NUM_TEAMS = ['2','3','4','5','6'];

const TEAM_COLORS = [
  { name: 'Red', bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  { name: 'Blue', bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  { name: 'Green', bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  { name: 'Yellow', bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  { name: 'Purple', bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  { name: 'Orange', bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function Teams() {
  const [cls, setCls] = useState('8');
  const [section, setSection] = useState('A');
  const [sport, setSport] = useState('Football');
  const [numTeams, setNumTeams] = useState('4');
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToastStore();

  const generateTeams = async () => {
    setLoading(true);
    try {
      const r = await studentsApi.getByClass(cls, section);
      const students: Student[] = r.data.students || [];
      if (!students.length) {
        addToast(`No students found in Class ${cls}-${section}`, 'warning');
        setLoading(false);
        return;
      }
      const shuffled = shuffleArray(students);
      const n = Number(numTeams);
      const generated: Team[] = Array.from({ length: n }, (_, i) => ({
        id: i + 1,
        name: `Team ${TEAM_COLORS[i]?.name || String.fromCharCode(65 + i)}`,
        color: TEAM_COLORS[i]?.name || 'Gray',
        members: [],
      }));
      shuffled.forEach((student, idx) => {
        generated[idx % n].members.push(student);
      });
      setTeams(generated);
      addToast(`${n} teams generated with ${students.length} students`);
    } catch {
      addToast('Failed to load students. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const regenerate = () => {
    if (!teams.length) return;
    const allStudents = teams.flatMap(t => t.members);
    const shuffled = shuffleArray(allStudents);
    const n = teams.length;
    const newTeams: Team[] = teams.map((t) => ({ ...t, members: [] as Student[] }));
    shuffled.forEach((student, idx) => {
      newTeams[idx % n].members.push(student);
    });
    setTeams(newTeams);
    addToast('Teams regenerated');
  };

  const handlePrint = () => {
    const content = teams.map(team => {
      const members = team.members.map((m, i) => `${i+1}. ${m.name} (Roll: ${m.rollNo})`).join('\n');
      return `${team.name} (${team.members.length} players)\n${members}`;
    }).join('\n\n');
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<pre style="font-family:sans-serif;padding:20px;font-size:14px">
PE360 — Team Formation
Sport: ${sport} | Class: ${cls}-${section}
${new Date().toLocaleDateString()}

${content}
      </pre>`);
      win.print();
    }
  };

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto lg:max-w-3xl lg:px-8 lg:py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Team Generator</h1>
        <p className="text-slate-500 text-sm mt-0.5">Randomly divide students into teams for any sport</p>
      </div>

      {/* Config card */}
      <Card className="mb-6">
        <h2 className="font-semibold text-slate-800 mb-4">Setup</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Select
            label="Class"
            value={cls}
            onChange={(e) => setCls(e.target.value)}
            options={CLASSES.map(c => ({ value: c, label: `Class ${c}` }))}
          />
          <Select
            label="Section"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            options={SECTIONS.map(s => ({ value: s, label: `Section ${s}` }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Select
            label="Sport"
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            options={SPORTS.map(s => ({ value: s, label: s }))}
          />
          <Select
            label="Number of Teams"
            value={numTeams}
            onChange={(e) => setNumTeams(e.target.value)}
            options={NUM_TEAMS.map(n => ({ value: n, label: `${n} Teams` }))}
          />
        </div>
        <Button
          onClick={generateTeams}
          loading={loading}
          icon={<Shuffle size={16} />}
          fullWidth
          size="lg"
        >
          Generate Teams
        </Button>
      </Card>

      {/* Teams display */}
      {teams.length > 0 ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-800">Generated Teams</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {sport} • Class {cls}-{section} • {teams.reduce((a, t) => a + t.members.length, 0)} students
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                title="Print teams"
              >
                <Printer size={16} />
              </button>
              <Button onClick={regenerate} variant="outline" icon={<Shuffle size={14} />} size="sm">
                Regenerate
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {teams.map((team, i) => {
              const colors = TEAM_COLORS[i] || TEAM_COLORS[0];
              return (
                <Card key={team.id} padding="sm" className={`border-2 ${colors.border} ${colors.bg}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
                      <span className="font-semibold text-slate-800">{team.name}</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors.badge}`}>
                      {team.members.length} players
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {team.members.map((m, idx) => (
                      <div key={m.id} className="flex items-center gap-2 py-1">
                        <span className="text-xs text-slate-400 w-5">{idx + 1}.</span>
                        <span className="text-sm text-slate-700 font-medium">{m.name}</span>
                        <span className="text-xs text-slate-400 ml-auto">#{m.rollNo}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <EmptyState
          emoji="👥"
          title="No teams generated yet"
          description="Select a class, sport, and number of teams, then tap Generate Teams."
        />
      )}
    </div>
  );
}
