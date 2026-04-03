import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { WorkerDashboard } from './pages/WorkerDashboard.jsx';
import { AdminDashboard } from './pages/AdminDashboard.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { clearAuth, getStoredAuth, setApiToken, storeAuth } from './auth.js';

function Shell({ title, subtitle, actions, navLinks, children }) {
  return (
    <div className="min-h-screen flex flex-col relative z-20">
      <nav className="border-b border-white/5 bg-black/20 backdrop-blur-2xl sticky top-0 z-50">
        <div className="mx-auto max-w-[1400px] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600/10 p-2.5 rounded-xl text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <div className="text-white font-extrabold text-xl tracking-tight leading-none text-glow-blue">{title}</div>
              <div className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mt-1">{subtitle}</div>
            </div>
          </div>
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
      <main className="flex-1 mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}

function AppInner() {
  const navigate = useNavigate();
  const [{ token, user }, setAuth] = useState(() => getStoredAuth());

  useEffect(() => { setApiToken(token); }, [token]);

  const title = 'DisasterShield AI';
  const subtitle = useMemo(() => {
    if (!user) return 'SECURE AUTHENTICATION';
    return user.role === 'admin' ? 'SYSTEM ADMINISTRATOR' : 'PREMIUM COVERAGE';
  }, [user]);

  const navLinks = user && user.role === 'user' ? (
    <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-400">
      <div 
        className={`cursor-pointer transition-colors ${window.location.pathname === '/worker' ? 'text-blue-400 text-glow-blue relative' : 'hover:text-white hover:text-glow-blue'}`} 
        onClick={() => navigate('/worker')}
      >
        Dashboard
        {window.location.pathname === '/worker' && <div className="absolute -bottom-[22px] left-0 w-full h-[2px] bg-blue-500 shadow-[0_0_10px_rgba(37,99,235,1)]"></div>}
      </div>
      <div 
        className={`cursor-pointer transition-colors ${window.location.pathname === '/claims' ? 'text-blue-400 text-glow-blue relative' : 'hover:text-white hover:text-glow-blue'}`} 
        onClick={() => navigate('/claims')}
      >
        Claims
        {window.location.pathname === '/claims' && <div className="absolute -bottom-[22px] left-0 w-full h-[2px] bg-blue-500 shadow-[0_0_10px_rgba(37,99,235,1)]"></div>}
      </div>
      <div 
        className={`cursor-pointer transition-colors ${window.location.pathname === '/analytics' ? 'text-blue-400 text-glow-blue relative' : 'hover:text-white hover:text-glow-blue'}`} 
        onClick={() => navigate('/analytics')}
      >
        Analytics
        {window.location.pathname === '/analytics' && <div className="absolute -bottom-[22px] left-0 w-full h-[2px] bg-blue-500 shadow-[0_0_10px_rgba(37,99,235,1)]"></div>}
      </div>
      <div className="hover:text-white cursor-pointer transition-colors hover:text-glow-blue" onClick={() => alert('Settings module coming soon.')}>Settings</div>
    </div>
  ) : null;

  const actions = user ? (
    <>
      <div className="hidden sm:flex items-center text-sm font-bold text-slate-300 bg-white/5 backdrop-blur-lg px-4 py-2 rounded-xl border border-white/10 shadow-inner">
        <span className="font-bold text-white mr-2">{user.email}</span> 
        <span className="text-[10px] uppercase bg-blue-600/20 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md tracking-wider shadow-[0_0_10px_rgba(37,99,235,0.2)]">{user.role}</span>
      </div>
      <button
        className="btn-ghost !py-1.5 !px-3 !text-sm"
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
    <Shell title={title} subtitle={subtitle} actions={actions} navLinks={navLinks}>
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
        <Route path="/worker" element={requireAuth('user', <WorkerDashboard user={user} tab="dashboard" />)} />
        <Route path="/claims" element={requireAuth('user', <WorkerDashboard user={user} tab="claims" />)} />
        <Route path="/analytics" element={requireAuth('user', <WorkerDashboard user={user} tab="analytics" />)} />
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

