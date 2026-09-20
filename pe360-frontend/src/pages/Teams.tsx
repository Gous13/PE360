import { useState, useEffect } from 'react';
import { Shuffle, Printer, AlertTriangle, CheckCircle2, Users, ChevronDown, Info, Lock, Unlock } from 'lucide-react';
import { studentsApi } from '../services/api';
import { useToastStore } from '../store/toastStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { sportsData } from '../data/sports';
import type { Student, Team } from '../types';
import { cn } from '../utils/cn';

const CLASSES = ['6', '7', '8', '9', '10', '11', '12'];
const SECTIONS = ['A', 'B', 'C', 'D', 'E'];

const TEAM_COLORS = [
  { name: 'Red',    bg: 'bg-red-50',    border: 'border-red-200',    badge: 'bg-red-100 text-red-700',       dot: 'bg-red-500' },
  { name: 'Blue',   bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500' },
  { name: 'Green',  bg: 'bg-green-50',  border: 'border-green-200',  badge: 'bg-green-100 text-green-700',   dot: 'bg-green-500' },
  { name: 'Yellow', bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  { name: 'Purple', bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  { name: 'Orange', bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  { name: 'Pink',   bg: 'bg-pink-50',   border: 'border-pink-200',   badge: 'bg-pink-100 text-pink-700',     dot: 'bg-pink-500' },
  { name: 'Teal',   bg: 'bg-teal-50',   border: 'border-teal-200',   badge: 'bg-teal-100 text-teal-700',     dot: 'bg-teal-500' },
];

type RemainderChoice = 'extra-team' | 'distribute' | 'unassigned' | null;
type DistributionMode = 'random' | 'balanced';

interface GeneratedTeam extends Team {
  isExtra?: boolean;
  lockedMemberIds?: Set<number>;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildTeams(
  eligible: Student[],
  numTeams: number,
  mode: DistributionMode,
  lockedMap: Map<number, number>, // studentId → teamIndex (0-based)
  existingTeams?: GeneratedTeam[],
): GeneratedTeam[] {
  // Start with empty teams preserving color/name
  const teams: GeneratedTeam[] = Array.from({ length: numTeams }, (_, i) => ({
    id: i + 1,
    name: existingTeams?.[i]?.name ?? `Team ${TEAM_COLORS[i % TEAM_COLORS.length].name}`,
    color: TEAM_COLORS[i % TEAM_COLORS.length].name,
    members: [] as Student[],
    lockedMemberIds: existingTeams?.[i]?.lockedMemberIds ?? new Set<number>(),
  }));

  // Place locked students first
  const unlocked: Student[] = [];
  for (const s of eligible) {
    const lockedTeam = lockedMap.get(s.id);
    if (lockedTeam !== undefined && lockedTeam < numTeams) {
      teams[lockedTeam].members.push(s);
    } else {
      unlocked.push(s);
    }
  }

  // Distribute unlocked students
  const toDistribute = mode === 'random' ? shuffleArray(unlocked) : [...unlocked];
  if (mode === 'balanced') {
    // Sort teams by current size ascending, distribute to smallest team each round
    toDistribute.forEach((student) => {
      const minIdx = teams.reduce((mi, t, i) => t.members.length < teams[mi].members.length ? i : mi, 0);
      teams[minIdx].members.push(student);
    });
  } else {
    toDistribute.forEach((student, idx) => {
      teams[idx % numTeams].members.push(student);
    });
  }

  return teams;
}

export function Teams() {
  // Setup
  const [cls, setCls] = useState('8');
  const [section, setSection] = useState('A');
  const [sportId, setSportId] = useState<number>(sportsData[0].id);
  const [mode, setMode] = useState<DistributionMode>('random');

  // Student loading
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [fetched, setFetched] = useState(false);

  // Remainder decision
  const [remainderChoice, setRemainderChoice] = useState<RemainderChoice>(null);
  const [forcePractice, setForcePractice] = useState(false);

  // Generated teams
  const [teams, setTeams] = useState<GeneratedTeam[]>([]);
  const [unassigned, setUnassigned] = useState<Student[]>([]);
  const [lockedMap, setLockedMap] = useState<Map<number, number>>(new Map());
  const [generated, setGenerated] = useState(false);

  const { addToast } = useToastStore();

  const selectedSport = sportsData.find(s => s.id === sportId) ?? sportsData[0];
  const { teamSize, minTeamSize, maxTeamSize } = selectedSport.teamConfig;

  const totalStudents = allStudents.length;
  const completeTeams = totalStudents > 0 ? Math.floor(totalStudents / teamSize) : 0;
  const remainder = totalStudents > 0 ? totalStudents % teamSize : 0;
  const hasEnough = totalStudents >= minTeamSize;
  const isInsufficient = fetched && totalStudents > 0 && totalStudents < teamSize;
  const canFormTeams = fetched && hasEnough && (completeTeams > 0 || forcePractice);

  // Reset state when class/section/sport changes
  useEffect(() => {
    setFetched(false);
    setAllStudents([]);
    setTeams([]);
    setUnassigned([]);
    setLockedMap(new Map());
    setGenerated(false);
    setRemainderChoice(null);
    setForcePractice(false);
  }, [cls, section, sportId]);

  const loadStudents = async () => {
    setLoadingStudents(true);
    setFetched(false);
    setTeams([]);
    setGenerated(false);
    setLockedMap(new Map());
    setRemainderChoice(null);
    setForcePractice(false);
    try {
      const r = await studentsApi.getByClass(cls, section);
      const studs: Student[] = r.data.students || [];
      setAllStudents(studs);
      setFetched(true);
      if (!studs.length) addToast(`No students found in Class ${cls}-${section}`, 'warning');
    } catch {
      addToast('Failed to load students. Please try again.', 'error');
    } finally {
      setLoadingStudents(false);
    }
  };

  const doGenerate = (students: Student[], choice: RemainderChoice, practice = false) => {
    const teamSz = teamSize;
    let eligibleStudents = [...students];
    let leftover: Student[] = [];

    if (practice || completeTeams === 0) {
      // Practice mode — form as many teams as needed from all students
      const practiceTeams = Math.max(1, Math.floor(students.length / Math.max(1, minTeamSize)));
      const built = buildTeams(eligibleStudents, practiceTeams, mode, lockedMap);
      setTeams(built);
      setUnassigned([]);
      setGenerated(true);
      addToast(`${practiceTeams} practice team${practiceTeams > 1 ? 's' : ''} generated`);
      return;
    }

    const n = completeTeams;

    if (choice === 'extra-team') {
      // All students go in — complete teams + 1 small extra team
      const extraTeams: GeneratedTeam[] = buildTeams(eligibleStudents.slice(0, n * teamSz), n, mode, lockedMap);
      if (remainder > 0) {
        const remaining = eligibleStudents.slice(n * teamSz);
        const shuffledRemaining = mode === 'random' ? shuffleArray(remaining) : remaining;
        const extraTeam: GeneratedTeam = {
          id: n + 1,
          name: `Team ${TEAM_COLORS[n % TEAM_COLORS.length].name}`,
          color: TEAM_COLORS[n % TEAM_COLORS.length].name,
          members: shuffledRemaining,
          isExtra: true,
          lockedMemberIds: new Set(),
        };
        extraTeams.push(extraTeam);
      }
      setTeams(extraTeams);
      setUnassigned([]);
      setGenerated(true);
      addToast(`${extraTeams.length} teams generated`);
    } else if (choice === 'distribute') {
      // Distribute all students across complete teams (some will exceed teamSize)
      const built = buildTeams(eligibleStudents, n, mode, lockedMap);
      setTeams(built);
      setUnassigned([]);
      setGenerated(true);
      addToast(`${n} teams generated — remaining students distributed`);
    } else {
      // 'unassigned' or null — only assign to complete teams, leave remainder out
      const assignable = shuffleArray(eligibleStudents);
      const mainStudents = assignable.slice(0, n * teamSz);
      leftover = assignable.slice(n * teamSz);
      const built = buildTeams(mainStudents, n, mode, lockedMap);
      setTeams(built);
      setUnassigned(leftover);
      setGenerated(true);
      addToast(`${n} teams generated${leftover.length ? `, ${leftover.length} student${leftover.length > 1 ? 's' : ''} unassigned` : ''}`);
    }
  };

  const handleGenerate = () => {
    if (!allStudents.length) return;
    if (remainder > 0 && remainderChoice === null && !forcePractice) {
      addToast('Please choose what to do with the remaining students first.', 'warning');
      return;
    }
    doGenerate(allStudents, remainderChoice, forcePractice);
  };

  const handleRegenerate = () => {
    if (!allStudents.length) return;
    // Preserve locked assignments, re-shuffle the rest
    const choice = remainderChoice;
    const prevTeamCount = teams.length;

    let eligibleStudents = [...allStudents];
    let leftover: Student[] = [];

    if (forcePractice || completeTeams === 0) {
      const built = buildTeams(eligibleStudents, prevTeamCount, mode, lockedMap, teams);
      setTeams(built);
      addToast('Teams regenerated');
      return;
    }

    const n = completeTeams;

    if (choice === 'extra-team') {
      const mainStudents = eligibleStudents.slice(0, n * teamSize);
      const remaining = eligibleStudents.slice(n * teamSize);
      const mainShuffled = shuffleArray(mainStudents.filter(s => !lockedMap.has(s.id)));
      const mainLocked = mainStudents.filter(s => lockedMap.has(s.id));
      const rebulit = buildTeams([...mainLocked, ...mainShuffled], n, mode, lockedMap, teams);
      if (remaining.length > 0) {
        const extraTeam: GeneratedTeam = {
          id: n + 1,
          name: teams[n]?.name ?? `Team ${TEAM_COLORS[n % TEAM_COLORS.length].name}`,
          color: TEAM_COLORS[n % TEAM_COLORS.length].name,
          members: mode === 'random' ? shuffleArray(remaining) : remaining,
          isExtra: true,
          lockedMemberIds: teams[n]?.lockedMemberIds ?? new Set(),
        };
        rebulit.push(extraTeam);
      }
      setTeams(rebulit);
    } else if (choice === 'distribute') {
      const built = buildTeams(eligibleStudents, n, mode, lockedMap, teams);
      setTeams(built);
    } else {
      const assignable = shuffleArray(eligibleStudents.filter(s => !lockedMap.has(s.id)));
      const locked = eligibleStudents.filter(s => lockedMap.has(s.id));
      const allOrdered = [...locked, ...assignable];
      const mainStudents = allOrdered.slice(0, n * teamSize);
      leftover = allOrdered.slice(n * teamSize);
      const built = buildTeams(mainStudents, n, mode, lockedMap, teams);
      setTeams(built);
      setUnassigned(leftover);
    }
    addToast('Teams regenerated');
  };

  const toggleLock = (studentId: number, teamIndex: number) => {
    setLockedMap(prev => {
      const next = new Map(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.set(studentId, teamIndex);
      }
      return next;
    });
    // Update lockedMemberIds on the team object for display
    setTeams(prev => prev.map((t, i) => {
      if (i !== teamIndex) return t;
      const ids = new Set(t.lockedMemberIds);
      if (ids.has(studentId)) ids.delete(studentId); else ids.add(studentId);
      return { ...t, lockedMemberIds: ids };
    }));
  };

  const handlePrint = () => {
    const content = teams.map(team => {
      const members = team.members.map((m, i) => `  ${i + 1}. ${m.name} (Roll: ${m.rollNo})`).join('\n');
      const extra = team.isExtra ? ` ⚠ Below standard size` : '';
      return `${team.name} — ${team.members.length} players${extra}\n${members}`;
    }).join('\n\n');
    const unassignedLine = unassigned.length
      ? `\n\nUnassigned Students (${unassigned.length}):\n${unassigned.map(s => `  - ${s.name} (Roll: ${s.rollNo})`).join('\n')}`
      : '';
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<pre style="font-family:sans-serif;padding:20px;font-size:13px;line-height:1.6">
PE360 — Team Formation
Sport: ${selectedSport.name} | Class: ${cls}-${section}
Recommended: ${teamSize} players/team | Teams: ${teams.length}
${new Date().toLocaleDateString()}
${'─'.repeat(50)}

${content}${unassignedLine}
      </pre>`);
      win.print();
    }
  };

  // ── Team size status ───────────────────────────────────────────────────────
  const teamStatus = (count: number, isExtra = false): { label: string; color: string } => {
    if (isExtra || count < minTeamSize) return { label: '🔴 Below minimum', color: 'text-red-600' };
    if (count === teamSize) return { label: '🟢 Standard size', color: 'text-green-600' };
    if (count > maxTeamSize) return { label: '🟡 Above recommended', color: 'text-amber-600' };
    if (count > teamSize) return { label: '🟡 Above recommended', color: 'text-amber-600' };
    return { label: '🟢 Standard size', color: 'text-green-600' };
  };

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto lg:max-w-3xl lg:px-8 lg:py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Team Generator</h1>
        <p className="text-slate-500 text-sm mt-0.5">Smart team formation based on sport requirements</p>
      </div>

      {/* ── Setup card ──────────────────────────────────────────────── */}
      <Card className="mb-4">
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
        <div className="mb-4">
          <Select
            label="Sport / Game"
            value={String(sportId)}
            onChange={(e) => setSportId(Number(e.target.value))}
            options={sportsData.map(s => ({ value: String(s.id), label: `${s.icon} ${s.name}` }))}
          />
        </div>

        {/* Sport info bar */}
        <div className="bg-slate-50 rounded-xl px-3 py-2.5 mb-4 flex items-start gap-2">
          <Info size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-slate-600 leading-relaxed">
            <span className="font-semibold">{selectedSport.name}</span>
            {selectedSport.teamConfig.format === 'team' && (
              <> — {teamSize} players/team (min {minTeamSize}, max {maxTeamSize})</>
            )}
            {selectedSport.teamConfig.format === 'doubles' && (
              <> — Singles (1) or Doubles (2) per side</>
            )}
            {selectedSport.teamConfig.format === 'relay' && (
              <> — Relay: {teamSize} players/team</>
            )}
          </div>
        </div>

        {/* Distribution mode */}
        <div className="mb-4">
          <p className="text-xs font-medium text-slate-500 mb-2">Distribution Mode</p>
          <div className="flex gap-2">
            {(['random', 'balanced'] as DistributionMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  'flex-1 py-2 rounded-xl text-sm font-medium border transition-all',
                  mode === m
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                )}
              >
                {m === 'random' ? '🎲 Random' : '⚖️ Balanced'}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={loadStudents}
          loading={loadingStudents}
          icon={<Users size={16} />}
          fullWidth
          size="lg"
          variant="outline"
        >
          Load Students — Class {cls}-{section}
        </Button>
      </Card>

      {/* ── Student count + calculation panel ───────────────────────── */}
      {fetched && totalStudents > 0 && (
        <Card className="mb-4">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center bg-slate-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-slate-900">{totalStudents}</div>
              <div className="text-xs text-slate-500 mt-0.5">Students Available</div>
            </div>
            <div className="text-center bg-blue-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-blue-700">{teamSize}</div>
              <div className="text-xs text-slate-500 mt-0.5">Players / Team</div>
            </div>
            <div className="text-center bg-green-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-green-700">{completeTeams}</div>
              <div className="text-xs text-slate-500 mt-0.5">Complete Teams</div>
            </div>
          </div>

          {remainder > 0 && completeTeams > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-amber-600" />
                <div>
                  <span className="font-semibold">{completeTeams * teamSize} students</span> fill {completeTeams} complete teams.{' '}
                  <span className="font-semibold">{remainder} student{remainder > 1 ? 's' : ''} remaining.</span>
                  <p className="text-xs text-amber-700 mt-0.5">Choose what to do with the remaining students below.</p>
                </div>
              </div>
            </div>
          )}

          {/* Remainder options */}
          {remainder > 0 && completeTeams > 0 && !forcePractice && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Remaining Students</p>
              <div className="space-y-2">
                {([ 
                  { value: 'extra-team',  label: '➕ Create Extra Team', desc: `${remainder} students form a smaller extra team` },
                  { value: 'distribute', label: '📤 Distribute Among Existing Teams', desc: 'Spread extra students across all teams (some may exceed standard size)' },
                  { value: 'unassigned', label: '⏸ Leave Unassigned', desc: `${remainder} student${remainder > 1 ? 's' : ''} will sit out` },
                ] as const).map(opt => (
                  <label
                    key={opt.value}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                      remainderChoice === opt.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-blue-300'
                    )}
                  >
                    <input
                      type="radio"
                      name="remainder"
                      value={opt.value}
                      checked={remainderChoice === opt.value}
                      onChange={() => setRemainderChoice(opt.value)}
                      className="mt-0.5 accent-blue-600"
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-800">{opt.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Generate button */}
          {!isInsufficient && canFormTeams && (
            <Button
              onClick={handleGenerate}
              icon={<Shuffle size={16} />}
              fullWidth
              size="lg"
              disabled={remainder > 0 && remainderChoice === null && !forcePractice}
            >
              Generate Teams
            </Button>
          )}
        </Card>
      )}

      {/* ── No students found ───────────────────────────────────────── */}
      {fetched && totalStudents === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center mb-4">
          <div className="text-3xl mb-2">👥</div>
          <div className="font-semibold text-slate-700">No students in Class {cls}-{section}</div>
          <div className="text-sm text-slate-500 mt-1">Import students first from the Students module.</div>
        </div>
      )}

      {/* ── Insufficient students warning ───────────────────────────── */}
      {isInsufficient && !forcePractice && (
        <Card className="mb-4 border-2 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-amber-800">Not enough students</div>
              <p className="text-sm text-amber-700 mt-1">
                <span className="font-semibold">{selectedSport.name}</span> requires approximately{' '}
                <span className="font-semibold">{teamSize} players</span> per team.{' '}
                Only <span className="font-semibold">{totalStudents} student{totalStudents > 1 ? 's' : ''}</span> available in Class {cls}-{section}.
              </p>
              <p className="text-xs text-amber-600 mt-1">A complete standard team cannot be formed.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => { setForcePractice(true); setRemainderChoice(null); }}
              fullWidth
              variant="outline"
              size="sm"
            >
              🏃 Generate Practice Team
            </Button>
            <Button
              onClick={() => { setFetched(false); setAllStudents([]); }}
              variant="outline"
              fullWidth
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Practice team generate button */}
      {isInsufficient && forcePractice && !generated && (
        <Card className="mb-4">
          <div className="text-sm text-slate-600 mb-3 bg-blue-50 rounded-xl p-3">
            Practice mode — forming the best possible teams from {totalStudents} available students.
          </div>
          <Button onClick={handleGenerate} icon={<Shuffle size={16} />} fullWidth size="lg">
            Generate Practice Teams
          </Button>
        </Card>
      )}

      {/* ── Generated teams display ─────────────────────────────────── */}
      {generated && teams.length > 0 && (
        <>
          {/* Summary header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-slate-800">
                {selectedSport.icon} {selectedSport.name} Teams
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Class {cls}-{section} · {teams.reduce((a, t) => a + t.members.length, 0)} students ·{' '}
                {teamSize} recommended/team
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
              <Button onClick={handleRegenerate} variant="outline" icon={<Shuffle size={14} />} size="sm">
                Regenerate
              </Button>
            </div>
          </div>

          {/* Team cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {teams.map((team, i) => {
              const colors = TEAM_COLORS[i % TEAM_COLORS.length];
              const status = teamStatus(team.members.length, team.isExtra);
              return (
                <Card key={team.id} padding="sm" className={cn('border-2', colors.border, colors.bg)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-3 h-3 rounded-full', colors.dot)} />
                      <span className="font-semibold text-slate-800">{team.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', colors.badge)}>
                        {team.members.length} players
                      </span>
                    </div>
                  </div>
                  <div className={cn('text-[10px] font-medium mb-2', status.color)}>{status.label}</div>
                  {team.isExtra && (
                    <div className="text-[10px] text-amber-600 bg-amber-50 rounded-lg px-2 py-1 mb-2">
                      ⚠ Below recommended size ({teamSize})
                    </div>
                  )}
                  <div className="space-y-1">
                    {team.members.map((m, idx) => {
                      const isLocked = lockedMap.has(m.id);
                      return (
                        <div key={m.id} className="flex items-center gap-2 py-0.5 group">
                          <span className="text-xs text-slate-400 w-5 flex-shrink-0">{idx + 1}.</span>
                          <span className="text-sm text-slate-700 font-medium flex-1 truncate">{m.name}</span>
                          <span className="text-xs text-slate-400">#{m.rollNo}</span>
                          <button
                            onClick={() => toggleLock(m.id, i)}
                            title={isLocked ? 'Unlock (allow reassignment)' : 'Lock to this team'}
                            className={cn(
                              'p-1 rounded-lg transition-colors flex-shrink-0',
                              isLocked
                                ? 'text-blue-600 bg-blue-100'
                                : 'text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100'
                            )}
                          >
                            {isLocked ? <Lock size={11} /> : <Unlock size={11} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Unassigned students */}
          {unassigned.length > 0 && (
            <Card className="mb-4 border-2 border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-slate-400" />
                <span className="font-semibold text-slate-600">Unassigned ({unassigned.length})</span>
              </div>
              <div className="space-y-1">
                {unassigned.map((m, idx) => (
                  <div key={m.id} className="flex items-center gap-2 py-0.5">
                    <span className="text-xs text-slate-400 w-5">{idx + 1}.</span>
                    <span className="text-sm text-slate-600">{m.name}</span>
                    <span className="text-xs text-slate-400 ml-auto">#{m.rollNo}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-2">
            <span>🟢 Standard size ({teamSize})</span>
            <span>🟡 Above recommended (&gt;{maxTeamSize})</span>
            <span>🔴 Below minimum (&lt;{minTeamSize})</span>
            <span className="flex items-center gap-1"><Lock size={10} /> = locked to team</span>
          </div>
        </>
      )}

      {/* ── Initial empty state ─────────────────────────────────────── */}
      {!fetched && (
        <EmptyState
          emoji="👥"
          title="Select a class and sport"
          description="Choose a class, section, and sport above, then tap Load Students to begin."
        />
      )}
    </div>
  );
}
