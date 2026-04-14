import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

import { WorkerDashboard } from './pages/WorkerDashboard.jsx';
import { AdminDashboard } from './pages/AdminDashboard.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import LandingPage from './pages/LandingPage.jsx';

import { clearAuth, getStoredAuth, setApiToken, storeAuth } from './auth.js';

function Shell({ title, subtitle, actions, navLinks, children }) {
  return (
    <div className="min-h-screen flex flex-col relative z-20">
      <nav className="border-b border-white/5 bg-black/20 backdrop-blur-2xl sticky top-0 z-50">
        <div className="mx-auto max-w-[1400px] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="bg-blue-600/10 p-2.5 rounded-xl text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <div className="text-white font-extrabold text-xl tracking-tight leading-none">{title}</div>
              <div className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mt-1">{subtitle}</div>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-8">
            {navLinks}
            {actions && (
              <div className="flex items-center gap-4 md:border-l border-white/10 md:pl-8">
                {actions}
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}

function AppInner() {
  const navigate = useNavigate();
  const location = useLocation();

  const [{ token, user }, setAuth] = useState(() => getStoredAuth());

  useEffect(() => { setApiToken(token); }, [token]);

  const title = 'DisasterShield AI';

  const subtitle = useMemo(() => {
    if (!user) return 'SECURE AUTHENTICATION';
    return user.role === 'admin' ? 'SYSTEM ADMINISTRATOR' : 'PREMIUM COVERAGE';
  }, [user]);

  // 🔥 IMPORTANT: detect landing page
  const isLandingPage = location.pathname === "/";

  const navLinks = user && user.role === 'user' ? (
    <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-400">
      <div onClick={() => navigate('/worker')} className="cursor-pointer hover:text-white">Dashboard</div>
      <div onClick={() => navigate('/claims')} className="cursor-pointer hover:text-white">Claims</div>
      <div onClick={() => navigate('/analytics')} className="cursor-pointer hover:text-white">Analytics</div>
    </div>
  ) : null;

  const actions = user ? (
    <>
      <div className="hidden sm:flex items-center text-sm text-white">
        {user.email}
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
    if (role && user.role !== role)
      return <Navigate to={user.role === 'admin' ? '/admin' : '/worker'} replace />;
    return element;
  };

  // 🔥 If Landing Page → DO NOT USE SHELL
  if (isLandingPage) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // 🔥 All other pages use Shell
  return (
    <Shell title={title} subtitle={subtitle} actions={actions} navLinks={navLinks}>
      <Routes>

        {/* Landing redirect (optional internal use) */}
        <Route path="/home" element={
          <Navigate to={user?.role === 'admin' ? '/admin' : '/worker'} replace />
        } />

        {/* Auth */}
        <Route
          path="/login"
          element={
            <LoginPage onAuth={(a) => {
              storeAuth(a);
              setApiToken(a.token);
              setAuth(a);
              navigate(a.user.role === 'admin' ? '/admin' : '/worker');
            }} />
          }
        />

        <Route
          path="/register"
          element={
            <RegisterPage onAuth={(a) => {
              storeAuth(a);
              setApiToken(a.token);
              setAuth(a);
              navigate('/worker');
            }} />
          }
        />

        {/* User */}
        <Route path="/worker" element={requireAuth('user', <WorkerDashboard user={user} tab="dashboard" />)} />
        <Route path="/claims" element={requireAuth('user', <WorkerDashboard user={user} tab="claims" />)} />
        <Route path="/analytics" element={requireAuth('user', <WorkerDashboard user={user} tab="analytics" />)} />

        {/* Admin */}
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