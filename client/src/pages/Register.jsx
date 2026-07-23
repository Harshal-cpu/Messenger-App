import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/app');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bgLight dark:bg-app-bg px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-6 inline-block text-sm text-ink-muted hover:text-accent">
          ← Back to home
        </Link>
        <h1 className="font-display text-3xl font-extrabold text-center mb-1">Messenger</h1>
        <p className="text-center text-sm text-ink-muted mb-8">Create your account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-app-borderLight dark:border-app-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-accent"
              placeholder="Jane Doe"
            />
          </div>
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
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-app-borderLight dark:border-app-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-accent"
              placeholder="At least 8 characters, with a number"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-accent py-2.5 font-medium text-app-bg hover:bg-accent-dark disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
