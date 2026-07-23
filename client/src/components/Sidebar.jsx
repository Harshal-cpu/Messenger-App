import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Avatar from './Avatar';
import { ChatListSkeleton } from './Skeleton';
import NotificationBell from './NotificationBell';
import CreateGroupModal from './CreateGroupModal';

function chatDisplayName(chat, currentUserId) {
  if (chat.isGroup) return chat.groupName || 'Unnamed Group';
  const other = chat.participants?.find((p) => p._id !== currentUserId);
  return other?.name || 'Unknown User';
}

function chatDisplayAvatar(chat, currentUserId) {
  if (chat.isGroup) return { avatar: chat.groupImage, name: chat.groupName };
  return chat.participants?.find((p) => p._id !== currentUserId) || {};
}

export default function Sidebar({ activeChat, onSelectChat, onOpenCommandPalette }) {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const [tab, setTab] = useState('chats'); // chats | search | requests
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showGroupModal, setShowGroupModal] = useState(false);

  const loadChats = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/chats');
      setChats(data.data.chats);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (!socket) return;
    const onMessage = () => loadChats();
    const onNotification = () => {
      if (tab === 'requests') loadRequests();
    };
    socket.on('message', onMessage);
    socket.on('newNotification', onNotification);
    return () => {
      socket.off('message', onMessage);
      socket.off('newNotification', onNotification);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, tab]);

  const loadRequests = async () => {
    const { data } = await api.get('/friends/requests');
    setRequests(data.data.requests);
  };

  useEffect(() => {
    if (tab === 'requests') loadRequests();
  }, [tab]);

  useEffect(() => {
    if (tab !== 'search' || !query.trim()) {
      setSearchResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      const { data } = await api.get(`/users/search?query=${encodeURIComponent(query)}`);
      setSearchResults(data.data.users);
    }, 350); // debounce
    return () => clearTimeout(handle);
  }, [query, tab]);

  const startChatWith = async (userId) => {
    const { data } = await api.post(`/chats/one-to-one/${userId}`);
    setTab('chats');
    setQuery('');
    await loadChats();
    onSelectChat(data.data.chat);
  };

  const sendFriendRequest = async (userId) => {
    await api.post(`/friends/request/${userId}`);
  };

  const acceptRequest = async (requestId) => {
    await api.patch(`/friends/accept/${requestId}`);
    loadRequests();
    loadChats();
  };

  const rejectRequest = async (requestId) => {
    await api.patch(`/friends/reject/${requestId}`);
    loadRequests();
  };

  return (
    <div className="flex h-full w-full max-w-sm flex-col border-r border-app-borderLight dark:border-app-border bg-app-surfaceLight dark:bg-app-surface">
      <header className="flex items-center justify-between px-4 py-4 border-b border-app-borderLight dark:border-app-border">
        <div className="flex items-center gap-3">
          <Avatar user={user} size="sm" />
          <h1 className="font-display font-bold text-lg">{user?.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCommandPalette}
            title="Search (⌘K)"
            className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5 text-lg"
          >
            🔍
          </button>
          <NotificationBell />
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              title="Admin dashboard"
              className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5 text-lg"
            >
              🛠️
            </Link>
          )}
          <button
            onClick={() => setShowGroupModal(true)}
            title="New group"
            className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5 text-lg"
          >
            ➕
          </button>
          <button
            onClick={logout}
            title="Log out"
            className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5 text-sm text-ink-muted"
          >
            ⏻
          </button>
        </div>
      </header>

      <nav className="flex border-b border-app-borderLight dark:border-app-border text-sm font-medium">
        {[
          { id: 'chats', label: 'Chats' },
          { id: 'search', label: 'Find people' },
          { id: 'requests', label: `Requests${requests.length ? ` (${requests.length})` : ''}` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 transition-colors ${
              tab === t.id
                ? 'text-accent border-b-2 border-accent'
                : 'text-ink-muted hover:text-ink-dark dark:hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'search' && (
        <div className="p-3">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-lg border border-app-borderLight dark:border-app-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {tab === 'chats' &&
          (loading ? (
            <ChatListSkeleton />
          ) : chats.length === 0 ? (
            <EmptyState text="No chats yet — find people to start messaging." />
          ) : (
            chats.map((chat) => {
              const displayName = chatDisplayName(chat, user._id);
              const displayEntity = chatDisplayAvatar(chat, user._id);
              const isPinned = chat.pinnedBy?.includes(user._id);
              const isMuted = chat.mutedBy?.includes(user._id);
              return (
                <button
                  key={chat._id}
                  onClick={() => onSelectChat(chat)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${
                    activeChat?._id === chat._id ? 'bg-black/5 dark:bg-white/5' : ''
                  }`}
                >
                  <Avatar user={displayEntity} showOnline={!chat.isGroup} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="truncate font-medium">{displayName}</p>
                      {isPinned && <span className="text-xs">📌</span>}
                      {isMuted && <span className="text-xs">🔇</span>}
                    </div>
                    <p className="truncate text-xs text-ink-muted">
                      {chat.lastMessage?.content ||
                        (chat.lastMessage?.media?.url ? 'Media message' : 'Say hello 👋')}
                    </p>
                  </div>
                  {chat.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-app-bg">
                      {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          ))}

        {tab === 'search' &&
          (searchResults.length === 0 ? (
            <EmptyState text={query ? 'No users found.' : 'Start typing to search.'} />
          ) : (
            searchResults.map((u) => (
              <div key={u._id} className="flex items-center gap-3 px-4 py-3">
                <Avatar user={u} showOnline />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{u.name}</p>
                  <p className="truncate text-xs text-ink-muted">{u.email}</p>
                </div>
                <button
                  onClick={() => startChatWith(u._id)}
                  className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-app-bg hover:bg-accent-dark"
                >
                  Message
                </button>
                <button
                  onClick={() => sendFriendRequest(u._id)}
                  title="Add friend"
                  className="rounded-full border border-app-borderLight dark:border-app-border px-2 py-1 text-xs"
                >
                  +
                </button>
              </div>
            ))
          ))}

        {tab === 'requests' &&
          (requests.length === 0 ? (
            <EmptyState text="No pending friend requests." />
          ) : (
            requests.map((req) => (
              <div key={req._id} className="flex items-center gap-3 px-4 py-3">
                <Avatar user={req.sender} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{req.sender.name}</p>
                  <p className="truncate text-xs text-ink-muted">{req.sender.email}</p>
                </div>
                <button
                  onClick={() => acceptRequest(req._id)}
                  className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-app-bg hover:bg-accent-dark"
                >
                  Accept
                </button>
                <button
                  onClick={() => rejectRequest(req._id)}
                  className="rounded-full border border-app-borderLight dark:border-app-border px-3 py-1 text-xs"
                >
                  Reject
                </button>
              </div>
            ))
          ))}
      </div>

      {showGroupModal && (
        <CreateGroupModal
          onClose={() => setShowGroupModal(false)}
          onCreated={(chat) => {
            setShowGroupModal(false);
            loadChats();
            onSelectChat(chat);
          }}
        />
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="flex h-full items-center justify-center px-6 py-10 text-center text-sm text-ink-muted">
      {text}
    </div>
  );
}
