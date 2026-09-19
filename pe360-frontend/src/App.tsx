import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Sports } from './pages/Sports';
import { SportDetail } from './pages/SportDetail';
import { Timetable } from './pages/Timetable';
import { Students } from './pages/Students';
import { Attendance } from './pages/Attendance';
import { Teams } from './pages/Teams';
import { Important } from './pages/Important';
import { Profile } from './pages/Profile';
import { AdminUsers } from './pages/admin/Users';
import { useAuthStore } from './store/authStore';

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/sports" element={<Sports />} />
          <Route path="/sports/:id" element={<SportDetail />} />
          <Route path="/timetable" element={<Timetable />} />
          <Route path="/students" element={<Students />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/important" element={<Important />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin/users" element={
            <AdminGuard><AdminUsers /></AdminGuard>
          } />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
