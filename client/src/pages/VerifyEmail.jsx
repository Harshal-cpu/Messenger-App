import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmail() {
  const { token } = useParams();
  const { user, setUser } = useAuth();
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    api
      .get(`/auth/verify-email/${token}`)
      .then(() => {
        setStatus('success');
        // If this browser happens to be logged in as the same user, reflect
        // the verified state immediately without needing a fresh /me call.
        if (user) setUser((prev) => (prev ? { ...prev, emailVerified: true } : prev));
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification link is invalid or has expired.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bgLight dark:bg-app-bg px-4">
      <div className="w-full max-w-sm text-center">
        {status === 'verifying' && (
          <>
            <div className="mb-4 flex justify-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-accent animate-typingDot" />
              <span className="h-2.5 w-2.5 rounded-full bg-accent animate-typingDot" style={{ animationDelay: '150ms' }} />
              <span className="h-2.5 w-2.5 rounded-full bg-accent animate-typingDot" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-ink-muted">Verifying your email…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <span className="text-4xl">✅</span>
            <h1 className="mt-4 font-display text-2xl font-bold">Email verified!</h1>
            <p className="mt-2 text-sm text-ink-muted">Your email address has been confirmed.</p>
            <Link
              to={user ? '/app' : '/login'}
              className="mt-6 inline-block rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-app-bg hover:bg-accent-dark"
            >
              {user ? 'Open the app →' : 'Sign in →'}
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <span className="text-4xl">⚠️</span>
            <h1 className="mt-4 font-display text-2xl font-bold">Verification failed</h1>
            <p className="mt-2 text-sm text-ink-muted">{message}</p>
            <Link to="/app" className="mt-6 inline-block text-sm text-accent hover:underline">
              ← Back to the app
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
