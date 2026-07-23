import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import CallModal from '../components/CallModal';
import CommandPalette from '../components/CommandPalette';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';

export default function ChatPage() {
  const { socket } = useSocket();
  const [activeChat, setActiveChat] = useState(null);
  const [call, setCall] = useState(null); // { chat, callType, incomingCall }
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    if (!socket) return;
    const onIncomingCall = (payload) => {
      setCall({
        chat: { _id: payload.chatId, participants: [{ _id: payload.fromUserId }] },
        callType: payload.callType,
        incomingCall: payload,
      });
    };
    socket.on('incomingCall', onIncomingCall);
    return () => socket.off('incomingCall', onIncomingCall);
  }, [socket]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (isCmdK) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleStartChatWithUser = async (targetUser) => {
    try {
      const { data } = await api.post(`/chats/one-to-one/${targetUser._id}`);
      setActiveChat(data.data.chat);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start chat');
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar activeChat={activeChat} onSelectChat={setActiveChat} onOpenCommandPalette={() => setPaletteOpen(true)} />

      {activeChat ? (
        <ChatWindow
          chat={activeChat}
          onOpenCall={(chat, callType) => setCall({ chat, callType, incomingCall: null })}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center bg-app-bgLight dark:bg-app-bg text-center px-6">
          <p className="font-display text-2xl font-bold mb-2">Select a chat to start messaging</p>
          <p className="text-sm text-ink-muted mb-4">
            Or find people to talk to using the "Find people" tab, or press{' '}
            <kbd className="rounded bg-black/10 dark:bg-white/10 px-1.5 py-0.5 text-xs">⌘K</kbd> to search.
          </p>
          <Link to="/settings" className="text-sm text-accent hover:underline">
            Go to settings →
          </Link>
        </div>
      )}

      {call && (
        <CallModal
          chat={call.chat}
          callType={call.callType}
          incomingCall={call.incomingCall}
          onClose={() => setCall(null)}
        />
      )}

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelectChat={setActiveChat}
        onStartChatWithUser={handleStartChatWithUser}
      />
    </div>
  );
}
