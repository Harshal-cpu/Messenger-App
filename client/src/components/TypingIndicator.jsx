export default function TypingIndicator({ name }) {
  return (
    <div className="flex justify-start px-4 py-1">
      <div className="rounded-2xl rounded-bl-sm bg-app-surfaceLight dark:bg-app-surface px-4 py-3 shadow-bubble flex items-center gap-2">
        {name && <span className="text-xs text-ink-muted mr-1">{name}</span>}
        <span className="h-1.5 w-1.5 rounded-full bg-ink-muted animate-typingDot" style={{ animationDelay: '0ms' }} />
        <span className="h-1.5 w-1.5 rounded-full bg-ink-muted animate-typingDot" style={{ animationDelay: '150ms' }} />
        <span className="h-1.5 w-1.5 rounded-full bg-ink-muted animate-typingDot" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
