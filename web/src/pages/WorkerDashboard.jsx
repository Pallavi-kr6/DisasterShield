import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, toDisplayError } from '../api.js';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import {
  CloudRain, Wind, Thermometer, MapPin, AlertTriangle, ShieldCheck,
  Activity, Shield, Info, DollarSign, Rocket, CheckCircle2, XCircle, Search
} from 'lucide-react';
import PayoutAnimation from '../components/PayoutAnimation';
import Heatmap from '../components/Heatmap';
import CityPulseWidget from '../components/CityPulseWidget';

const platformOptions = [
  { value: 'ZOMATO_SWIGGY', label: 'Zomato / Swiggy', base: 35 },
  { value: 'ZEPTO_BLINKIT', label: 'Zepto / Blinkit', base: 30 },
  { value: 'AMAZON_FLIPKART', label: 'Amazon / Flipkart', base: 40 },
];

const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const scaleIn = { hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1, transition: { duration: 0.4 } } };

export function WorkerDashboard({ user, tab = 'dashboard' }) {
  const [step, setStep] = useState(tab === 'dashboard' ? 'LOCATING' : 'TAB_VIEW');
  const [form, setForm] = useState({ city: 'Mumbai', expected_income: 5000, platform: 'ZOMATO_SWIGGY', coverage_pct: 0.7, fraud_history: 'NONE' });
  const [ai, setAi] = useState(null);
  const [premium, setPremium] = useState(null);
  const [eventResult, setEventResult] = useState(null);
  const [history, setHistory] = useState({ claims: [], transactions: [] });
  const [error, setError] = useState('');
  const [geo, setGeo] = useState({ lat: null, lon: null, status: 'idle' });
  const [payoutData, setPayoutData] = useState({ amount: 0, mode: '', show: false });
  
  // TOAST NOTIFICATION STATE
  const [monitorToast, setMonitorToast] = useState(null);
  const [lastLogId, setLastLogId] = useState(null);

  const savingsData = useMemo(() => {
    const predictedLoss = Number(ai?.predicted_loss || 0);
    const payout = Number(ai?.payout_amount || 0);
    const premiumWeekly = Number(premium?.weekly_premium || 0);
    const netSaved = Math.max(0, payout - premiumWeekly);
    return [
      { name: 'Income Drop', value: predictedLoss },
      { name: 'Net Out-of-pocket', value: Math.max(0, predictedLoss - payout + premiumWeekly) },
      { name: 'Saved', value: netSaved },
    ];
  }, [ai, premium]);

  async function fetchHistory() {
    try {
      const me = await api.get('/api/auth/me');
      const userId = me.data?.user?.sub;
      if (!userId) return;
      const [c, t] = await Promise.all([
        api.get(`/api/claims/${userId}`),
        api.get(`/api/transactions/${userId}`),
      ]);
      setHistory({ claims: c.data?.claims || [], transactions: t.data?.transactions || [] });
    } catch (e) { }
  }

  useEffect(() => {
    fetchHistory();
    
    // Polling background automatic monitor status
    const pollInterval = setInterval(async () => {
      try {
        const r = await api.get('/api/monitor-status');
        const log = r.data?.log;
        // If we found a newest log and we haven't shown it yet
        if (log && log.id !== lastLogId) {
           setLastLogId(log.id);
           // Only show toast if it's not the absolute first fetch on page load
           // or if it's less than 30s old to prevent stale popups right on refresh
           if (Date.now() - log.time < 30000) {
             setMonitorToast(log.message);
             setTimeout(() => setMonitorToast(null), 8000); // Hide after 8s
           }
        }
      } catch (e) {}
    }, 5000); // Check every 5 seconds for immediate demo feedback!
    
    return () => clearInterval(pollInterval);
  }, [tab, lastLogId]);

  useEffect(() => {
    if (tab !== 'dashboard' || geo.status !== 'idle') return;

    if (!navigator.geolocation) {
      setGeo({ status: 'unavailable' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGeo({ lat: pos.coords.latitude, lon: pos.coords.longitude, status: 'ok' });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          const data = await res.json();
          const cityName = data.address?.city || data.address?.town || data.address?.state || 'Mumbai';
          setForm(f => ({ ...f, city: cityName }));
        } catch (e) { }
        setTimeout(() => setStep('INPUTS'), 2000);
      },
      () => {
        setGeo((g) => ({ ...g, status: 'denied' }));
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, [tab, geo.status]);

  async function runAnalyze() {
    setStep('ANALYZING');
    setError('');
    setEventResult(null);
    try {
      const r = await api.post('/api/analyze', { city: form.city, lat: geo.lat, lon: geo.lon, expected_income: Number(form.expected_income) });
      setAi(r.data);
      if (r.data.detected_city) setForm(f => ({ ...f, city: r.data.detected_city }));

      const p = await api.post('/api/premium', { platform: form.platform, city: form.city, coverage_pct: Number(form.coverage_pct), risk_level: r.data.risk_level, trigger_rate: 0.3, fraud_history: form.fraud_history });
      setPremium(p.data);
      await fetchHistory();

      setTimeout(() => setStep('DASHBOARD'), 2000);
    } catch (e) {
      setError(toDisplayError(e?.response?.data?.detail || e?.response?.data?.error || e?.message));
      setStep('INPUTS');
    }
  }

  async function triggerDisaster() {
    setStep('TRIGGERING');
    setError('');
    try {
      const r = await api.post('/api/trigger', { city: form.city, platform: form.platform, expected_income: Number(form.expected_income) });
      setEventResult(r.data);
      setAi(prev => ({ ...r.data.ai, weather: r.data.ai.weather || prev?.weather }));
      await fetchHistory();
      setTimeout(() => {
         setStep('RESULT');
         if (r.data.payout && r.data.payout.status === 'processed') {
            setPayoutData({ amount: r.data.payout.amount, mode: r.data.payout.mode, show: true });
            setTimeout(() => setPayoutData(p => ({ ...p, show: false })), 3500);
         }
      }, 2500);
    } catch (e) {
      setError(toDisplayError(e?.response?.data?.detail || e?.message));
      setStep('DASHBOARD');
    }
  }

  // --- TAB: CLAIMS ---
  if (tab === 'claims') {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl mx-auto py-10">
        <h1 className="text-3xl font-black text-white text-glow-blue flex items-center gap-3 mb-8"><Activity className="text-blue-500 w-8 h-8" /> Claims History Timeline</h1>
        <div className="glass-card p-10">
          <div className="space-y-6">
            {history.claims.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-black/40 p-6 rounded-2xl border border-white/5 hover:bg-black/60 transition-all hover:border-white/10 hover:shadow-[0_0_20px_rgba(37,99,235,0.1)]">
                <div className="flex items-center gap-5">
                  <div className={`p-4 rounded-xl shadow-[0_0_15px_currentColor] ${c.decision === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                    {c.decision === 'APPROVED' ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="text-slate-400 font-mono text-sm mb-1">{String(c.timestamp || c.created_at || '').slice(0, 10).replace(/-/g, '.')}</div>
                    <div className="text-white font-bold text-lg">{c.decision === 'APPROVED' ? 'Payout Dispatched' : 'Claim Rejected'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-8 bg-slate-900/50 p-4 rounded-xl border border-white/5 w-full md:w-auto overflow-x-auto">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Risk Assessed</div>
                    <div className={`font-black ${c.risk_level === 'HIGH' ? 'text-red-400' : 'text-blue-400'}`}>{c.risk_level}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">AI Trust Score</div>
                    <div className="text-blue-400 font-bold">{c.trust_score ? (Number(c.trust_score) * 100).toFixed(0) + '%' : 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Settled Amount</div>
                    <div className={`font-black text-xl ${c.decision === 'APPROVED' ? 'text-emerald-400 text-glow-green' : 'text-slate-500'}`}>₹ {c.final_payout}</div>
                  </div>
                </div>
              </motion.div>
            ))}
            {history.claims.length === 0 && (
              <div className="py-20 text-center font-mono text-slate-500 border border-dashed border-white/10 rounded-2xl flex flex-col items-center gap-4">
                <Search className="w-12 h-12 text-slate-600 mb-2" />
                NO SECURE RECORDS FOUND IN HISTORY OVERVIEW
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // --- TAB: ANALYTICS ---
  if (tab === 'analytics') {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl mx-auto py-10">
        <h1 className="text-3xl font-black text-white text-glow-blue flex items-center gap-4 mb-8"><DollarSign className="text-emerald-400 w-8 h-8" /> Economic Forecast</h1>
        {ai && premium ? (
          <div className="glass-card p-10 h-[500px] flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
            <h3 className="text-xl font-bold border-b border-white/10 pb-4 mb-8 text-white">Live Savings Projection Matrix</h3>
            <div className="flex-1 w-full h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={savingsData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600, fontFamily: 'Space Grotesk' }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} dx={-10} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    contentStyle={{ backgroundColor: '#2a61e0ff', border: '1px solid rgba(4, 114, 240, 0.88)', borderRadius: '16px', color: '#fff', boxShadow: '0 10px 40px rgba(0,0,0,0.8)', padding: '16px' }}
                    formatter={(value) => [`₹${Math.round(value)}`, 'Metric']}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={100} animationDuration={1500} animationBegin={200}>
                    {savingsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={
                        entry.name === 'Income Drop' ? '#ef4444' :
                          entry.name === 'Net Out-of-pocket' ? '#3b82f6' : '#10b981'
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 pt-6 border-t border-white/10 text-center">
              <p className="text-slate-400 font-medium">By maintaining maximum coverage, you are protecting against <span className="font-bold text-red-400">₹{Math.round(ai.predicted_loss)}</span> in sudden climate variance dropouts.</p>
            </div>
          </div>
        ) : (
          <div className="glass-card p-24 text-center text-slate-500 border-dashed border-2 flex flex-col items-center shadow-inner">
            <Search className="w-20 h-20 text-blue-500/50 mb-6" />
            <h2 className="text-2xl font-bold text-white mb-3">No Active Projection Running</h2>
            <p className="text-sm max-w-md mx-auto leading-relaxed">Run a core AI risk assessment engine calculation from your main Dashboard to populate the economic savings forecast structure.</p>
          </div>
        )}
      </motion.div>
    );
  }

  // --- TAB: DASHBOARD (MAIN) ---
  return (
    <div className="w-full flex justify-center items-center relative overflow-hidden" style={{ minHeight: 'calc(100vh - 120px)' }}>
      <AnimatePresence mode="wait">

        {step === 'LOCATING' && (
          <motion.div key="locating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center justify-center p-10">
            {geo.status === 'denied' || geo.status === 'unavailable' ? (
              <div className="bg-red-900/40 border border-red-500/40 p-8 rounded-2xl max-w-md text-center shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-3 text-glow-red">GPS Access Required</h3>
                <p className="text-red-200 mb-8 text-sm leading-relaxed">DisasterShield AI requires location services to accurately assess localized weather risks and income impact. Please allow location access to continue.</p>
                <button className="btn-danger w-full py-4 uppercase font-bold tracking-widest text-sm" onClick={() => window.location.reload()}>Enable GPS & Try Again</button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <motion.div animate={{ scale: [1, 2.5, 4], opacity: [0.8, 0, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-0 bg-blue-500 rounded-full" />
                  <div className="bg-slate-900 border border-blue-500/30 p-6 rounded-full relative z-10 shadow-[0_0_30px_rgba(37,99,235,0.4)]">
                    <MapPin className="w-12 h-12 text-blue-400" />
                  </div>
                </div>
                <motion.h2 animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }} className="mt-8 text-2xl font-bold tracking-widest text-blue-300 text-glow-blue">
                  UPLINKING TO GPS
                </motion.h2>
                <p className="mt-3 text-slate-500 text-sm tracking-widest uppercase font-semibold">Detecting risk zone via satellite</p>
              </>
            )}
          </motion.div>
        )}

        {step === 'INPUTS' && (
          <motion.div key="inputs" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="w-full max-w-xl glass-card relative overflow-hidden p-8 sm:p-12">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px] -z-10 pointer-events-none" />
            <h2 className="text-3xl font-extrabold text-white mb-2 text-glow-blue flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-blue-400" /> Secure Your Income
            </h2>
            <p className="text-slate-400 mb-8 font-medium">Configure your protection parameters before running the AI risk assessment engine.</p>
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex justify-between">
                  <span>Detected Location</span>
                  <span className="text-blue-400 font-semibold">{geo.status === 'ok' ? 'GPS SAT-LINKED' : 'UNVERIFIED'}</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-3.5 w-5 h-5 text-blue-500" />
                  <input className="input pl-12 font-bold text-lg" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex justify-between">
                  <span>Expected Weekly Income</span>
                  <span className="text-emerald-400 block font-mono text-glow-green">₹ {form.expected_income}</span>
                </label>
                <input type="range" min="1000" max="25000" step="500" className="w-full accent-blue-500 cursor-pointer mb-2" value={form.expected_income} onChange={(e) => setForm({ ...form, expected_income: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">Working Platform</label>
                <select className="input appearance-none bg-[#0a0f1a] font-semibold text-blue-300 border-white/20" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                  {platformOptions.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-red-900/40 border border-red-500/40 rounded-xl flex items-center gap-3 text-red-200"><AlertTriangle className="shrink-0" />{error}</motion.div>}
              <button className="btn-primary w-full py-4 text-sm mt-4 hover:shadow-[0_0_40px_rgba(37,99,235,0.8)]" onClick={runAnalyze}>
                <Activity className="w-5 h-5" /> INITIALIZE AI RISK ANALYSIS
              </button>
            </div>
          </motion.div>
        )}

        {step === 'ANALYZING' && (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-20">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }} className="absolute inset-0 rounded-full border-t-4 border-l-4 border-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.8)]" />
              <motion.div animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 8, ease: "linear" }} className="absolute inset-2 rounded-full border-b-4 border-r-4 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.8)]" />
              <Search className="w-10 h-10 text-white animate-pulse" />
            </div>
            <motion.h2 animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }} className="mt-8 text-2xl font-black tracking-widest text-white text-glow-blue">
              NEURAL ENGINE ACTIVE
            </motion.h2>
            <p className="mt-2 text-slate-400 font-mono tracking-wider">Processing climate & fraud indices...</p>
          </motion.div>
        )}

        {step === 'DASHBOARD' && (
          <motion.div key="dashboard" variants={staggerContainer} initial="hidden" animate="show" exit={{ opacity: 0 }} className="w-full flex flex-col gap-8 max-w-[1400px]">
            <motion.div variants={fadeUp} className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-6 glass-card p-6 border-b-4 border-blue-500">
              <div>
                <h1 className="text-3xl font-black text-white text-glow-blue flex items-center gap-3"><Shield className="text-blue-500" /> Security Intelligence</h1>
                <p className="text-slate-400 text-sm font-semibold tracking-wider uppercase mt-1">Live Zone: <span className="text-white">{ai?.detected_city || form.city}</span></p>
              </div>
              <div className="flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-white/10 shadow-inner">
                <div className="flex flex-col items-center px-4 border-r border-white/10">
                  <CloudRain className="w-5 h-5 text-blue-400 mb-1" />
                  <span className="font-bold text-white text-lg">{ai?.weather?.rainfall || 0}</span>
                </div>
                <div className="flex flex-col items-center px-4 border-r border-white/10">
                  <Thermometer className="w-5 h-5 text-orange-400 mb-1" />
                  <span className="font-bold text-white text-lg">{ai?.weather?.temperature || 0}°</span>
                </div>
                <div className="flex flex-col items-center px-4">
                  <Wind className="w-5 h-5 text-emerald-400 mb-1" />
                  <span className="font-bold text-white text-lg">{ai?.weather?.aqi || 0}</span>
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div variants={scaleIn} className="glass-card flex items-center gap-5 p-6 relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-full h-full bg-gradient-to-bl opacity-10 ${ai?.risk_level === 'HIGH' ? 'from-red-500' : 'from-blue-500'}`} />
                <div className={`p-4 rounded-2xl ${ai?.risk_level === 'HIGH' ? 'bg-red-500/20 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'bg-blue-500/20 text-blue-400'}`}>
                  <Activity className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Grid Risk Level</div>
                  <div className={`text-3xl font-black tracking-tighter ${ai?.risk_level === 'HIGH' ? 'text-red-400 text-glow-red' : 'text-blue-400 text-glow-blue'}`}>{ai?.risk_level || 'N/A'}</div>
                </div>
              </motion.div>

              <motion.div variants={scaleIn} className="glass-card flex items-center gap-5 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-emerald-500 opacity-10" />
                <div className="p-4 rounded-2xl bg-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Premium Rate</div>
                  <div className="text-3xl font-black tracking-tighter text-emerald-400 text-glow-green">₹ {premium?.weekly_premium || 0}</div>
                </div>
              </motion.div>

              <motion.div variants={scaleIn} className="glass-card flex items-center gap-5 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-orange-500 opacity-10" />
                <div className="p-4 rounded-2xl bg-orange-500/20 text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.3)]">
                  <DollarSign className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">AI Payout Cap</div>
                  <div className="text-3xl font-black tracking-tighter text-orange-400">₹ {Math.round(ai?.payout_amount) || 0}</div>
                </div>
              </motion.div>
            </div>

            <motion.div variants={fadeUp} className="glass-card p-8 flex flex-col justify-between max-w-4xl mx-auto w-full">
              <h3 className="text-xl font-bold flex items-center gap-3 border-b border-white/10 pb-4 mb-6">
                <Info className="text-blue-400" /> Core Engine Verdict
              </h3>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                    <div className="text-[10px] font-bold uppercase text-slate-500 mb-1 tracking-widest">Model Decision</div>
                    {ai?.decision === 'APPROVED' ? (
                      <div className="text-emerald-400 font-bold bg-emerald-500/10 inline-block px-3 py-1 rounded-lg border border-emerald-500/30 text-glow-green">APPROVED</div>
                    ) : (
                      <div className="text-slate-300 font-bold text-lg">{ai?.decision || 'STANDBY'}</div>
                    )}
                  </div>
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5 relative overflow-hidden">
                    <div className="text-[10px] font-bold uppercase text-slate-500 mb-1 tracking-widest">Trust Integrity</div>
                    <div className="text-white font-bold text-xl">{ai?.trust_score != null ? Math.round(ai.trust_score * 100) : 0}%</div>
                    {ai?.trust_score && <div className="absolute bottom-0 left-0 h-1 bg-blue-500" style={{ width: `${ai.trust_score * 100}%` }} />}
                  </div>
                </div>
                {ai?.fraud_signals && Object.keys(ai.fraud_signals).length > 0 && (
                  <div className="border border-red-500/20 bg-red-900/20 p-4 rounded-xl relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-red-500 blur-[80px] opacity-30 pointer-events-none" />
                    <h4 className="text-sm font-bold text-red-400 flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4" /> Signal Penalties</h4>
                    <div className="space-y-2 text-xs text-red-200/80 font-mono">
                      {ai.fraud_signals.location_mismatch && <div>&gt; GEO_MISMATCH : +0.4 PENALTY</div>}
                      {ai.fraud_signals.repeat_fraud && <div>&gt; REPEAT_OFFENDER : +0.3 PENALTY</div>}
                      {ai.fraud_signals.rapid_claims && <div>&gt; RAPID_FIRE_CLAIMS : +0.2 PENALTY</div>}
                      {Object.entries(ai.fraud_signals).filter(([k, v]) => v === true && !k.endsWith('_penalty')).length === 0 && (
                        <span className="text-emerald-400 flex items-center gap-2">&gt; ZERO ANOMALIES DETECTED</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-8 pt-6 border-t border-white/10 text-center">
                <p className="text-sm text-slate-400 mb-6 font-medium">To view comprehensive economic forecasts or historical logs, use the Analytics and Claims tabs above.</p>
                <button className="btn-danger w-full max-w-sm mx-auto py-4 text-sm font-black tracking-widest shadow-[0_0_30px_rgba(239,68,68,0.5)]" onClick={triggerDisaster}>
                  <Rocket className="w-5 h-5" /> SIMULATE DISASTER EVENT
                </button>
              </div>
            </motion.div>
            
            <motion.div variants={fadeUp} className="w-full max-w-4xl mx-auto mb-10">
              <Heatmap claims={history.claims} />
            </motion.div>

            <motion.div variants={fadeUp} className="w-full max-w-4xl mx-auto mb-10">
              <CityPulseWidget />
            </motion.div>

          </motion.div>
        )}

        {step === 'TRIGGERING' && (
          <motion.div key="triggering" className="flex flex-col items-center justify-center p-20 z-50">
            <motion.div initial={{ y: 200, opacity: 0, scale: 0.5 }} animate={{ y: -500, opacity: [0, 1, 1, 0], scale: 2 }} transition={{ duration: 1.5, ease: "anticipate" }} className="text-orange-500 text-glow-red">
              <Rocket className="w-32 h-32" />
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.2, repeat: 5 }} className="fixed inset-0 bg-red-500/10 pointer-events-none" />
            <motion.h2 animate={{ opacity: 1 }} className="absolute bottom-20 text-3xl font-black text-red-500 tracking-widest text-glow-red">
              CRITICAL INCIDENT SIMULATED
            </motion.h2>
          </motion.div>
        )}

        {step === 'RESULT' && (
          <motion.div key="result" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-12 max-w-2xl w-full text-center relative overflow-hidden">
            {eventResult?.approved ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/40 to-transparent pointer-events-none" />
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: [0, 10, 0] }} transition={{ type: 'spring', bounce: 0.5 }} className="inline-block p-6 rounded-full bg-emerald-500/20 text-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.5)] mb-8">
                  <CheckCircle2 className="w-24 h-24" />
                </motion.div>
                <h2 className="text-4xl font-black text-white text-glow-green mb-4">PAYOUT APPROVED</h2>
                <p className="text-slate-300 text-lg mb-8">System verified anomaly. Funds transferred.</p>
                <div className="bg-black/50 border border-white/10 rounded-2xl p-6 font-mono text-sm text-left mx-auto max-w-md">
                  <div className="flex justify-between mb-3"><span className="text-slate-500">Transaction ID:</span> <span className="text-blue-400">TX-{Date.now().toString().slice(-8)}</span></div>
                  <div className="flex justify-between mb-3"><span className="text-slate-500">Settled Amount:</span> <span className="text-emerald-400 font-bold text-lg">₹ {ai?.final_payout}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Dest Account:</span> <span className="text-white">A/C ending in 4022</span></div>
                </div>
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-red-900/40 to-transparent pointer-events-none" />
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="inline-block p-6 rounded-full bg-red-500/20 text-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)] mb-8">
                  <XCircle className="w-24 h-24" />
                </motion.div>
                <h2 className="text-4xl font-black text-white text-glow-red mb-4">CLAIM REJECTED</h2>
                <p className="text-slate-300 text-lg mb-8">{ai?.reason || "Irregular pattern flagged."}</p>
              </>
            )}
            <button className="btn-ghost mt-10 px-8 py-4" onClick={() => setStep('DASHBOARD')}>RETURN TO DASHBOARD</button>
          </motion.div>
        )}

      </AnimatePresence>

      <AnimatePresence>
        {monitorToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-10 right-6 sm:right-10 bg-black/80 backdrop-blur-3xl border border-blue-500/40 p-5 rounded-2xl shadow-[0_10px_50px_rgba(37,99,235,0.4)] z-[100] max-w-sm flex items-start gap-4 border-l-4 border-l-blue-500"
          >
            <div className="bg-blue-600/20 p-3 rounded-full text-blue-400 shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.3)]">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-black uppercase tracking-widest text-blue-300 mb-1 leading-tight text-glow-blue">Automated AI Monitor</h4>
              <p className="text-slate-200 text-sm font-medium leading-snug">{monitorToast}</p>
            </div>
            <button onClick={() => setMonitorToast(null)} className="text-slate-500 hover:text-white transition-colors shrink-0">
              <XCircle className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <PayoutAnimation 
        show={payoutData.show} 
        amount={payoutData.amount} 
        mode={payoutData.mode} 
      />
    </div>
  );
}
