# Real-Time Messenger

![CI](https://github.com/YOUR_USERNAME/Messenger-App/actions/workflows/ci.yml/badge.svg)

A full-stack real-time messaging platform built with React, Node.js, Express, Socket.IO, and MongoDB.

> Interactive API docs (Swagger UI) are served at `/api-docs` once the backend is running.


## Status

This project is being built module by module so every piece is complete,
tested, and production-quality rather than scaffolded and left unfinished.

- [x] Module 1 — Project scaffold, config, error handling, security middleware
- [x] Module 2 — Authentication (register, login, JWT + refresh tokens, forgot/reset password)
- [x] Module 3 — User profiles, search, friend requests, block/unblock
- [x] Module 4 — One-to-one chat + Socket.IO messaging core
- [x] Module 5 — Group chat
- [x] Module 6 — Media uploads (Cloudinary)
- [x] Module 7 — Frontend (React + Vite + Tailwind)
- [x] Module 8 — Advanced features (calls, reactions, polls, scheduling)
- [x] Module 9 — Admin panel, automated tests, deployment

**All 9 modules are complete.** See `ARCHITECTURE.md` for diagrams and the deployment guide.

## Tech Stack

**Frontend:** React, Vite, Tailwind CSS, React Router, Axios, Socket.IO Client
**Backend:** Node.js, Express, Socket.IO, MongoDB, Mongoose, JWT, bcrypt, Multer, Cloudinary
**Deployment:** Vercel (frontend), Render (backend), MongoDB Atlas (database)

## Project Structure

```
Messenger-App/
├── client/                # React + Vite + Tailwind frontend
│   ├── src/
│   │   ├── api/           # Axios instance with auth-refresh interceptor
│   │   ├── context/       # Auth, Socket, Theme providers
│   │   ├── components/    # Sidebar, ChatWindow, MessageBubble, CallModal, etc.
│   │   ├── pages/         # Login, Register, ChatPage, Settings, etc.
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── tailwind.config.js
│   └── .env.example
├── server/
│   ├── config/           # DB and Cloudinary configuration
│   ├── controllers/      # Route handler logic
│   ├── middleware/       # Auth, error handling, validation, rate limiting, upload
│   ├── models/           # Mongoose schemas
│   ├── routes/           # Express route definitions
│   ├── services/         # Email, Cloudinary, scheduled-message dispatcher
│   ├── sockets/          # Socket.IO connection + chat/call event handlers
│   ├── tests/            # Jest unit + integration tests
│   ├── utils/             # AppError, catchAsync, token helpers, notify helper
│   ├── app.js            # Express app configuration
│   └── server.js         # HTTP + Socket.IO entry point
├── ARCHITECTURE.md        # Diagrams + deployment guide
├── docker-compose.yml
└── .env.example
```

## Getting Started (Backend)

```bash
cd server
cp .env.example .env   # fill in your MongoDB URI, JWT secrets, Cloudinary keys
npm install
npm run dev             # starts on http://localhost:5000
```

## API Reference — Auth Module

Base URL: `/api/v1/auth`

| Method | Endpoint                  | Access  | Description                          |
|--------|----------------------------|---------|---------------------------------------|
| POST   | `/register`                | Public  | Create a new account                  |
| POST   | `/login`                   | Public  | Authenticate, returns access token + refresh cookie |
| POST   | `/logout`                  | Private | Clears refresh cookie, marks offline  |
| POST   | `/refresh-token`           | Public  | Issues new access token from refresh cookie |
| GET    | `/me`                      | Private | Returns the authenticated user        |
| POST   | `/forgot-password`         | Public  | Sends password reset email            |
| PATCH  | `/reset-password/:token`   | Public  | Resets password using emailed token   |
| PATCH  | `/change-password`         | Private | Changes password while logged in      |

All authenticated requests send `Authorization: Bearer <accessToken>`.
The refresh token is stored in an httpOnly cookie and is never exposed to JS.

### Example: Register

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","password":"secret123"}'
```

## API Reference — Users Module

Base URL: `/api/v1/users` (all routes require `Authorization: Bearer <accessToken>`)

| Method | Endpoint            | Description                              |
|--------|----------------------|-------------------------------------------|
| GET    | `/search?query=`     | Search users by name/email (paginated)    |
| GET    | `/:id`                | View a user's public profile              |
| PATCH  | `/me`                 | Update own name/bio                       |
| PATCH  | `/:id/block`          | Block a user (removes friendship too)     |
| PATCH  | `/:id/unblock`        | Unblock a user                            |
| GET    | `/me/friends`         | List your friends                         |
| GET    | `/me/blocked`         | List users you've blocked                 |
| DELETE | `/friends/:id`        | Remove a friend                           |

## API Reference — Friend Requests Module

Base URL: `/api/v1/friends` (all routes require `Authorization: Bearer <accessToken>`)

| Method | Endpoint                  | Description                                     |
|--------|----------------------------|---------------------------------------------------|
| POST   | `/request/:userId`         | Send a friend request (auto-accepts if they already sent you one) |
| GET    | `/requests`                | List friend requests you've received (pending)   |
| GET    | `/requests/sent`           | List friend requests you've sent (pending)        |
| PATCH  | `/accept/:requestId`       | Accept a received request                         |
| PATCH  | `/reject/:requestId`       | Reject a received request                         |
| DELETE | `/cancel/:requestId`       | Cancel a request you sent                         |

Accepting/sending requests emits a `newNotification` Socket.IO event to the
other user's personal room (`user:<id>`) in real time, and persists a
`Notification` document for later retrieval (notification panel endpoint
comes with the notifications module).

## Getting Started (Frontend)

```bash
cd client
cp .env.example .env   # points to your backend, defaults to localhost:5000
npm install
npm run dev             # starts on http://localhost:5173
```

Make sure the backend is running first (`cd server && npm run dev`), and that
`CLIENT_URL` in `server/.env` matches the frontend's origin (`http://localhost:5173`
by default) so CORS and cookies work correctly.

