import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bgLight dark:bg-app-bg px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-extrabold text-center mb-1">Reset your password</h1>
        <p className="text-center text-sm text-ink-muted mb-8">
          Enter your email and we'll send you a reset link.
        </p>

        {sent ? (
          <div className="rounded-lg bg-accent/10 p-4 text-sm text-center">
            If an account with that email exists, a reset link has been sent. Check your inbox.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-app-borderLight dark:border-app-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-accent"
              placeholder="you@example.com"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-accent py-2.5 font-medium text-app-bg hover:bg-accent-dark disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-ink-muted">
          <Link to="/login" className="text-accent hover:underline font-medium">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
