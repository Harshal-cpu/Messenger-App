import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Avatar from '../components/Avatar';
import usePushNotifications from '../hooks/usePushNotifications';

function EmailVerificationBanner({ user }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (user?.emailVerified) return null;

  const resend = async () => {
    setSending(true);
    try {
      await api.post('/auth/resend-verification');
      setSent(true);
      toast.success('Verification email sent — check your inbox.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send verification email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mb-6 flex items-center justify-between rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
      <span>📧 Your email isn't verified yet.</span>
      <button
        onClick={resend}
        disabled={sending || sent}
        className="font-semibold text-accent hover:underline disabled:opacity-50"
      >
        {sent ? 'Sent!' : sending ? 'Sending…' : 'Resend link'}
      </button>
    </div>
  );
}

function PushNotificationsSection() {
  const { supported, subscribed, loading, subscribe, unsubscribe } = usePushNotifications();

  if (loading) return null;

  return (
    <section className="mb-8 rounded-2xl bg-app-surfaceLight dark:bg-app-surface p-5">
      <h2 className="font-semibold mb-1">Push Notifications</h2>
      {!supported ? (
        <p className="text-sm text-ink-muted">Not supported in this browser.</p>
      ) : (
        <>
          <p className="text-sm text-ink-muted mb-3">
            Get notified of new messages even when the app isn't open.
          </p>
          <button
            onClick={subscribed ? unsubscribe : subscribe}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              subscribed
                ? 'border border-app-borderLight dark:border-app-border'
                : 'bg-accent text-app-bg hover:bg-accent-dark'
            }`}
          >
            {subscribed ? 'Disable notifications' : 'Enable notifications'}
          </button>
        </>
      )}
    </section>
  );
}

function SessionsSection() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get('/auth/sessions');
      setSessions(data.data.sessions);
    } catch {
      // silent — sessions list is a nice-to-have, not critical path
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const revoke = async (id) => {
    try {
      await api.delete(`/auth/sessions/${id}`);
      toast.success('Device signed out');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to sign out device');
    }
  };

  const revokeAllOthers = async () => {
    try {
      const { data } = await api.delete('/auth/sessions');
      toast.success(`Signed out ${data.revokedCount} other device(s)`);
      load();
    } catch (err) {
      toast.error('Failed to sign out other devices');
    }
  };

  const describeDevice = (userAgent) => {
    if (!userAgent) return 'Unknown device';
    if (/mobile/i.test(userAgent)) return '📱 Mobile browser';
    if (/mac/i.test(userAgent)) return '💻 Mac';
    if (/windows/i.test(userAgent)) return '💻 Windows';
    if (/linux/i.test(userAgent)) return '💻 Linux';
    return '💻 Browser';
  };

  return (
    <section className="mb-8 rounded-2xl bg-app-surfaceLight dark:bg-app-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Active Sessions</h2>
        {sessions.length > 1 && (
          <button onClick={revokeAllOthers} className="text-xs text-red-500 hover:underline">
            Sign out other devices
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div
              key={s._id}
              className="flex items-center justify-between rounded-xl border border-app-borderLight dark:border-app-border px-3 py-2 text-sm"
            >
              <div>
                <p>
                  {describeDevice(s.userAgent)}
                  {s.isCurrent && (
                    <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-500">
                      This device
                    </span>
                  )}
                </p>
                <p className="text-xs text-ink-muted">
                  Last active {new Date(s.lastUsedAt).toLocaleString()}
                </p>
              </div>
              {!s.isCurrent && (
                <button onClick={() => revoke(s._id)} className="text-xs text-red-500 hover:underline">
                  Sign out
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function Settings() {
  const { user, setUser } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const fileInputRef = useRef(null);

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [profileMsg, setProfileMsg] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    const { data } = await api.post('/media/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setUser((prev) => ({ ...prev, avatar: data.data.avatar }));
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    const { data } = await api.patch('/users/me', { name, bio });
    setUser(data.data.user);
    setProfileMsg('Profile updated.');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMsg('');
    setPasswordError('');
    try {
      await api.patch('/auth/change-password', { currentPassword, newPassword });
      setPasswordMsg('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password.');
    }
  };

  return (
    <div className="min-h-screen bg-app-bgLight dark:bg-app-bg px-4 py-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/app" className="text-sm text-accent hover:underline">
            ← Back to chats
          </Link>
          <button
            onClick={toggleTheme}
            className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5"
          >
            {dark ? '☀️ Light mode' : '🌙 Dark mode'}
          </button>
        </div>

        <h1 className="font-display text-2xl font-bold mb-6">Settings</h1>

        <EmailVerificationBanner user={user} />

        <section className="mb-8 rounded-2xl bg-app-surfaceLight dark:bg-app-surface p-5">
          <h2 className="font-semibold mb-4">Profile</h2>
          <div className="flex items-center gap-4 mb-4">
            <Avatar user={user} size="lg" />
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full border border-app-borderLight dark:border-app-border px-3 py-1.5 text-sm"
              >
                Change photo
              </button>
            </div>
          </div>

          <form onSubmit={handleProfileSave} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-app-borderLight dark:border-app-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                rows={2}
                className="mt-1 w-full rounded-lg border border-app-borderLight dark:border-app-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            {profileMsg && <p className="text-sm text-green-600">{profileMsg}</p>}
            <button
              type="submit"
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-app-bg hover:bg-accent-dark"
            >
              Save Profile
            </button>
          </form>
        </section>

        <PushNotificationsSection />

        <SessionsSection />

        <section className="rounded-2xl bg-app-surfaceLight dark:bg-app-surface p-5">
          <h2 className="font-semibold mb-4">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-app-borderLight dark:border-app-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <input
              type="password"
              placeholder="New password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-app-borderLight dark:border-app-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
            {passwordMsg && <p className="text-sm text-green-600">{passwordMsg}</p>}
            {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
            <button
              type="submit"
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-app-bg hover:bg-accent-dark"
            >
              Change Password
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
