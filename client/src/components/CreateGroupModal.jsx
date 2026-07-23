import { useState, useEffect } from 'react';
import api from '../api/axios';
import Avatar from './Avatar';

export default function CreateGroupModal({ onClose, onCreated }) {
  const [groupName, setGroupName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      const { data } = await api.get(`/users/search?query=${encodeURIComponent(query)}`);
      setResults(data.data.users);
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  const toggleUser = (u) => {
    setSelected((prev) =>
      prev.some((s) => s._id === u._id) ? prev.filter((s) => s._id !== u._id) : [...prev, u]
    );
  };

  const handleCreate = async () => {
    setError('');
    if (!groupName.trim()) return setError('Group name is required.');
    if (selected.length < 2) return setError('Select at least 2 members.');

    setSubmitting(true);
    try {
      const { data } = await api.post('/groups', {
        groupName: groupName.trim(),
        memberIds: selected.map((s) => s._id),
      });
      onCreated(data.data.chat);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-app-surfaceLight dark:bg-app-surface p-5 shadow-xl">
        <h2 className="font-display text-lg font-bold mb-4">New Group</h2>

        <input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Group name"
          className="w-full rounded-lg border border-app-borderLight dark:border-app-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent mb-3"
        />

        {selected.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selected.map((u) => (
              <span
                key={u._id}
                onClick={() => toggleUser(u)}
                className="cursor-pointer rounded-full bg-accent/20 px-3 py-1 text-xs"
              >
                {u.name} ✕
              </span>
            ))}
          </div>
        )}

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search members..."
          className="w-full rounded-lg border border-app-borderLight dark:border-app-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
        />

        <div className="mt-2 max-h-48 overflow-y-auto scrollbar-thin">
          {results.map((u) => (
            <button
              key={u._id}
              onClick={() => toggleUser(u)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-black/5 dark:hover:bg-white/5"
            >
              <Avatar user={u} size="sm" />
              <span className="text-sm">{u.name}</span>
              {selected.some((s) => s._id === u._id) && <span className="ml-auto text-accent">✓</span>}
            </button>
          ))}
        </div>

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm border border-app-borderLight dark:border-app-border"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={submitting}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-app-bg hover:bg-accent-dark disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
