export function ChatListSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl p-3 animate-pulse">
          <div className="h-11 w-11 rounded-full bg-app-border dark:bg-app-surfaceAlt" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded bg-app-border dark:bg-app-surfaceAlt" />
            <div className="h-2.5 w-1/2 rounded bg-app-border dark:bg-app-surfaceAlt" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessagesSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <div
            className="h-10 rounded-2xl bg-app-border dark:bg-app-surfaceAlt animate-pulse"
            style={{ width: `${120 + (i % 3) * 60}px` }}
          />
        </div>
      ))}
    </div>
  );
}
