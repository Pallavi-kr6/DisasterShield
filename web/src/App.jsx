import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { WorkerDashboard } from './pages/WorkerDashboard.jsx';
import { AdminDashboard } from './pages/AdminDashboard.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { clearAuth, getStoredAuth, setApiToken, storeAuth } from './auth.js';

function Shell({ title, subtitle, actions, children }) {
  return (
    <div className="min-h-screen">
      <div className="border-b border-slate-800 bg-slate-950/60 backdrop-blur">
        <div className="mx-auto max-w-6xl px-5 py-5 flex items-center justify-between">
          <div>
            <div className="text-orange-400 font-extrabold tracking-wide">{title}</div>
            <div className="text-slate-400 text-sm">{subtitle}</div>
          </div>
          <div className="flex gap-2">{actions}</div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-5 py-6">{children}</div>
    </div>
  );
}

function AppInner() {
  const navigate = useNavigate();
  const [{ token, user }, setAuth] = useState(() => getStoredAuth());

  useEffect(() => { setApiToken(token); }, [token]);

  const title = 'DisasterShield AI';
  const subtitle = useMemo(() => {
    if (!user) return 'Login to continue';
    return user.role === 'admin' ? 'Admin Dashboard' : 'Worker Dashboard';
  }, [user]);

  const actions = user ? (
    <>
      <div className="hidden sm:flex items-center text-sm text-slate-300 mr-2">
        {user.email} ({user.role})
      </div>
      <button
        className="btn-ghost"
        onClick={() => {
          clearAuth();
          setAuth({ token: null, user: null });
          setApiToken(null);
          navigate('/login');
        }}
      >
        Logout
      </button>
    </>
  ) : null;

  const requireAuth = (role, element) => {
    if (!token || !user) return <Navigate to="/login" replace />;
    if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/worker'} replace />;
    return element;
  };

  return (
    <Shell title={title} subtitle={subtitle} actions={actions}>
      <Routes>
        <Route path="/" element={<Navigate to={user?.role === 'admin' ? '/admin' : '/worker'} replace />} />
        <Route
          path="/login"
          element={<LoginPage onAuth={(a) => { storeAuth(a); setApiToken(a.token); setAuth(a); navigate(a.user.role === 'admin' ? '/admin' : '/worker'); }} />}
        />
        <Route
          path="/register"
          element={<RegisterPage onAuth={(a) => { storeAuth(a); setApiToken(a.token); setAuth(a); navigate('/worker'); }} />}
        />
        <Route path="/worker" element={requireAuth('user', <WorkerDashboard user={user} />)} />
        <Route path="/admin" element={requireAuth('admin', <AdminDashboard user={user} />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}

