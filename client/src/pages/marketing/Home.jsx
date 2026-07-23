import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import LiveChatMockup from '../../components/LiveChatMockup';

const features = [
  {
    icon: '⚡',
    title: 'Real-time messaging',
    desc: 'Instant delivery with typing indicators, read receipts, and live presence — powered by Socket.IO.',
  },
  {
    icon: '👥',
    title: 'Group chats',
    desc: 'Create groups, manage admins, rename, and add or remove members on the fly.',
  },
  {
    icon: '📞',
    title: 'Voice & video calls',
    desc: 'Peer-to-peer WebRTC calls with screen sharing, no third-party service required.',
  },
  {
    icon: '📎',
    title: 'Rich media sharing',
    desc: 'Share images, videos, voice notes, and documents — stored securely via Cloudinary.',
  },
  {
    icon: '😊',
    title: 'Reactions, polls & pins',
    desc: 'React with any emoji, run polls, pin important messages, and schedule sends.',
  },
  {
    icon: '🔍',
    title: 'Smart search & mentions',
    desc: '@mention teammates in group chats and search across every conversation instantly.',
  },
];

const steps = [
  { step: '01', title: 'Create your account', desc: 'Sign up in seconds — no credit card, no setup required.' },
  { step: '02', title: 'Find your people', desc: 'Search for friends or colleagues and send a friend request.' },
  { step: '03', title: 'Start chatting', desc: 'Message, call, share files, and stay in sync in real time.' },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-16 pb-20 text-center md:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block rounded-full bg-accent/15 px-4 py-1.5 text-xs font-semibold text-accent-dark dark:text-accent">
            Real-time • Secure • Open source
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight md:text-6xl">
            Messaging that feels
            <br />
            <span className="text-accent">instant, everywhere.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-ink-muted md:text-lg">
            One-to-one chats, group conversations, voice & video calls, and rich
            media sharing — all in one fast, modern platform.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to={user ? '/app' : '/register'}
              className="rounded-full bg-accent px-7 py-3 text-sm font-semibold text-app-bg shadow-lg shadow-accent/20 hover:bg-accent-dark transition-colors"
            >
              {user ? 'Open the app →' : 'Get started free →'}
            </Link>
            <Link
              to="/features"
              className="rounded-full border border-app-borderLight dark:border-app-border px-7 py-3 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              See all features
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-14 max-w-sm"
        >
          <LiveChatMockup />
        </motion.div>
      </section>

      {/* Features grid */}
      <section className="border-t border-app-borderLight dark:border-app-border bg-app-surfaceLight/50 dark:bg-app-surface/40 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-display text-3xl font-bold">Everything you need to stay connected</h2>
            <p className="mt-3 text-ink-muted">
              Built with the same patterns used in production messaging apps.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-app-borderLight dark:border-app-border bg-app-surfaceLight dark:bg-app-surface p-6 hover:border-accent/50 transition-colors"
              >
                <span className="text-2xl">{f.icon}</span>
                <h3 className="mt-3 font-display font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-ink-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-5">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-display text-3xl font-bold">Get started in three steps</h2>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.step} className="text-center md:text-left">
                <span className="font-display text-4xl font-extrabold text-accent/40">{s.step}</span>
                <h3 className="mt-2 font-display font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-ink-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-app-borderLight dark:border-app-border bg-app-surfaceLight/50 dark:bg-app-surface/40 py-14">
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-6 px-5 text-center">
          <div>
            <p className="font-display text-3xl font-bold text-accent">Instant</p>
            <p className="mt-1 text-xs text-ink-muted">Message delivery</p>
          </div>
          <div>
            <p className="font-display text-3xl font-bold text-accent">P2P</p>
            <p className="mt-1 text-xs text-ink-muted">Voice & video calls</p>
          </div>
          <div>
            <p className="font-display text-3xl font-bold text-accent">Free</p>
            <p className="mt-1 text-xs text-ink-muted">To get started</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-5 py-20 text-center">
        <h2 className="font-display text-3xl font-bold">Ready to start messaging?</h2>
        <p className="mt-3 text-ink-muted">Create your account and start chatting in under a minute.</p>
        <Link
          to={user ? '/app' : '/register'}
          className="mt-7 inline-block rounded-full bg-accent px-8 py-3 text-sm font-semibold text-app-bg shadow-lg shadow-accent/20 hover:bg-accent-dark transition-colors"
        >
          {user ? 'Open the app →' : 'Create your free account →'}
        </Link>
      </section>
    </div>
  );
}
