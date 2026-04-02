import { useState } from 'react';
import { Link } from 'react-router-dom';
import { register } from '../auth.js';
import { toDisplayError } from '../api.js';

export function RegisterPage({ onAuth }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    city: 'Mumbai',
    platform: 'ZOMATO_SWIGGY',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await register(form);
      onAuth({ token: data.token, user: data.user });
    } catch (err) {
      setError(toDisplayError(err?.response?.data?.detail || err?.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto card">
      <div className="text-xl font-extrabold">Register</div>
      <div className="text-slate-400 text-sm mt-1">Creates a delivery partner account (role: user).</div>

      {error ? <div className="mt-3 rounded-lg border border-red-700 bg-red-950/40 p-3 text-red-200 text-sm">{error}</div> : null}

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <div>
          <div className="label mb-1">Name</div>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <div className="label mb-1">Email</div>
          <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <div className="label mb-1">Password</div>
          <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="label mb-1">City</div>
            <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <div className="label mb-1">Platform</div>
            <select className="input" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
              <option value="ZOMATO_SWIGGY">Zomato / Swiggy</option>
              <option value="ZEPTO_BLINKIT">Zepto / Blinkit</option>
              <option value="AMAZON_FLIPKART">Amazon / Flipkart</option>
            </select>
          </div>
        </div>
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? 'Creating…' : 'Register'}
        </button>
      </form>

      <div className="text-sm text-slate-400 mt-4">
        Already have an account? <Link className="text-orange-300 hover:underline" to="/login">Login</Link>
      </div>
    </div>
  );
}

