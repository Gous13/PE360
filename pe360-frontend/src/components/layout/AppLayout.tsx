import { Outlet, useNavigate } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { ToastContainer } from '../ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { useEffect } from 'react';

export function AppLayout() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <Outlet />
        </div>
      </main>
      <MobileNav />
      <ToastContainer />
    </div>
  );
}
