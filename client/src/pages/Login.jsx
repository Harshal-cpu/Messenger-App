import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const { login } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/app');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bgLight dark:bg-app-bg px-4">
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5"
      >
        {dark ? '☀️' : '🌙'}
      </button>

      <div className="w-full max-w-sm">
        <Link to="/" className="mb-6 inline-block text-sm text-ink-muted hover:text-accent">
          ← Back to home
        </Link>
        <h1 className="font-display text-3xl font-extrabold text-center mb-1">Messenger</h1>
        <p className="text-center text-sm text-ink-muted mb-8">Welcome back — sign in to continue</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-app-borderLight dark:border-app-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-accent"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <div className="flex justify-between">
              <label className="text-sm font-medium">Password</label>
              <Link to="/forgot-password" className="text-xs text-accent hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-app-borderLight dark:border-app-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-accent"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-accent py-2.5 font-medium text-app-bg hover:bg-accent-dark disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Don't have an account?{' '}
          <Link to="/register" className="text-accent hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