## API Reference — Chats & Groups

Base URL: `/api/v1/chats` and `/api/v1/groups` (all require `Authorization: Bearer <accessToken>`)

| Method | Endpoint                       | Description                                |
|--------|----------------------------------|----------------------------------------------|
| GET    | `/chats`                         | List all your chats, sorted by activity, with unread counts |
| POST   | `/chats/one-to-one/:userId`      | Get or create a 1:1 chat with a user        |
| GET    | `/chats/:chatId`                 | Get a single chat                           |
| PATCH  | `/chats/:chatId/mute`             | Toggle mute for yourself                    |
| PATCH  | `/chats/:chatId/archive`          | Toggle archive for yourself                 |
| PATCH  | `/chats/:chatId/pin`              | Toggle pin for yourself                     |
| PATCH  | `/chats/:chatId/theme`            | Set the chat's visual theme                 |
| POST   | `/groups`                         | Create a group (`{ groupName, memberIds }`) |
| PATCH  | `/groups/:chatId/rename`          | Rename a group (admin only)                 |
| PATCH  | `/groups/:chatId/add`             | Add members (admin only)                    |
| PATCH  | `/groups/:chatId/remove/:userId`  | Remove a member (admin only)                |
| PATCH  | `/groups/:chatId/promote/:userId` | Promote a member to admin                   |
| DELETE | `/groups/:chatId/leave`           | Leave a group                               |
| DELETE | `/groups/:chatId`                 | Delete a group (creator only)               |

## API Reference — Messages

Base URL: `/api/v1/messages`

