import { useState } from 'react';
import { motion } from 'framer-motion';
import EmojiPicker from './EmojiPicker';
import BlurhashImage from './BlurhashImage';

const CHECK = (
  <svg viewBox="0 0 16 15" width="16" height="15" className="inline-block">
    <path fill="currentColor" d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
  </svg>
);

function Ticks({ status }) {
  if (status === 'read') {
    return <span className="text-accent -space-x-2 flex">{CHECK}{CHECK}</span>;
  }
  if (status === 'delivered') {
    return <span className="text-ink-muted -space-x-2 flex">{CHECK}{CHECK}</span>;
  }
  return <span className="text-ink-muted">{CHECK}</span>;
}

export default function MessageBubble({ message, isOwn, onReact, onPin, onStar, onReply }) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (message.deletedForEveryone) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} px-4 py-1`}>
        <div className="italic text-sm text-ink-muted dark:text-ink-darkMuted px-4 py-2">
          This message was deleted
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`group flex ${isOwn ? 'justify-end' : 'justify-start'} px-4 py-1`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
      }}
    >
      <div className={`relative max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {message.replyTo && (
          <div className="mb-1 rounded-lg border-l-2 border-accent bg-black/5 dark:bg-white/5 px-3 py-1 text-xs text-ink-muted">
            {message.replyTo.content || 'Media message'}
          </div>
        )}

        <div
          className={`rounded-2xl px-4 py-2 shadow-bubble text-sm leading-relaxed ${
            isOwn
              ? 'bg-bubble-sent text-white rounded-br-sm'
              : 'bg-app-surfaceLight dark:bg-app-surface text-ink-dark dark:text-ink rounded-bl-sm'
          }`}
        >
          {message.pinned && (
            <span className="mr-1 text-xs opacity-70">📌</span>
          )}

          {message.media?.url ? (
            <MediaContent media={message.media} />
          ) : message.poll?.question ? (
            <PollContent poll={message.poll} />
          ) : (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}

          <div className="mt-1 flex items-center gap-1 text-[10px] opacity-70">
            {message.edited && <span>edited</span>}
            <span>{time}</span>
            {isOwn && <Ticks status={message.status || 'sent'} />}
          </div>

          {message.reactions?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {Object.entries(
                message.reactions.reduce((acc, r) => {
                  acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                  return acc;
                }, {})
              ).map(([emoji, count]) => (
                <span
                  key={emoji}
                  className="rounded-full bg-black/10 dark:bg-white/10 px-1.5 text-xs"
                >
                  {emoji} {count > 1 && count}
                </span>
              ))}
            </div>
          )}
        </div>

        {showActions && (
          <div
            className={`absolute -top-3 ${
              isOwn ? 'right-2' : 'left-2'
            } flex gap-1 rounded-full bg-app-surfaceLight dark:bg-app-surface shadow-bubble px-1 py-0.5 text-xs`}
          >
            <button onClick={() => onReact?.(message._id, '👍')} className="hover:scale-125 transition-transform">👍</button>
            <button onClick={() => onReact?.(message._id, '❤️')} className="hover:scale-125 transition-transform">❤️</button>
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker((v) => !v)}
                title="More reactions"
                className="hover:scale-125 transition-transform"
              >
                ➕
              </button>
              {showEmojiPicker && (
                <EmojiPicker
                  onSelect={(emoji) => {
                    onReact?.(message._id, emoji);
                    setShowEmojiPicker(false);
                  }}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}
            </div>
            <button onClick={() => onReply?.(message)} title="Reply" className="hover:scale-125 transition-transform">↩️</button>
            <button onClick={() => onStar?.(message._id)} title="Star" className="hover:scale-125 transition-transform">⭐</button>
            <button onClick={() => onPin?.(message._id)} title="Pin" className="hover:scale-125 transition-transform">📌</button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MediaContent({ media }) {
  if (media.type === 'image') {
    return (
      <BlurhashImage
        src={media.url}
        hash={media.blurhash}
        width={media.width}
        height={media.height}
        alt={media.fileName || 'image'}
        className="max-w-xs"
      />
    );
  }
  if (media.type === 'video') {
    return <video src={media.url} controls className="max-w-full rounded-lg" />;
  }
  if (media.type === 'audio') {
    return <audio src={media.url} controls className="max-w-full" />;
  }
  return (
    <a href={media.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline">
      📄 {media.fileName || 'Document'}
    </a>
  );
}

function PollContent({ poll }) {
  const totalVotes = poll.options.reduce((sum, o) => sum + (o.votes?.length || 0), 0);
  return (
    <div className="min-w-[200px]">
      <p className="font-semibold mb-2">{poll.question}</p>
      <div className="space-y-1.5">
        {poll.options.map((opt, i) => {
          const pct = totalVotes ? Math.round(((opt.votes?.length || 0) / totalVotes) * 100) : 0;
          return (
            <div key={i} className="relative rounded-lg bg-black/10 dark:bg-white/10 overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-accent/40" style={{ width: `${pct}%` }} />
              <div className="relative flex justify-between px-2 py-1 text-xs">
                <span>{opt.text}</span>
                <span>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
