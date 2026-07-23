import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';

export default function NotificationBell() {
  const { socket } = useSocket();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = async () => {
    const { data } = await api.get('/notifications');
    setNotifications(data.data.notifications);
    setUnreadCount(data.unreadCount);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onNotif = (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((c) => c + 1);
    };
    socket.on('newNotification', onNotif);
    return () => socket.off('newNotification', onNotif);
  }, [socket]);

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5 text-lg"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-app-bg">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-app-borderLight dark:border-app-border bg-app-surfaceLight dark:bg-app-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-app-borderLight dark:border-app-border px-4 py-2">
            <span className="font-semibold text-sm">Notifications</span>
            <button onClick={markAllRead} className="text-xs text-accent hover:underline">
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-muted">No notifications yet</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`border-b border-app-borderLight dark:border-app-border px-4 py-3 text-sm last:border-0 ${
                    !n.read ? 'bg-accent/5' : ''
                  }`}
                >
                  <p>{n.message}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