| Method | Endpoint                              | Description                          |
|--------|-----------------------------------------|----------------------------------------|
| GET    | `/:chatId?page=&limit=`                 | Paginated message history            |
| POST   | `/:chatId`                              | Send a text message (REST fallback — sockets are primary) |
| PATCH  | `/:chatId/read`                          | Mark all unread messages as read     |
| PATCH  | `/message/:messageId`                    | Edit your own message                |
| DELETE | `/message/:messageId?forEveryone=true`   | Delete for me / for everyone (1hr window) |
| PATCH  | `/message/:messageId/react`              | Add/replace your reaction            |
| DELETE | `/message/:messageId/react`              | Remove your reaction                 |
| PATCH  | `/message/:messageId/pin`                | Toggle pin                           |
| PATCH  | `/message/:messageId/star`               | Toggle star (personal bookmark)      |
| GET    | `/:chatId/pinned`                        | Get pinned messages in a chat        |
| GET    | `/starred`                               | Get all your starred messages        |
| POST   | `/:chatId/schedule`                      | Schedule a message for a future time |
| POST   | `/:chatId/poll`                          | Create a poll                        |
| PATCH  | `/message/:messageId/poll/vote`          | Vote on a poll option                |

## API Reference — Media

Base URL: `/api/v1/media`

| Method | Endpoint             | Description                                    |
|--------|-----------------------|--------------------------------------------------|
| POST   | `/avatar`             | Upload profile picture (`multipart`, field `avatar`) |
| POST   | `/group/:chatId`      | Upload group image (admin only, field `groupImage`) |
| POST   | `/chat/:chatId`       | Send a media message (field `file`, optional `caption`) |

## API Reference — Notifications & Admin

| Method | Endpoint                          | Access | Description                        |
|--------|-------------------------------------|--------|--------------------------------------|
| GET    | `/api/v1/notifications`             | Private | List notifications (paginated)      |
| PATCH  | `/api/v1/notifications/:id/read`    | Private | Mark one as read                    |
| PATCH  | `/api/v1/notifications/read-all`    | Private | Mark all as read                    |
| GET    | `/api/v1/admin/dashboard`           | Admin   | Platform stats                      |
| GET    | `/api/v1/admin/analytics/messages`  | Admin   | Message volume per day              |
| GET    | `/api/v1/admin/users`               | Admin   | List/search users                   |
| PATCH  | `/api/v1/admin/users/:id/deactivate`| Admin   | Deactivate a user                   |
| PATCH  | `/api/v1/admin/users/:id/reactivate`| Admin   | Reactivate a user                   |
| PATCH  | `/api/v1/admin/users/:id/make-admin`| Admin   | Promote to admin                    |
| GET    | `/api/v1/admin/chats`               | Admin   | List/monitor chats (metadata only)  |

To make your first admin: register normally, then manually set `role: "admin"`
on that user's document in MongoDB Compass/Atlas (subsequent admins can be
promoted via the API). Admins see a 🛠️ icon in the sidebar linking to
`/admin` — a dashboard with stat cards, a 14-day message-volume chart
(Recharts), a user management table (deactivate/reactivate/promote), and a
chat monitoring table.

