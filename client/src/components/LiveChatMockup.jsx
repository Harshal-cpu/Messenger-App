import { useEffect, useRef, useState } from 'react';

const SCRIPT = [
  { from: 'them', text: "hey, are we still on for the design review?" },
  { from: 'me', text: "yep! pulling up the file now" },
  { from: 'them', text: "🔥 the new chat theme looks great" },
  { from: 'me', text: "thanks, added dark mode too 🌙" },
  { from: 'them', typing: true },
  { from: 'them', text: "can you send the recording after?" },
  { from: 'me', text: "sending it over now 📎" },
];

const TYPE_MS = 900;
const READ_MS = 1400;
const RESTART_PAUSE_MS = 2400;

function TypingDots() {
  return (
    <span className="inline-flex gap-1 px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-current opacity-60 animate-typingDot"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

export default function LiveChatMockup() {
  const [visibleCount, setVisibleCount] = useState(0);
  const bottomRef = useRef(null);
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reducedMotion) {
      setVisibleCount(SCRIPT.filter((s) => !s.typing).length);
      return;
    }

    let cancelled = false;
    let idx = 0;

    const step = () => {
      if (cancelled) return;
      if (idx >= SCRIPT.length) {
        setTimeout(() => {
          if (cancelled) return;
          setVisibleCount(0);
          idx = 0;
          setTimeout(step, 500);
        }, RESTART_PAUSE_MS);
        return;
      }
      idx += 1;
      setVisibleCount(idx);
      const isTyping = SCRIPT[idx - 1]?.typing;
      setTimeout(step, isTyping ? TYPE_MS : READ_MS);
    };

    const initial = setTimeout(step, 600);
    return () => {
      cancelled = true;
      clearTimeout(initial);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [visibleCount]);

  const visible = SCRIPT.slice(0, visibleCount);

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-4 rounded-[2rem] bg-accent/10 blur-2xl" aria-hidden />
      <div className="relative rounded-[1.75rem] border border-app-border bg-app-surface shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 border-b border-app-border px-4 py-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-bubble-sent to-accent" />
          <div>
            <p className="text-sm font-semibold text-ink">Priya Shah</p>
            <p className="text-[11px] text-emerald-400">online</p>
          </div>
        </div>

        <div className="flex h-72 flex-col gap-2 overflow-hidden px-4 py-4">
          {visible.map((msg, i) =>
            msg.typing ? (
              <div key="typing" className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-app-surfaceAlt px-3 py-2 text-ink">
                  <TypingDots />
                </div>
              </div>
            ) : (
              <div key={i} className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-bubble ${
                    msg.from === 'me'
                      ? 'rounded-br-sm bg-bubble-sent text-white'
                      : 'rounded-bl-sm bg-app-surfaceAlt text-ink'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            )
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-app-border px-4 py-3">
          <div className="flex items-center gap-2 rounded-full bg-app-surfaceAlt px-3 py-2 text-xs text-ink-muted">
            <span>😊</span>
            <span className="flex-1">Type a message…</span>
            <span className="text-accent">➤</span>
          </div>
        </div>
      </div>
    </div>
  );
}
