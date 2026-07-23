import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const categories = [
  {
    title: 'Messaging',
    items: [
      'One-to-one and group conversations',
      'Typing indicators & online presence',
      'Delivered and read receipts',
      'Edit and delete messages (for me / for everyone)',
      'Reply threading and message forwarding',
      'Emoji reactions on any message',
      'Pin important messages, star your own bookmarks',
      'Scheduled messages sent automatically at a future time',
      'In-chat polls with live vote counts',
      '@mentions with autocomplete in group chats',
      'Full-text search — within a chat or across all your chats',
    ],
  },
  {
    title: 'Calls & Media',
    items: [
      'Peer-to-peer voice calls (WebRTC)',
      'Peer-to-peer video calls with camera preview',
      'Screen sharing during an active call',
      'Image, video, audio, and document sharing',
      'Attachment preview with captions before sending',
      'Custom chat wallpapers per conversation',
    ],
  },
  {
    title: 'Account & Social',
    items: [
      'Secure JWT authentication with refresh tokens',
      'Friend requests — send, accept, reject, cancel',
      'Block and unblock other users',
      'Profile editing with avatar upload',
      'Password reset via email',
      'Light and dark mode',
    ],
  },
  {
    title: 'Under the hood',
    items: [
      'Real-time transport via Socket.IO, horizontally scalable with Redis',
      'MongoDB with Mongoose schemas and text-search indexes',
      'Cloudinary-backed media storage',
      'Rate limiting, input sanitization, and Helmet security headers',
      'Structured logging (Winston) and interactive API docs (Swagger)',
      'Automated tests and CI on every push',
    ],
  },
];

export default function Features() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-5xl px-5 py-16">
      <div className="text-center">
        <h1 className="font-display text-4xl font-extrabold">Built for real conversations</h1>
        <p className="mx-auto mt-3 max-w-xl text-ink-muted">
          Every feature below is fully implemented and working — not a mockup.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-2">
        {categories.map((cat) => (
          <div key={cat.title}>
            <h2 className="font-display text-lg font-bold text-accent">{cat.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {cat.items.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm">
                  <span className="mt-0.5 text-accent">✓</span>
                  <span className="text-ink-dark dark:text-ink">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-16 rounded-2xl border border-app-borderLight dark:border-app-border bg-app-surfaceLight dark:bg-app-surface p-8 text-center">
        <h2 className="font-display text-2xl font-bold">See it in action</h2>
        <p className="mt-2 text-sm text-ink-muted">Create a free account — takes less than a minute.</p>
        <Link
          to={user ? '/app' : '/register'}
          className="mt-5 inline-block rounded-full bg-accent px-7 py-3 text-sm font-semibold text-app-bg hover:bg-accent-dark transition-colors"
        >
          {user ? 'Open the app →' : 'Get started free →'}
        </Link>
      </div>
    </div>
  );
}
