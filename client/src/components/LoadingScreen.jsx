export default function LoadingScreen() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-app-bgLight dark:bg-app-bg">
      <div className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 rounded-full bg-accent animate-typingDot" style={{ animationDelay: '0ms' }} />
        <span className="h-2.5 w-2.5 rounded-full bg-accent animate-typingDot" style={{ animationDelay: '150ms' }} />
        <span className="h-2.5 w-2.5 rounded-full bg-accent animate-typingDot" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
