const stack = [
  'React', 'Vite', 'Tailwind CSS', 'Socket.IO', 'Node.js', 'Express',
  'MongoDB', 'Mongoose', 'Redis', 'Cloudinary', 'WebRTC', 'JWT',
];

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="font-display text-4xl font-extrabold">About this project</h1>

      <div className="mt-8 space-y-5 text-ink-dark dark:text-ink leading-relaxed">
        <p>
          This messenger was built as a complete, end-to-end demonstration of what
          a modern real-time messaging platform looks like under the hood —
          from JWT authentication and Socket.IO event design, to WebRTC call
          signaling, media pipelines, and an admin dashboard.
        </p>
        <p>
          Every feature you see — group chats, reactions, polls, scheduled
          messages, @mentions, voice and video calls, message search — is
          fully implemented and wired between a React frontend and a Node.js/
          Express backend, not just mocked for a demo.
        </p>
        <p>
          The goal was to build something that mirrors real production
          patterns: structured logging, rate limiting, input validation,
          automated tests, CI, and interactive API documentation — the parts
          of a real app that don't show up in a screenshot but matter just as
          much as the UI.
        </p>
      </div>

      <h2 className="mt-12 font-display text-xl font-bold">Built with</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {stack.map((tech) => (
          <span
            key={tech}
            className="rounded-full border border-app-borderLight dark:border-app-border px-3 py-1.5 text-xs font-medium"
          >
            {tech}
          </span>
        ))}
      </div>
    </div>
  );
}