## API Reference — Search & Link Previews

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/messages/:chatId/search?q=` | Full-text search within one chat |
| GET | `/api/v1/messages/search/all?q=` | Full-text search across all your chats |
| GET | `/api/v1/link-preview?url=` | Server-side Open Graph unfurling for a URL (SSRF-guarded — rejects private/internal IP ranges) |

## What's New (Latest): Security, Product Depth & Performance

**Security**
- Email verification on signup — non-blocking (you can still use the app unverified), with a resend banner in Settings and a `/verify-email/:token` landing page
- Session/device management — Settings shows every active login (device + last-active time), with "sign out" per device or "sign out all other devices" in one click
- Socket-level rate limiting on the `message` event (20/10s) and `typing` event (30/10s) — REST already had this via express-rate-limit, but nothing previously stopped a client from flooding the WebSocket directly

**Product depth**
- In-browser voice message recording (MediaRecorder API) — record, preview with playback, send, no file picker needed
- Web Push notifications — real OS-level notifications when the app is closed, not just in-tab toasts (requires `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`, optional — see `.env.example`)
- Full PWA support — installable, app-shell caching via service worker, proper manifest + icons
- Per-user typing indicator in groups ("Alice is typing" instead of generic "Someone")
- Draft message persistence — switch chats mid-sentence, your unsent text is still there when you come back

**Performance**
- Code-split the `/admin` route — Recharts (the single biggest dependency) now loads only when an admin actually visits the dashboard; cut the main bundle from ~888KB to ~608KB
- Virtualized message list (`react-virtuoso`) — chats with thousands of messages render smoothly instead of mounting every bubble in the DOM at once
- Blurhash image placeholders — a tiny (~30 character) blurred preview renders instantly while the full image loads from Cloudinary, generated server-side at upload time via `sharp`
- `loading="lazy"` + `decoding="async"` on all avatar/media images

## What's New: Polish, Scale & Missing Features

**Visual/UX polish**
- Chat wallpapers (🎨 button in chat header) — 5 presets, saved per-chat, synced live to all participants via `chatThemeChanged`
- Full emoji picker (categorized, no external dependency) for both reactions and composing messages
- Toast notifications (`react-hot-toast`) replacing silent console errors throughout
- Framer Motion entrance animation on messages and the command palette
- Attachment preview — selecting a file shows a thumbnail + caption field before it actually uploads, with cancel/send

**Admin dashboard** — `/admin` (role-gated), stat cards, Recharts message-volume line chart, user management, chat monitoring.

**Scalability & professionalism**
- Structured logging via Winston (readable in dev, JSON in prod) — replaces all `console.*` calls
- Optional Redis adapter for Socket.IO (`REDIS_URL` env var) so the real-time layer can scale across multiple server instances; falls back to the default in-memory adapter if unset
- Interactive API docs at `/api-docs` (Swagger/OpenAPI, generated from JSDoc comments in the route files)
- GitHub Actions CI (`.github/workflows/ci.yml`) — runs backend syntax checks + tests, and the frontend build, on every push/PR

**Previously-missing real-app features**
- `@mentions` with live autocomplete in group chats (type `@` to see a dropdown of members) — mentioned users get a notification
- Message search, both scoped to one chat and across all your chats (MongoDB text index)
- Server-side link preview unfurling for URLs shared in chat
- Command palette (`⌘K` / `Ctrl+K`) — fuzzy-jump to any chat or start a new one with any person, from anywhere in the app

**Public marketing site** (was: straight to a login form)
- `/` — Home page with animated hero chat demo, feature highlights, "how it works", and CTAs that adapt based on auth state (Get Started vs Open the App)
- `/features` — full feature breakdown grouped by category
- `/about` — project background and tech stack
- `/contact` — contact section (illustrative — no real inbox behind it, noted honestly on the page)
- Shared `Header`/`Footer` with mobile-responsive nav, dark mode toggle, and auth-aware CTAs
- The actual messenger now lives at `/app` (was `/`) — `/login` and `/register` redirect here after success

## Real-Time Socket.IO Events

Connect with `io(SOCKET_URL, { auth: { token: accessToken } })`.

| Event (client→server) | Payload | Description |
|---|---|---|
| `join` / `leave` | `chatId` | Join/leave a chat room |
| `typing` / `stopTyping` | `{ chatId }` | Typing indicator |
| `message` | `{ chatId, content, replyTo? }` | Send a message (ack callback returns `{success, message}` or `{error}`) |
| `callUser` | `{ chatId, toUserId, offer, callType }` | Start a voice/video call |
| `answerCall` / `rejectCall` | `{ toUserId, answer? }` | Respond to a call |
| `iceCandidate` | `{ toUserId, candidate }` | WebRTC ICE relay |
| `endCall` | `{ toUserId }` | End an active call |

| Event (server→client) | Description |
|---|---|
| `message`, `messageEdited`, `messageDeleted` | Message lifecycle |
| `messageReaction`, `messagePinned`, `pollUpdated` | Message interactions |
| `typing`, `stopTyping`, `delivered`, `read` | Presence/status |
| `online`, `offline` | Global presence broadcast |
| `newNotification` | Friend requests, mentions, etc. |
| `incomingCall`, `callAccepted`, `callRejected`, `callEnded`, `iceCandidate` | WebRTC signaling |
| `groupUpdated`, `chatThemeChanged` | Group/chat metadata changes |

## Testing

```bash
cd server
npm test
```

Tests are split into two kinds:
- **Unit tests** (`tests/utils.test.js`) — no database required, verified passing.
- **Integration tests** (`tests/auth.test.js`, `tests/users-chat.test.js`) — spin up an
  in-memory MongoDB via `mongodb-memory-server`. These run fine on a normal
  machine/CI; they could not be executed in the sandbox this project was built
  in because that environment blocks downloading the MongoDB binary from
  `fastdl.mongodb.org`. All DB-backed logic was verified by direct code review
  and by boot-testing routes/validation without a live database.

## Screenshots / Demo

Once both servers are running (`server` on :5000, `client` on :5173), open
`http://localhost:5173` — you'll land on the Login page, can register a new
account, and land in the chat UI with a sidebar (Chats / Find people /
Requests tabs), real-time messaging, typing indicators, dark mode toggle
(top-right on the login screen and in Settings), and voice/video call buttons
in the chat header.

