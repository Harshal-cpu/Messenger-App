# Architecture & Deployment

## Architecture Diagram

```mermaid
flowchart TB
    subgraph Client["Client (Vercel)"]
        React["React + Vite SPA"]
        SocketClient["Socket.IO Client"]
    end

    subgraph Server["Backend (Render)"]
        Express["Express REST API"]
        SocketServer["Socket.IO Server"]
        Middleware["Auth / Validation / Rate Limit"]
    end

    subgraph External["External Services"]
        Atlas[("MongoDB Atlas")]
        Cloudinary["Cloudinary (media)"]
        SMTP["SMTP (password reset)"]
    end

    React -- "REST (Axios)" --> Express
    SocketClient <-- "WebSocket" --> SocketServer
    Express --> Middleware
    Express --> Atlas
    SocketServer --> Atlas
    Express --> Cloudinary
    Express --> SMTP
```

## Sequence Diagram — Sending a Message

```mermaid
sequenceDiagram
    participant A as User A (browser)
    participant S as Socket.IO Server
    participant DB as MongoDB
    participant B as User B (browser)

    A->>S: emit('message', { chatId, content })
    S->>DB: Chat.findOne({_id, participants: A})
    DB-->>S: chat document
    S->>DB: Message.create({...})
    DB-->>S: saved message
    S->>DB: Chat.save({ lastMessage })
    S-->>A: ack via callback({ success: true })
    S-->>B: emit('message', populatedMessage)
    B->>B: append message to chat window
```

## Sequence Diagram — Friend Request

```mermaid
sequenceDiagram
    participant A as Alice
    participant API as REST API
    participant DB as MongoDB
    participant B as Bob (socket)

    A->>API: POST /friends/request/:bobId
    API->>DB: create FriendRequest(pending)
    API->>DB: create Notification(recipient: Bob)
    API-->>B: emit('newNotification') via user:bobId room
    B->>API: PATCH /friends/accept/:requestId
    API->>DB: FriendRequest.status = accepted
    API->>DB: addToSet friends on both users
    API-->>A: emit('newNotification', "Bob accepted...")
```

## ER Diagram

```mermaid
erDiagram
    USER ||--o{ CHAT : "participates in"
    USER ||--o{ MESSAGE : sends
    USER ||--o{ FRIENDREQUEST : "sends/receives"
    USER ||--o{ NOTIFICATION : receives
    CHAT ||--o{ MESSAGE : contains
    MESSAGE ||--o| MESSAGE : "replyTo"

    USER {
        ObjectId _id
        string name
        string email
        string password
        string role
        object avatar
        boolean isOnline
        date lastSeen
        ObjectId[] friends
        ObjectId[] blockedUsers
    }

    CHAT {
        ObjectId _id
        boolean isGroup
        string groupName
        ObjectId[] participants
        ObjectId[] groupAdmins
        ObjectId lastMessage
        ObjectId[] mutedBy
        ObjectId[] archivedBy
        ObjectId[] pinnedBy
        string theme
    }

    MESSAGE {
        ObjectId _id
        ObjectId chat
        ObjectId sender
        string content
        object media
        ObjectId replyTo
        ObjectId[] deliveredTo
        ObjectId[] readBy
        boolean edited
        boolean deletedForEveryone
        object[] reactions
        boolean pinned
        ObjectId[] starredBy
        date scheduledFor
        object poll
    }

    FRIENDREQUEST {
        ObjectId _id
        ObjectId sender
        ObjectId recipient
        string status
    }

    NOTIFICATION {
        ObjectId _id
        ObjectId recipient
        ObjectId sender
        string type
        string message
        boolean read
    }
```

## Deployment Guide

### 1. Database — MongoDB Atlas
1. Create a free cluster at https://cloud.mongodb.com
2. Add a database user and allow network access from `0.0.0.0/0` (or Render's IPs)
3. Copy the connection string for use as `MONGO_URI`

### 2. Backend — Render
1. Push this repo to GitHub
2. On https://render.com, create a **New Web Service** pointing at the `server/` directory
   - Build command: `npm install`
   - Start command: `npm start`
3. Add environment variables from `server/.env.example` in Render's dashboard
   (`MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CLOUDINARY_*`, `SMTP_*`, and
   set `CLIENT_URL` to your Vercel frontend URL once deployed)
4. Deploy — Render gives you a URL like `https://messenger-app-api.onrender.com`

### 3. Frontend — Vercel
1. On https://vercel.com, import the repo, set the root directory to `client/`
2. Framework preset: Vite
3. Add an environment variable `VITE_API_URL` pointing to your Render backend URL
4. Deploy — Vercel gives you a URL like `https://messenger-app.vercel.app`

### 4. Final step
Go back to Render and update `CLIENT_URL` to your actual Vercel URL (needed for
CORS and cookie settings), then redeploy the backend.

### Local development (Docker Compose alternative)
```bash
docker compose up --build
```
This runs MongoDB + the backend together locally using `docker-compose.yml`
and `server/Dockerfile`. Run the frontend separately with `npm run dev` inside `client/`.
