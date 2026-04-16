import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Activity, MapPin, Search, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function CityPulseWidget() {
  const [cityInput, setCityInput] = useState('');
  const [pulseData, setPulseData] = useState(null);
  const [pulseLoading, setPulseLoading] = useState(false);
  const [pulseError, setPulseError] = useState('');

  const fetchCityPulse = async () => {
    if (!cityInput.trim()) return;
    setPulseLoading(true);
    setPulseError('');
    setPulseData(null);

    try {
      // Connects safely avoiding hardcoded localhost blocking on external networks/Render deploy
      const AI_URL = import.meta.env.VITE_AI_URL || "http://127.0.0.1:9000";
      const response = await axios.post(`${AI_URL}/city-pulse`, {
        city: cityInput
      });
      setPulseData(response.data);
    } catch (err) {
      setPulseError(err.response?.data?.detail || err.message || 'Failed to fetch City Pulse score.');
    } finally {
      setPulseLoading(false);
    }
  };

  const statusColor = (status) => {
    if (status === 'Good') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 text-glow-green';
    if (status === 'Moderate') return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    return 'text-red-400 bg-red-500/10 border-red-500/30 text-glow-red';
  };

  return (
    <div className="glass-card p-6 md:p-10 flex flex-col gap-6 relative overflow-hidden w-full mx-auto border-t-4 border-sky-500 mt-8 mb-4 shadow-[0_0_40px_rgba(37,99,235,0.1)]">
      <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-[80px] -z-10 pointer-events-none" />
      
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <Activity className="text-sky-400 w-8 h-8" />
        <h3 className="text-2xl font-black text-white text-glow-blue">City Pulse Score</h3>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <MapPin className="absolute left-4 top-3.5 w-5 h-5 text-sky-500" />
          <input 
            className="input pl-12 font-bold text-lg w-full bg-black/40 border-white/10 focus:border-sky-500/50 transition-colors" 
            placeholder="Enter city name or region..." 
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchCityPulse()}
          />
        </div>
        <button 
          className="btn-primary py-4 px-8 tracking-widest text-sm font-bold flex items-center gap-2 whitespace-nowrap !bg-sky-600 hover:!bg-sky-500 disabled:opacity-50"
          onClick={fetchCityPulse}
          disabled={pulseLoading}
        >
          {pulseLoading ? (
             <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
             <Search className="w-5 h-5" />
          )}
          GET PULSE
        </button>
      </div>

      {pulseError && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-red-900/30 border border-red-500/40 rounded-xl flex items-center gap-3 text-red-200 shadow-inner">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{pulseError}</span>
        </motion.div>
      )}

      {pulseData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-5 gap-6 bg-black/40 p-6 sm:p-8 rounded-2xl border border-white/5 shadow-inner">
          
          <div className="flex flex-col items-center justify-center p-4 md:col-span-2 md:border-r border-white/10">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Health Score</div>
            <div className={`text-7xl font-black ${statusColor(pulseData.status).split(' ')[0]}`}>
              {pulseData.score}
            </div>
            <div className={`mt-5 px-6 py-1.5 rounded-xl border text-sm font-black uppercase tracking-wider ${statusColor(pulseData.status)}`}>
              {pulseData.status}
            </div>
          </div>
          
          <div className="flex flex-col justify-center gap-6 md:col-span-3">
            <div>
              <div className="text-[11px] font-bold uppercase text-slate-500 mb-3 tracking-widest flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400" /> Analytical Insights
              </div>
              <ul className="space-y-2 list-none">
                {pulseData.insights?.map((item, i) => (
                  <li key={i} className="text-sm font-medium text-slate-300 flex items-start gap-3 bg-white/5 p-2 rounded-lg">
                     <span className="text-sky-500 font-bold">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <div className="text-[11px] font-bold uppercase text-slate-500 mb-3 tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-400" /> Recommendations
              </div>
              <ul className="space-y-2 list-none">
                {pulseData.recommendations?.map((item, i) => (
                  <li key={i} className="text-sm font-medium text-slate-300 flex items-start gap-3 bg-white/5 p-2 rounded-lg">
                    <span className="text-orange-500 font-bold">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </motion.div>
      )}
    </div>
  );
}
