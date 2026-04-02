import { useEffect, useMemo, useState } from 'react';
import { api, toDisplayError } from '../api.js';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const COLORS = ['#22c55e', '#ef4444', '#f97316', '#3b82f6'];

export function AdminDashboard() {
  const [city, setCity] = useState('Mumbai');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function simulateEvent() {
    setLoading(true);
    setError('');
    try {
      const r = await api.post('/api/trigger', { city, expected_income: 5000 });
      setEvents((prev) => [normalize(r.data), ...prev].slice(0, 25));
    } catch (e) {
      setError(toDisplayError(e?.response?.data?.detail || e?.message));
    } finally {
      setLoading(false);
    }
  }

  // seed 1 event for nicer demo
  useEffect(() => {
    if (events.length === 0) simulateEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const total = events.length;
    const fraud = events.filter((e) => e.ai?.fraud_flagged).length;
    const triggered = events.filter((e) => e.ai?.triggered).length;
    const paid = events.filter((e) => e.approved).reduce((s, e) => s + (e.payout_amount || 0), 0);
    return { total, fraud, triggered, paid };
  }, [events]);

  const pie = useMemo(() => ([
    { name: 'Triggered', value: stats.triggered },
    { name: 'Not Triggered', value: Math.max(0, stats.total - stats.triggered) },
  ]), [stats]);

  const fraudPie = useMemo(() => ([
    { name: 'Fraud Flagged', value: stats.fraud },
    { name: 'Clean', value: Math.max(0, stats.total - stats.fraud) },
  ]), [stats]);

  const cityRisk = useMemo(() => {
    const counts = {};
    for (const e of events) {
      const c = e.event?.city || '—';
      counts[c] = (counts[c] || 0) + (e.ai?.risk_level === 'High' ? 2 : e.ai?.risk_level === 'Medium' ? 1 : 0);
    }
    return Object.entries(counts).map(([cityName, score]) => ({ city: cityName, score }));
  }, [events]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Kpi title="Total Events" value={stats.total} />
        <Kpi title="Triggered" value={stats.triggered} />
        <Kpi title="Fraud Alerts" value={stats.fraud} />
        <Kpi title="Total Payouts" value={`₹${stats.paid.toFixed(0)}`} />
      </div>

      <div className="card flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold tracking-wider text-orange-400 uppercase">Admin Controls</div>
          <div className="text-slate-400 text-sm">Simulate a parametric event and watch fraud + payouts update.</div>
        </div>
        <div className="flex items-center gap-2">
          <input className="input w-44" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
          <button className="btn-primary" disabled={loading} onClick={simulateEvent}>
            {loading ? 'Triggering…' : 'Trigger Event'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-700 bg-red-950/40 p-3 text-red-200 text-sm">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card">
          <div className="text-sm font-bold tracking-wider text-orange-400 uppercase mb-2">Trigger Distribution</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" outerRadius={80} label>
                  {pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1f2937', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="text-sm font-bold tracking-wider text-orange-400 uppercase mb-2">Fraud Alerts</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={fraudPie} dataKey="value" nameKey="name" outerRadius={80} label>
                  {fraudPie.map((_, i) => <Cell key={i} fill={i === 0 ? '#ef4444' : '#22c55e'} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1f2937', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="text-sm font-bold tracking-wider text-orange-400 uppercase mb-2">City Risk Heat (demo)</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cityRisk}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="city" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1f2937', color: '#fff' }} />
                <Bar dataKey="score" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="text-sm font-bold tracking-wider text-orange-400 uppercase mb-3">Recent Trigger Events</div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-400">
              <tr>
                {['City', 'Rain', 'AQI', 'Drop', 'Risk', 'Triggered', 'Fraud', 'Payout', 'Payment'].map((h) => (
                  <th key={h} className="text-left font-semibold py-2 pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((e, idx) => (
                <tr key={idx} className="border-t border-slate-800">
                  <td className="py-2 pr-3">{e.event?.city}</td>
                  <td className="py-2 pr-3">{e.event?.rainfall}</td>
                  <td className="py-2 pr-3">{e.event?.aqi}</td>
                  <td className="py-2 pr-3">{e.event?.delivery_drop}</td>
                  <td className="py-2 pr-3">{e.ai?.risk_level}</td>
                  <td className="py-2 pr-3">{String(e.ai?.triggered)}</td>
                  <td className="py-2 pr-3">{String(e.ai?.fraud_flagged)}</td>
                  <td className="py-2 pr-3">₹{Number(e.payout_amount || 0).toFixed(0)}</td>
                  <td className="py-2 pr-3">{e.payment?.status}</td>
                </tr>
              ))}
              {events.length === 0 ? (
                <tr><td className="py-4 text-slate-400" colSpan={9}>No events yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function normalize(d) {
  return {
    event: d.event,
    ai: d.ai,
    approved: !!d.approved,
    payout_amount: Number(d.payout_amount || 0),
    payment: d.payment,
  };
}

function Kpi({ title, value }) {
  return (
    <div className="card">
      <div className="label">{title}</div>
      <div className="text-2xl font-extrabold mt-1">{value}</div>
    </div>
  );
}

