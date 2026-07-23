import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';

export default function CommandPalette({ open, onClose, onSelectChat, onStartChatWithUser }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [chats, setChats] = useState([]);
  const [userResults, setUserResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) return;
    api
      .get('/chats')
      .then(({ data }) => setChats(data.data.chats))
      .catch(() => setChats([]));
  }, [open]);

  const searchUsers = useCallback(async (q) => {
    if (!q.trim()) {
      setUserResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await api.get(`/users/search?query=${encodeURIComponent(q)}&limit=8`);
      setUserResults(data.data.users);
    } catch {
      setUserResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => searchUsers(query), 300);
    return () => clearTimeout(timeout);
  }, [query, searchUsers]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const filteredChats = (chats || []).filter((c) => {
    if (!query.trim()) return true;
    const name = c.isGroup
      ? c.groupName
      : c.participants?.find((p) => p._id !== user._id)?.name || '';
    return name.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-24"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-app-borderLight dark:border-app-border bg-app-surfaceLight dark:bg-app-surface shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-app-borderLight dark:border-app-border px-4 py-3">
              <span className="text-ink-muted">🔍</span>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search chats or people…"
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <kbd className="rounded bg-black/10 dark:bg-white/10 px-1.5 py-0.5 text-[10px] text-ink-muted">
                Esc
              </kbd>
            </div>

            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              {filteredChats.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                    Chats
                  </p>
                  {filteredChats.slice(0, 6).map((chat) => {
                    const otherUser = chat.participants?.find((p) => p._id !== user._id);
                    const name = chat.isGroup ? chat.groupName : otherUser?.name || 'Unknown';
                    return (
                      <button
                        key={chat._id}
                        onClick={() => {
                          onSelectChat(chat);
                          onClose();
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        <Avatar
                          user={chat.isGroup ? { name, avatar: chat.groupImage } : otherUser}
                          size="sm"
                        />
                        <span>{name}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {query.trim() && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                    People
                  </p>
                  {searching && <p className="px-4 py-2 text-xs text-ink-muted">Searching…</p>}
                  {!searching && userResults.length === 0 && (
                    <p className="px-4 py-2 text-xs text-ink-muted">No people found</p>
                  )}
                  {userResults.map((u) => (
                    <button
                      key={u._id}
                      onClick={() => {
                        onStartChatWithUser(u);
                        onClose();
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <Avatar user={u} size="sm" />
                      <div>
                        <p>{u.name}</p>
                        <p className="text-xs text-ink-muted">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!query.trim() && filteredChats.length === 0 && (
                <p className="px-4 py-6 text-center text-xs text-ink-muted">
                  Start typing to search chats and people
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
