import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';
import api from '../api/axios';

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-app-borderLight dark:border-app-border bg-app-surfaceLight dark:bg-app-surface p-4">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${accent ? 'text-accent' : ''}`}>
        {value}
      </p>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [messagesPerDay, setMessagesPerDay] = useState([]);
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [tab, setTab] = useState('overview');
  const [userQuery, setUserQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadOverview = async () => {
    const [dashRes, analyticsRes] = await Promise.all([
      api.get('/admin/dashboard'),
      api.get('/admin/analytics/messages?days=14'),
    ]);
    setStats(dashRes.data.data);
    setMessagesPerDay(analyticsRes.data.data.messagesPerDay);
  };

  const loadUsers = async (query = '') => {
    const { data } = await api.get(`/admin/users?query=${encodeURIComponent(query)}&limit=50`);
    setUsers(data.data.users);
  };

  const loadChats = async () => {
    const { data } = await api.get('/admin/chats?limit=50');
    setChats(data.data.chats);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadOverview(), loadUsers(), loadChats()])
      .catch(() => toast.error('Failed to load admin data'))
      .finally(() => setLoading(false));
  }, []);

  const handleUserAction = async (userId, action) => {
    try {
      await api.patch(`/admin/users/${userId}/${action}`);
      toast.success(`User ${action.replace('-', ' ')}d`);
      loadUsers(userQuery);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-app-bgLight dark:bg-app-bg">
        <p className="text-ink-muted">Loading admin dashboard…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bgLight dark:bg-app-bg">
      <header className="flex items-center justify-between border-b border-app-borderLight dark:border-app-border bg-app-surfaceLight dark:bg-app-surface px-6 py-4">
        <div>
          <h1 className="font-display text-xl font-bold">Admin Dashboard</h1>
          <p className="text-xs text-ink-muted">Platform overview & management</p>
        </div>
        <Link to="/app" className="text-sm text-accent hover:underline">
          ← Back to Messenger
        </Link>
      </header>

      <div className="flex gap-1 border-b border-app-borderLight dark:border-app-border bg-app-surfaceLight dark:bg-app-surface px-6">
        {['overview', 'users', 'chats'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-muted hover:text-ink dark:hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <main className="p-6 max-w-6xl mx-auto">
        {tab === 'overview' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Users" value={stats.totalUsers} />
              <StatCard label="Online Now" value={stats.onlineUsers} accent />
              <StatCard label="New Users (7d)" value={stats.newUsers7d} />
              <StatCard label="Total Chats" value={stats.totalChats} />
              <StatCard label="Group Chats" value={stats.totalGroupChats} />
              <StatCard label="Total Messages" value={stats.totalMessages} />
              <StatCard label="Messages (24h)" value={stats.messages24h} accent />
              <StatCard label="Active Today" value={stats.activeUsersToday} />
            </div>

            <div className="rounded-2xl border border-app-borderLight dark:border-app-border bg-app-surfaceLight dark:bg-app-surface p-4">
              <p className="mb-4 text-sm font-semibold">Message volume — last 14 days</p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={messagesPerDay}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#F2A65A" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="space-y-3">
            <input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadUsers(userQuery)}
              placeholder="Search by name or email…"
              className="w-full max-w-sm rounded-xl border border-app-borderLight dark:border-app-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <div className="overflow-x-auto rounded-2xl border border-app-borderLight dark:border-app-border">
              <table className="w-full text-sm">
                <thead className="bg-app-surfaceLight dark:bg-app-surface text-left text-xs text-ink-muted">
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Role</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} className="border-t border-app-borderLight dark:border-app-border">
                      <td className="px-4 py-2">{u.name}</td>
                      <td className="px-4 py-2 text-ink-muted">{u.email}</td>
                      <td className="px-4 py-2">
                        {u.role === 'admin' && (
                          <span className="rounded-full bg-accent/20 text-accent px-2 py-0.5 text-xs">
                            admin
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <span className={u.active === false ? 'text-red-500' : 'text-emerald-500'}>
                          {u.active === false ? 'Deactivated' : u.isOnline ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="px-4 py-2 space-x-2 text-xs">
                        {u.active === false ? (
                          <button
                            onClick={() => handleUserAction(u._id, 'reactivate')}
                            className="text-emerald-500 hover:underline"
                          >
                            Reactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUserAction(u._id, 'deactivate')}
                            className="text-red-500 hover:underline"
                          >
                            Deactivate
                          </button>
                        )}
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleUserAction(u._id, 'make-admin')}
                            className="text-accent hover:underline"
                          >
                            Make admin
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'chats' && (
          <div className="overflow-x-auto rounded-2xl border border-app-borderLight dark:border-app-border">
            <table className="w-full text-sm">
              <thead className="bg-app-surfaceLight dark:bg-app-surface text-left text-xs text-ink-muted">
                <tr>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Name / Participants</th>
                  <th className="px-4 py-2">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {chats.map((c) => (
                  <tr key={c._id} className="border-t border-app-borderLight dark:border-app-border">
                    <td className="px-4 py-2">{c.isGroup ? 'Group' : '1:1'}</td>
                    <td className="px-4 py-2">
                      {c.isGroup
                        ? c.groupName
                        : c.participants?.map((p) => p.name).join(', ')}
                    </td>
                    <td className="px-4 py-2 text-ink-muted">
                      {new Date(c.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
