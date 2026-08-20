export default function Avatar({ user, size = 'md', showOnline = false }) {
  const sizes = { sm: 'h-8 w-8', md: 'h-11 w-11', lg: 'h-20 w-20' };
  const dotSizes = { sm: 'h-2 w-2', md: 'h-2.5 w-2.5', lg: 'h-4 w-4' };
  const fallbackSrc =
    'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(user?.name || '?');

  return (
    <div className="relative shrink-0">
      <img
        src={user?.avatar?.url || fallbackSrc}
        alt={user?.name}
        loading="lazy"
        decoding="async"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = fallbackSrc;
        }}
        className={`${sizes[size]} rounded-full object-cover bg-app-border dark:bg-app-surfaceAlt`}
      />
      {showOnline && (
        <span
          className={`absolute bottom-0 right-0 ${dotSizes[size]} rounded-full border-2 border-app-bgLight dark:border-app-bg ${
            user?.isOnline ? 'bg-green-500' : 'bg-ink-muted'
          }`}
        />
      )}
    </div>
  );
}
