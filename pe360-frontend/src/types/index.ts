export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  schoolName: string;
  phone: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface Student {
  id: number;
  rollNo: string;
  name: string;
  class: string;
  section: string;
  gender: 'male' | 'female' | 'other';
}

export interface TimetableEntry {
  id: number;
  day: string;
  period: number;
  class: string;
  section: string;
  time: string;
  subject: string;
  teacherName: string;
}

export interface AttendanceRecord {
  id: number;
  studentId: number;
  studentName: string;
  rollNo: string;
  date: string;
  status: 'present' | 'absent';
  class: string;
  section: string;
  period: number;
  subject: string;
}

export interface AttendanceSession {
  id: number;
  date: string;
  class: string;
  section: string;
  period: number;
  subject: string;
  teacherId: number;
  records: AttendanceRecord[];
}

export interface Sport {
  id: number;
  name: string;
  category: string;
  icon: string;
  image?: string;
  color: string;
  overview: string;
  players: string;
  equipment: string[];
  scoring: string;
  officials: string;
  court: CourtInfo;
  rules: SportRule[];
  teamConfig: TeamConfig;
}

export interface TeamConfig {
  teamSize: number;        // recommended / standard players per team
  minTeamSize: number;     // minimum to form a valid team
  maxTeamSize: number;     // max before team is considered oversized
  format: 'team' | 'singles' | 'doubles' | 'relay'; // event format
}

export interface CourtInfo {
  name: string;
  length: number;
  width: number;
  lengthUnit: string;
  widthUnit: string;
  description: string;
  measurements: Measurement[];
  type: 'basketball' | 'volleyball' | 'badminton' | 'tennis' | 'football' | 'cricket' | 'hockey' | 'kabaddi' | 'kho-kho' | 'throwball' | 'handball' | 'tabletennis' | 'athletics';
}

export interface Measurement {
  label: string;
  value: string;
}

export interface SportRule {
  title: string;
  description: string;
}

export interface Team {
  id: number;
  name: string;
  color: string;
  members: Student[];
}

export interface ImportantItem {
  id: number;
  title: string;
  description: string;
  category: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
  pinned: boolean;
  createdBy: number;
  isGlobal: boolean;
}

export interface AuditLog {
  id: number;
  userId: number;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface ImportPreview {
  students: Student[];
  errors: string[];
  total: number;
  valid: number;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}
