import { useState } from 'react';

const CATEGORIES = {
  Smileys: ['😀', '😂', '🥰', '😍', '🤔', '😅', '😭', '😎', '🙃', '😴', '🤩', '😇', '🙂', '😉', '🥳', '😢'],
  Gestures: ['👍', '👎', '👏', '🙏', '🤝', '💪', '✌️', '🤞', '👌', '🫡', '👋', '🤙'],
  Hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💕', '💯'],
  Objects: ['🔥', '🎉', '✨', '🎯', '📌', '💡', '⚡', '🚀', '🏆', '🎁', '📎', '⏰'],
};

export default function EmojiPicker({ onSelect, onClose }) {
  const [activeTab, setActiveTab] = useState('Smileys');

  return (
    <div className="absolute bottom-full right-0 z-30 mb-2 w-72 rounded-2xl border border-app-borderLight dark:border-app-border bg-app-surfaceLight dark:bg-app-surface shadow-xl">
      <div className="flex border-b border-app-borderLight dark:border-app-border">
        {Object.keys(CATEGORIES).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === cat
                ? 'text-accent border-b-2 border-accent'
                : 'text-ink-muted hover:text-ink dark:hover:text-ink'
            }`}
          >
            {cat}
          </button>
        ))}
        <button
          onClick={onClose}
          className="px-2 text-ink-muted hover:text-ink dark:hover:text-ink"
          aria-label="Close emoji picker"
        >
          ✕
        </button>
      </div>
      <div className="grid grid-cols-8 gap-1 p-3 max-h-40 overflow-y-auto scrollbar-thin">
        {CATEGORIES[activeTab].map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="rounded-lg p-1.5 text-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
