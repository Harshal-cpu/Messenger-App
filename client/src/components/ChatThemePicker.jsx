import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';

export const CHAT_THEMES = {
  default: {
    label: 'Default',
    bg: 'bg-app-bgLight dark:bg-app-bg',
    swatch: 'bg-gradient-to-br from-app-bgLight to-app-borderLight dark:from-app-bg dark:to-app-surfaceAlt',
  },
  ocean: {
    label: 'Ocean',
    bg: 'bg-gradient-to-b from-sky-50 to-cyan-100 dark:from-slate-900 dark:to-cyan-950',
    swatch: 'bg-gradient-to-br from-sky-400 to-cyan-600',
  },
  sunset: {
    label: 'Sunset',
    bg: 'bg-gradient-to-b from-orange-50 to-rose-100 dark:from-orange-950 dark:to-rose-950',
    swatch: 'bg-gradient-to-br from-orange-400 to-rose-500',
  },
  forest: {
    label: 'Forest',
    bg: 'bg-gradient-to-b from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-950',
    swatch: 'bg-gradient-to-br from-emerald-400 to-green-600',
  },
  midnight: {
    label: 'Midnight',
    bg: 'bg-gradient-to-b from-slate-800 to-indigo-950',
    swatch: 'bg-gradient-to-br from-slate-700 to-indigo-900',
  },
};

export function getChatThemeClasses(theme) {
  return (CHAT_THEMES[theme] || CHAT_THEMES.default).bg;
}

export default function ChatThemePicker({ chat, onThemeChanged, onClose }) {
  const [saving, setSaving] = useState(false);

  const applyTheme = async (themeKey) => {
    setSaving(true);
    try {
      await api.patch(`/chats/${chat._id}/theme`, { theme: themeKey });
      onThemeChanged?.(themeKey);
      toast.success(`Chat theme set to ${CHAT_THEMES[themeKey].label}`);
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not change theme');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-2xl border border-app-borderLight dark:border-app-border bg-app-surfaceLight dark:bg-app-surface p-3 shadow-xl">
      <p className="mb-2 px-1 text-xs font-semibold text-ink-muted">Chat wallpaper</p>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(CHAT_THEMES).map(([key, theme]) => (
          <button
            key={key}
            disabled={saving}
            onClick={() => applyTheme(key)}
            className={`h-12 rounded-xl ${theme.swatch} ring-2 ring-transparent hover:ring-accent transition-all disabled:opacity-50`}
            title={theme.label}
          />
        ))}
      </div>
    </div>
  );
}
