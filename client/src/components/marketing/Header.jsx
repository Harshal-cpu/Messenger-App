import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/features', label: 'Features' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export default function Header() {
  const { user } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-app-borderLight dark:border-app-border bg-app-bgLight/90 dark:bg-app-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-app-bg">
            💬
          </span>
          Messenger
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `transition-colors hover:text-accent ${
                  isActive ? 'text-accent' : 'text-ink-dark dark:text-ink'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <button
            onClick={toggleTheme}
            className="rounded-full p-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            title="Toggle theme"
          >
            {dark ? '☀️' : '🌙'}
          </button>

          {user ? (
            <Link
              to="/app"
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-app-bg hover:bg-accent-dark transition-colors"
            >
              Open App →
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium hover:text-accent">
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-app-bg hover:bg-accent-dark transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-lg p-2 md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-app-borderLight dark:border-app-border px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-3 text-sm font-medium">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => (isActive ? 'text-accent' : '')}
              >
                {link.label}
              </NavLink>
            ))}
            <div className="mt-2 flex gap-3 border-t border-app-borderLight dark:border-app-border pt-3">
              {user ? (
                <Link to="/app" className="text-accent font-semibold">
                  Open App →
                </Link>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileOpen(false)}>
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="text-accent font-semibold"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
