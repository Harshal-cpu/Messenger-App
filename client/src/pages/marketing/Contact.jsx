import { motion } from 'framer-motion';

export default function Contact() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16 md:py-24 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-3">Contact</p>
        <h1 className="font-display text-3xl md:text-4xl font-extrabold">Get in touch</h1>
        <p className="mt-4 text-ink-muted">
          Questions, feedback, or found a bug? Reach out — we'd genuinely like to hear it.
        </p>

        <div className="mt-10 grid sm:grid-cols-2 gap-4 text-left">
          <a
            href="mailto:hello@messenger-app.example"
            className="rounded-2xl border border-app-borderLight dark:border-app-border p-5 hover:border-accent/50 transition-colors"
          >
            <p className="text-sm font-semibold">✉️ Email</p>
            <p className="mt-1 text-sm text-ink-muted">hello@messenger-app.example</p>
          </a>
          <div className="rounded-2xl border border-app-borderLight dark:border-app-border p-5">
            <p className="text-sm font-semibold">💬 In-app support</p>
            <p className="mt-1 text-sm text-ink-muted">
              Already have an account? Message support directly from the app.
            </p>
          </div>
        </div>

        <p className="mt-10 text-xs text-ink-muted">
          This is a demonstration project — the email above is illustrative rather than monitored.
        </p>
      </motion.div>
    </div>
  );
}