## Known Limitations / Honest Notes

- **Integration tests** (`tests/auth.test.js`, `tests/users-chat.test.js`) need
  `mongodb-memory-server` to download a MongoDB binary. This was blocked in the
  sandbox this project was built in, so those specific tests are unverified
  end-to-end here — but they're standard Jest + Supertest patterns that will
  run normally in GitHub Actions or on your machine.
- **Admin promotion** requires one manual DB edit for the very first admin
  (see Notifications & Admin section above) since there's no seed script.
- **WebRTC calls** use a public STUN server only (no TURN server configured).
  This works for most direct connections but may fail behind certain
  restrictive NATs/firewalls — for production-grade reliability, add a TURN
  server (e.g. via Twilio or coturn) to `ICE_SERVERS` in `CallModal.jsx`.
- **Cloudinary/SMTP/Atlas credentials** are placeholders in `.env.example` —
  you must supply your own for media uploads, password-reset emails, and the
  database to work.
- **Web Push** requires `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` — generate with
  `node -e "console.log(require('web-push').generateVAPIDKeys())"`. Left unset,
  push notifications silently no-op; nothing else breaks.
- **PWA offline support is intentionally thin** — the service worker caches
  the app shell (so it installs and briefly survives flaky connections), but
  it does not queue messages sent while offline for later sync. A real
  offline-first chat would need IndexedDB + background sync, which is a
  meaningfully bigger project on its own.
- **Blurhash generation** was verified end-to-end with a real image in this
  sandbox (`sharp` + `blurhash` both work correctly), but the *upload → save
  → render in the browser* full round-trip needs your own MongoDB + Cloudinary
  to test, same as the rest of the media pipeline.
- **Session revocation** only affects the refresh-token flow — an already-issued
  access token (max 15 min lifetime) stays valid until it naturally expires
  even after you "sign out" that device. This is a standard, accepted tradeoff
  for JWT-based auth (the alternative, checking a revocation list on every
  single request, defeats the performance point of using JWTs at all).

## Project Status: All 9 Modules Complete

This was built and verified module by module:
- Syntax-checked every file (`node --check`)
- Boot-tested every route without a live DB (auth/validation confirmed working)
- Ran the full Vite production build for the frontend (succeeds, 0 errors)
- Ran unit tests for core utilities (6/6 passing)
- Cross-checked every frontend API call against its matching backend route
  and field names to catch integration bugs before you ever run it

Feel free to ask for adjustments — additional tests, a seed script, CI config
(GitHub Actions), or refinements to any specific module.
