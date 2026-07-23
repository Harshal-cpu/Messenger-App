import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api, { setAccessToken } from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.patch(`/auth/reset-password/${token}`, { password });
      setAccessToken(data.accessToken);
      setUser(data.data.user);
      navigate('/app');
    } catch (err) {
      setError(err.response?.data?.message || 'Reset link is invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bgLight dark:bg-app-bg px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-extrabold text-center mb-8">Set a new password</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-app-borderLight dark:border-app-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-accent"
            placeholder="New password (min. 8 characters)"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-accent py-2.5 font-medium text-app-bg hover:bg-accent-dark disabled:opacity-50"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          <Link to="/login" className="text-accent hover:underline font-medium">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
