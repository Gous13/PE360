import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { ToastContainer } from '../ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { useEffect } from 'react';

export function AppLayout() {
  const { isAuthenticated, sessionKey } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  return (
    // sessionKey changes on every login — this key forces React to fully
    // unmount and remount all child route components, clearing any
    // in-memory state from a previous user's session.
    <div key={sessionKey} className="flex h-screen bg-slate-50 overflow-hidden">
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
