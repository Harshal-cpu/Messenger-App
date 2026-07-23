import { useEffect, useRef, useState, useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Avatar from './Avatar';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import { MessagesSkeleton } from './Skeleton';
import EmojiPicker from './EmojiPicker';
import VoiceRecorder from './VoiceRecorder';
import ChatThemePicker, { getChatThemeClasses } from './ChatThemePicker';

function chatDisplayName(chat, currentUserId) {
  if (chat.isGroup) return chat.groupName || 'Unnamed Group';
  const other = chat.participants?.find((p) => p._id !== currentUserId);
  return other?.name || 'Unknown User';
}

function chatDisplayEntity(chat, currentUserId) {
  if (chat.isGroup) return { avatar: chat.groupImage, name: chat.groupName };
  return chat.participants?.find((p) => p._id !== currentUserId) || {};
}

export default function ChatWindow({ chat, onOpenCall }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [uploading, setUploading] = useState(false);
  const [theme, setTheme] = useState(chat.theme || 'default');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showComposerEmoji, setShowComposerEmoji] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  // Attachment preview — file is staged locally before actually uploading
  const [stagedFile, setStagedFile] = useState(null);
  const [stagedPreviewUrl, setStagedPreviewUrl] = useState(null);
  const [caption, setCaption] = useState('');

  // @mention autocomplete
  const [mentionQuery, setMentionQuery] = useState(null); // null = not active
  const [mentionCandidates, setMentionCandidates] = useState([]);

  // In-chat message search
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // react-virtuoso's documented pattern for prepending older items (infinite
  // scroll upward) while preserving scroll position: start from a large
  // number and decrement by however many older messages get prepended.
  const [firstItemIndex, setFirstItemIndex] = useState(100000);
  const [atBottom, setAtBottom] = useState(true);

  const virtuosoRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const otherEntity = chatDisplayEntity(chat, user._id);
  const displayName = chatDisplayName(chat, user._id);

  const loadMessages = useCallback(
    async (pageNum) => {
      const { data } = await api.get(`/messages/${chat._id}?page=${pageNum}&limit=30`);
      setHasMore(data.results === 30);
      return data.data.messages;
    },
    [chat._id]
  );

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setPage(1);
    setTheme(chat.theme || 'default');
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    setInput(localStorage.getItem(`draft:${chat._id}`) || '');
    setFirstItemIndex(100000);
    loadMessages(1).then((msgs) => {
      setMessages(msgs);
      setLoading(false);
    });

    api.patch(`/messages/${chat._id}/read`).catch(() => {});

    if (socket) socket.emit('join', chat._id);
    return () => {
      if (socket) socket.emit('leave', chat._id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat._id, socket]);

  useEffect(() => {
    if (!socket) return;

    const onMessage = (msg) => {
      if (msg.chat !== chat._id && msg.chat?._id !== chat._id) return;
      setMessages((prev) => [...prev, msg]);
      api.patch(`/messages/${chat._id}/read`).catch(() => {});
    };

    const onTyping = ({ chatId, userId }) => {
      if (chatId !== chat._id || userId === user._id) return;
      setTypingUsers((prev) => ({ ...prev, [userId]: true }));
    };
    const onStopTyping = ({ chatId, userId }) => {
      if (chatId !== chat._id) return;
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    const onReaction = ({ messageId, reactions }) => {
      setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, reactions } : m)));
    };
    const onPinned = ({ messageId, pinned }) => {
      setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, pinned } : m)));
    };
    const onEdited = (msg) => {
      setMessages((prev) => prev.map((m) => (m._id === msg._id ? msg : m)));
    };
    const onDeleted = ({ messageId, forEveryone }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, deletedForEveryone: forEveryone, content: null } : m
        )
      );
    };
    const onThemeChanged = ({ chatId, theme: newTheme }) => {
      if (chatId === chat._id) setTheme(newTheme);
    };

    socket.on('message', onMessage);
    socket.on('typing', onTyping);
    socket.on('stopTyping', onStopTyping);
    socket.on('messageReaction', onReaction);
    socket.on('messagePinned', onPinned);
    socket.on('messageEdited', onEdited);
    socket.on('messageDeleted', onDeleted);
    socket.on('chatThemeChanged', onThemeChanged);

    return () => {
      socket.off('message', onMessage);
      socket.off('typing', onTyping);
      socket.off('stopTyping', onStopTyping);
      socket.off('messageReaction', onReaction);
      socket.off('messagePinned', onPinned);
      socket.off('messageEdited', onEdited);
      socket.off('messageDeleted', onDeleted);
      socket.off('chatThemeChanged', onThemeChanged);
    };
  }, [socket, chat._id, user._id]);

  // Clean up any staged object URL when the component unmounts or the file changes
  useEffect(() => {
    return () => {
      if (stagedPreviewUrl) URL.revokeObjectURL(stagedPreviewUrl);
    };
  }, [stagedPreviewUrl]);

  const loadMore = async () => {
    if (!hasMore) return;
    const nextPage = page + 1;
    const older = await loadMessages(nextPage);
    if (older.length === 0) return;
    setFirstItemIndex((prev) => prev - older.length);
    setMessages((prev) => [...older, ...prev]);
    setPage(nextPage);
  };

  const mentionableParticipants = (chat.participants || []).filter((p) => p._id !== user._id);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);

    if (value.trim()) {
      localStorage.setItem(`draft:${chat._id}`, value);
    } else {
      localStorage.removeItem(`draft:${chat._id}`);
    }

    if (!socket) return;
    socket.emit('typing', { chatId: chat._id });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping', { chatId: chat._id });
    }, 1500);

    // @mention detection: look at the last "word" being typed
    const cursor = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursor);
    const match = textBeforeCursor.match(/@(\w*)$/);

    if (match && chat.isGroup) {
      const q = match[1].toLowerCase();
      const candidates = mentionableParticipants.filter((p) =>
        p.name.toLowerCase().startsWith(q)
      );
      setMentionQuery(q);
      setMentionCandidates(candidates);
    } else {
      setMentionQuery(null);
      setMentionCandidates([]);
    }
  };

  const selectMention = (participant) => {
    const cursor = textareaRef.current?.selectionStart ?? input.length;
    const textBeforeCursor = input.slice(0, cursor);
    const textAfterCursor = input.slice(cursor);
    const firstName = participant.name.split(' ')[0];
    const newTextBefore = textBeforeCursor.replace(/@(\w*)$/, `@${firstName} `);
    setInput(newTextBefore + textAfterCursor);
    setMentionQuery(null);
    setMentionCandidates([]);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const sendMessage = () => {
    const content = input.trim();
    if (!content || !socket) return;

    socket.emit(
      'message',
      { chatId: chat._id, content, replyTo: replyTo?._id },
      (ack) => {
        if (ack?.error) toast.error(ack.error);
      }
    );
    setInput('');
    localStorage.removeItem(`draft:${chat._id}`);
    setReplyTo(null);
    setMentionQuery(null);
    socket.emit('stopTyping', { chatId: chat._id });
  };

  const handleKeyDown = (e) => {
    if (mentionQuery !== null && mentionCandidates.length > 0) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        selectMention(mentionCandidates[0]);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Stage a file locally instead of uploading immediately, so the user can
  // preview it and add a caption before it actually sends.
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error('File is too large. Maximum size is 25MB.');
      e.target.value = '';
      return;
    }

    setStagedFile(file);
    setStagedPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
    e.target.value = '';
  };

  const cancelAttachment = () => {
    if (stagedPreviewUrl) URL.revokeObjectURL(stagedPreviewUrl);
    setStagedFile(null);
    setStagedPreviewUrl(null);
    setCaption('');
  };

  const confirmSendAttachment = async () => {
    if (!stagedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', stagedFile);
      if (caption.trim()) formData.append('caption', caption.trim());
      await api.post(`/media/chat/${chat._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      cancelAttachment();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleReact = (messageId, emoji) => {
    api.patch(`/messages/message/${messageId}/react`, { emoji }).catch(() => {
      toast.error('Could not add reaction');
    });
  };
  const handlePin = (messageId) => {
    api.patch(`/messages/message/${messageId}/pin`).catch(() => {
      toast.error('Could not pin message');
    });
  };
  const handleStar = (messageId) => {
    api.patch(`/messages/message/${messageId}/star`).catch(() => {
      toast.error('Could not star message');
    });
  };

  const runSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await api.get(
        `/messages/${chat._id}/search?q=${encodeURIComponent(searchQuery)}`
      );
      setSearchResults(data.data.messages);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [chat._id, searchQuery]);

  useEffect(() => {
    const handle = setTimeout(runSearch, 350);
    return () => clearTimeout(handle);
  }, [searchQuery, runSearch]);

  const typingNames = Object.keys(typingUsers)
    .map((userId) => chat.participants?.find((p) => p._id === userId)?.name)
    .filter(Boolean);

  const typingLabel =
    typingNames.length === 0
      ? null
      : typingNames.length === 1
      ? `${typingNames[0]} is typing`
      : typingNames.length === 2
      ? `${typingNames[0]} and ${typingNames[1]} are typing`
      : `${typingNames[0]} and ${typingNames.length - 1} others are typing`;

  return (
    <div className={`flex h-full flex-1 flex-col ${getChatThemeClasses(theme)}`}>
      <header className="flex items-center justify-between border-b border-app-borderLight dark:border-app-border px-5 py-3 bg-app-surfaceLight dark:bg-app-surface">
        <div className="flex items-center gap-3">
          <Avatar user={otherEntity} showOnline={!chat.isGroup} />
          <div>
            <p className="font-semibold">{displayName}</p>
            <p className="text-xs text-ink-muted">
              {chat.isGroup
                ? `${chat.participants?.length || 0} members`
                : otherEntity.isOnline
                ? 'Online'
                : otherEntity.lastSeen
                ? `Last seen ${new Date(otherEntity.lastSeen).toLocaleString()}`
                : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 relative">
          <button
            onClick={() => setShowSearch((v) => !v)}
            className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5"
            title="Search in chat"
          >
            🔍
          </button>
          <div className="relative">
            <button
              onClick={() => setShowThemePicker((v) => !v)}
              className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5"
              title="Chat wallpaper"
            >
              🎨
            </button>
            {showThemePicker && (
              <ChatThemePicker
                chat={chat}
                onThemeChanged={setTheme}
                onClose={() => setShowThemePicker(false)}
              />
            )}
          </div>
          <button
            onClick={() => onOpenCall?.(chat, 'voice')}
            className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5"
            title="Voice call"
          >
            📞
          </button>
          <button
            onClick={() => onOpenCall?.(chat, 'video')}
            className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5"
            title="Video call"
          >
            🎥
          </button>
        </div>
      </header>

      {showSearch && (
        <div className="border-b border-app-borderLight dark:border-app-border bg-app-surfaceLight dark:bg-app-surface px-4 py-2">
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages in this chat…"
            className="w-full rounded-lg border border-app-borderLight dark:border-app-border bg-transparent px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
          {searchQuery.trim() && (
            <div className="mt-2 max-h-48 overflow-y-auto scrollbar-thin space-y-1">
              {searching && <p className="text-xs text-ink-muted px-1">Searching…</p>}
              {!searching && searchResults.length === 0 && (
                <p className="text-xs text-ink-muted px-1">No messages found.</p>
              )}
              {searchResults.map((m) => (
                <div key={m._id} className="rounded-lg px-2 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5">
                  <span className="font-medium">{m.sender?.name}: </span>
                  <span className="text-ink-muted">{m.content}</span>
                  <span className="ml-2 text-[10px] text-ink-muted">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0">
        {loading ? (
          <MessagesSkeleton />
        ) : (
          <Virtuoso
            key={chat._id}
            ref={virtuosoRef}
            style={{ height: '100%' }}
            className="scrollbar-thin"
            data={messages}
            firstItemIndex={firstItemIndex}
            initialTopMostItemIndex={Math.max(messages.length - 1, 0)}
            followOutput={(isAtBottom) => (isAtBottom ? 'smooth' : false)}
            atBottomStateChange={setAtBottom}
            startReached={loadMore}
            increaseViewportBy={{ top: 400, bottom: 200 }}
            itemContent={(index, msg) => (
              <MessageBubble
                message={msg}
                isOwn={(msg.sender?._id || msg.sender) === user._id}
                onReact={handleReact}
                onPin={handlePin}
                onStar={handleStar}
                onReply={setReplyTo}
              />
            )}
            components={{
              Header: () =>
                hasMore ? (
                  <p className="py-3 text-center text-xs text-ink-muted">
                    Scroll up to load earlier messages
                  </p>
                ) : (
                  <div className="py-2" />
                ),
              Footer: () =>
                typingLabel ? (
                  <TypingIndicator name={typingLabel} />
                ) : (
                  <div className="py-1" />
                ),
            }}
          />
        )}
      </div>

      {replyTo && (
        <div className="mx-4 mb-1 flex items-center justify-between rounded-lg border-l-2 border-accent bg-black/5 dark:bg-white/5 px-3 py-1.5 text-xs">
          <span className="truncate">Replying to: {replyTo.content || 'Media message'}</span>
          <button onClick={() => setReplyTo(null)} className="ml-2 text-ink-muted">
            ✕
          </button>
        </div>
      )}

      {stagedFile && (
        <div className="mx-4 mb-2 rounded-xl border border-app-borderLight dark:border-app-border bg-app-surfaceLight dark:bg-app-surface p-3">
          <div className="flex items-start gap-3">
            {stagedPreviewUrl ? (
              <img src={stagedPreviewUrl} alt="preview" className="h-16 w-16 rounded-lg object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-black/5 dark:bg-white/10 text-2xl">
                📄
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{stagedFile.name}</p>
              <p className="text-xs text-ink-muted">{(stagedFile.size / 1024).toFixed(0)} KB</p>
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption…"
                className="mt-2 w-full rounded-lg border border-app-borderLight dark:border-app-border bg-transparent px-2 py-1 text-xs outline-none focus:border-accent"
              />
            </div>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={cancelAttachment}
              disabled={uploading}
              className="rounded-full px-3 py-1 text-xs text-ink-muted hover:bg-black/5 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={confirmSendAttachment}
              disabled={uploading}
              className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-app-bg hover:bg-accent-dark disabled:opacity-50"
            >
              {uploading ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {showVoiceRecorder && (
        <VoiceRecorder
          chatId={chat._id}
          onSent={() => setShowVoiceRecorder(false)}
          onClose={() => setShowVoiceRecorder(false)}
        />
      )}

      <div className="relative flex items-center gap-2 border-t border-app-borderLight dark:border-app-border px-4 py-3 bg-app-surfaceLight dark:bg-app-surface">
        {mentionQuery !== null && mentionCandidates.length > 0 && (
          <div className="absolute bottom-full left-4 mb-1 w-56 overflow-hidden rounded-xl border border-app-borderLight dark:border-app-border bg-app-surfaceLight dark:bg-app-surface shadow-xl">
            {mentionCandidates.map((p) => (
              <button
                key={p._id}
                onClick={() => selectMention(p)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5"
              >
                <Avatar user={p} size="sm" />
                {p.name}
              </button>
            ))}
          </div>
        )}

        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5 text-lg"
          title="Attach file"
        >
          📎
        </button>
        <button
          onClick={() => setShowVoiceRecorder(true)}
          className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5 text-lg"
          title="Record voice message"
        >
          🎤
        </button>

        <div className="relative">
          <button
            onClick={() => setShowComposerEmoji((v) => !v)}
            className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5 text-lg"
            title="Emoji"
          >
            😊
          </button>
          {showComposerEmoji && (
            <EmojiPicker
              onSelect={(emoji) => {
                setInput((prev) => prev + emoji);
                setShowComposerEmoji(false);
                textareaRef.current?.focus();
              }}
              onClose={() => setShowComposerEmoji(false)}
            />
          )}
        </div>

        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={chat.isGroup ? 'Type a message... (@ to mention)' : 'Type a message...'}
          className="flex-1 resize-none rounded-2xl border border-app-borderLight dark:border-app-border bg-transparent px-4 py-2 text-sm outline-none focus:border-accent max-h-32"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="rounded-full bg-accent p-2.5 text-app-bg hover:bg-accent-dark disabled:opacity-40"
          title="Send"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
