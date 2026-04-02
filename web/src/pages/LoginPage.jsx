import { useState } from 'react';
import { Link } from 'react-router-dom';
import { login } from '../auth.js';
import { toDisplayError } from '../api.js';

export function LoginPage({ onAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await login(email, password);
      onAuth({ token: data.token, user: data.user });
    } catch (err) {
      setError(toDisplayError(err?.response?.data?.detail || err?.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto card">
      <div className="text-xl font-extrabold">Login</div>
      <div className="text-slate-400 text-sm mt-1">User and Admin accounts supported.</div>

      {error ? <div className="mt-3 rounded-lg border border-red-700 bg-red-950/40 p-3 text-red-200 text-sm">{error}</div> : null}

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <div>
          <div className="label mb-1">Email</div>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="label mb-1">Password</div>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Login'}
        </button>
      </form>

      <div className="text-sm text-slate-400 mt-4">
        New user? <Link className="text-orange-300 hover:underline" to="/register">Create account</Link>
      </div>
    </div>
  );
}

