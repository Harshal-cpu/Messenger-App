import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-app-borderLight dark:border-app-border bg-app-bgLight dark:bg-app-bg">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-app-bg">
                💬
              </span>
              Messenger
            </Link>
            <p className="mt-3 max-w-xs text-sm text-ink-muted">
              A real-time messaging platform built with React, Node.js, Socket.IO,
              and MongoDB — open-source and built for learning production
              patterns end to end.
            </p>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Product
            </p>
            <ul className="space-y-2 text-sm">
              <li><Link to="/features" className="hover:text-accent">Features</Link></li>
              <li><Link to="/register" className="hover:text-accent">Get Started</Link></li>
              <li><Link to="/login" className="hover:text-accent">Sign In</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Company
            </p>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="hover:text-accent">About</Link></li>
              <li><Link to="/contact" className="hover:text-accent">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-app-borderLight dark:border-app-border pt-6 text-xs text-ink-muted md:flex-row">
          <p>© {new Date().getFullYear()} Messenger. Built as a portfolio project.</p>
          <div className="flex gap-4">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-accent">
              GitHub
            </a>
            <span>Made with React, Node.js & Socket.IO</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
