# Spotly Backend (`spotly-be`)

Backend service for **Spotly**: an Express **REST API** plus a **WebSocket** layer for real-time, location-aware discovery. Users authenticate over HTTP, complete onboarding steps, then connect via WebSockets so the server can bucket them by geographic cell (**H3**), track **availability**, notify **nearby** clients, and bootstrap **1:1 chat rooms** backed by **PostgreSQL**.

This repository is **API-only** (no bundled frontend). The HTTP server listens on `PORT` (default **8000**) and exposes WebSockets on the **same HTTP server** (same origin/port as Express).

---

## What this service does

| Concern | Mechanism |
|--------|-----------|
| **Accounts & sessions** | Sign up / sign in with email + password; short-lived **JWT access tokens** (15 minutes) and **httpOnly** refresh cookies (30 days); refresh rotation with reuse detection |
| **Onboarding** | Authenticated REST steps: join reason → profile → avatar upload → location permission |
| **Live presence & map** | WebSocket events; **Redis** stores per-user profile snippets, lat/lng, H3 cell, and availability; **sets per H3 cell** list user IDs in that cell |
| **Nearby discovery** | When location or visibility changes, the server notifies connected peers in the same H3 cell |
| **Chat handoff** | WebSocket “intent” → peer notification → “accept” creates or reuses a **Prisma `ChatRoom`** with two participants |

---

## Tech stack

- **Runtime**: Node.js, **ES modules** (`"type": "module"` in `package.json`)
- **HTTP**: Express 5
- **Real-time**: `ws` (WebSocketServer attached to the HTTP server)
- **Database**: PostgreSQL via **Prisma 7** (client generated to `generated/prisma`; see `.gitignore`)
- **Cache / realtime state**: Redis (`redis` npm package)
- **Auth**: `jsonwebtoken`, `bcryptjs`, HMAC-hashed refresh tokens in DB
- **Validation**: Joi
- **Avatar uploads**: Multer (memory) + **Cloudinary** (buffer upload helper in `cloudinary.js`)
- **Geospatial indexing**: **h3-js** (latitude/longitude → H3 cell)

---

## Repository layout

```
spotly-Be/
├── app.js                    # Express app, HTTP listen, WebSocketServer bootstrap
├── redis.js                  # Singleton Redis client (connects at import time)
├── cloudinary.js             # Cloudinary upload helpers
├── lib/
│   ├── prisma.js             # PrismaClient with @prisma/adapter-pg
│   └── token.js              # JWT access + refresh token generation/hashing
├── routes/
│   ├── index.js              # Mounts /api/auth and /api/onboarding
│   ├── auth.js
│   └── onboard.js
├── controllers/              # REST handlers (auth, onboarding, errors)
├── middlewares/
│   ├── authenticate.js       # Bearer JWT for REST; exports verifyTokenForWs
│   └── handleFileUpload.js   # Cloudinary pipeline for avatar
├── ws/
│   └── onMessage.js          # JSON envelope router for WebSocket events
├── ws-handlers/              # Per-event WebSocket logic
├── services/                 # getNearbyUsers, findExistingChatRoom, notifyUsers
├── utils/                    # AppError, Joi validate helper, createMockData (Redis demo seed)
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── prisma.config.ts          # Prisma 7 config (DATABASE_URL)
└── validation-schemas.js     # Joi schemas shared by controllers
```

---

## Prerequisites

- **Node.js** (version aligned with project devDependencies; TypeScript 5 / Prisma 7 era)
- **PostgreSQL** (running and reachable via `DATABASE_URL`)
- **Redis** (running and reachable via `REDIS_URL`)

The app **imports and connects to Redis at startup** (`redis.js` uses top-level `await redis.connect()`). If Redis is down, the process will fail when loading modules that depend on it.

---

## Configuration (environment variables)

Create a `.env` file in the project root (`.env` is gitignored). Variables referenced in code:

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (also used by `prisma.config.ts`) |
| `REDIS_URL` | Yes | Redis connection URL |
| `JWT_SECRET` | Yes | Secret for signing/verifying access JWTs (`sub` = user id) |
| `REFRESH_TOKEN_SECRET` | Yes | HMAC secret for hashing refresh tokens stored in `Session.refreshTokenHash` |
| `FRONTEND_ORIGIN` | Strongly recommended | CORS `origin` when using credentials (`credentials: true`) |
| `PORT` | No | HTTP port (default **8000**) |
| `NODE_ENV` | No | When `"production"`, refresh cookies use `secure: true` |
| `H3_Resolution` | No | H3 resolution for `latLngToCell` (default **12** in `ws-handlers/locationHandler.js`) |

**Cloudinary**: `cloudinary.js` is wired for uploads but the `cloud_name` / `api_key` / `api_secret` lines are commented out. For avatar uploads to work end-to-end, you must configure Cloudinary (environment or explicit `cloudinary.v2.config(...)`) per Cloudinary’s docs.

---

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Generate Prisma Client**

   The client output path is `generated/prisma` (see `prisma/schema.prisma`). If that folder is missing after clone:

   ```bash
   npx prisma generate
   ```

3. **Apply migrations**

   ```bash
   npx prisma migrate deploy
   ```

   (Use `npx prisma migrate dev` during local schema iteration.)

4. **Start Redis and PostgreSQL**  
   Example service commands often used in development are noted in `notes.txt` in this repo (Linux/`pg_ctlcluster`-style).

---

## Run

```bash
npm start
```

Runs `tsx app.js` (TypeScript execution for `.js` entry and mixed TS imports such as the generated Prisma client).

Development with auto-restart:

```bash
npm run dev
```

On startup, `createDemoData()` in `utils/createMockData.js` runs **once**: it seeds **synthetic Redis users** (`user_001`, …) inside a fixed H3 cell (`8c589c9847315ff`) so nearby lists can be exercised without real clients. Failures are logged but do not necessarily stop the server.

---

## REST API

Base path: **`/api`**. JSON bodies where applicable. CORS allows the configured frontend origin with **credentials** (cookies).

### Authentication (`/api/auth`)

| Method & path | Auth | Description |
|---------------|------|-------------|
| `POST /api/auth/signup` | No | Create user + session; sets `refresh_token` cookie; returns `{ token, user }` |
| `POST /api/auth/signin` | No | Same cookie + JWT pattern on success |
| `POST /api/auth/refresh` | Cookie | Reads `refresh_token`; rotates refresh token; returns new access `token` |
| `POST /api/auth/signout` | Cookie | Deletes matching session(s), clears cookie |

**Access token**: send as `Authorization: Bearer <jwt>` for protected routes.

**Password rules** (Joi in `validation-schemas.js`): 8–20 characters, at least one digit, lowercase, uppercase, and one non-alphanumeric character.

### Onboarding (`/api/onboarding`)

All routes require **`Authorization: Bearer <access_token>`**.

| Method & path | Body / upload | Effect |
|---------------|---------------|--------|
| `PUT /api/onboarding/join-reason` | `{ "reason": "CASUAL_MEETUP" \| "FRIENDSHIP" \| "ACTIVITY_PARTNER" \| "NETWORKING" }` | Updates `joinReason`, sets onboarding step/status |
| `PUT /api/onboarding/profile-info` | `firstname`, `lastname`, `dateOfBirth` (ISO), `gender` (`MALE` \| `FEMALE`), `bio` | Profile fields (see Joi for optionality) |
| `PUT /api/onboarding/avatar` | `multipart/form-data` field **`avatar`** (image) | Uploads via Cloudinary; persists `avatarUrl` from `imageUrl` set by middleware |
| `PUT /api/onboarding/location-permission` | `{ "permission": "GRANTED" \| "DENIED" }` | Completes onboarding (`onboardingStatus: COMPLETED`) |

### Errors

`controllers/global-error-controller.js` returns JSON shaped like:

```json
{
  "success": false,
  "status": "fail",
  "code": "AUTH_401_INVALID_CREDENTIALS",
  "message": "Human-readable message"
}
```

Non-production responses may include `stack` and raw `err` for debugging.

---

## WebSocket protocol

**Endpoint**: connect to the **same host and port** as the HTTP server (e.g. `ws://localhost:8000`). Path is not filtered in code; the stock `WebSocketServer({ server })` accepts connections on the shared HTTP server.

### Message envelope

Clients send **JSON** strings:

```json
{
  "event": "<event-name>",
  "payload": { }
}
```

If JSON is invalid, the socket closes with code **1003**. Unknown `event` yields an `{ "error": "Unknown event" }` message.

### Authentication rule

Except for **`auth`**, every event requires an authenticated socket: after parsing, if `event !== "auth"` and `ws.userId` is unset, the server closes with **4002** (`unauthenticated`).

### Server event handlers (`ws-handlers/handlers.js`)

| Client `event` | Purpose |
|----------------|---------|
| `auth` | Verify JWT from `payload.token`; register `ws.userId`; store `payload` profile fields and stringified availability in Redis hash `user:<userId>`; reply `{ "event": "auth:success", "data": { "message": "connected" } }` |
| `location:update` | `payload.lat`, `payload.lng` → H3 cell; maintain Redis `user:<id>` geo fields and `h3:<cell>` sets; emit **`nearby:users`** to caller; **`nearby:user:enter`** / **`nearby:user:leave`** to peers when visibility rules apply |
| `availability:update` | Updates Redis availability; if visibility flips, notifies others in same H3 cell |
| `chat:intent` | If caller is `available`, sends **`chat:Request`** to target user’s socket (`payload.userToMessageId`) |
| `chat:accept` | `payload.requestingUserId` — finds or creates `ChatRoom` + participants; sends **`chat:started`** with `{ chatRoomId }` to both sockets |

**Integration detail:** WebSocket `auth` stores the profile picture under Redis field **`avatarUrl`**, while `chat:intent` currently reads **`avatar`** from Redis for the outbound `chat:Request` payload—those names should be aligned in code for correct UI data.

**Important**: Active sockets are tracked in an **in-memory `Map` keyed by `userId`** (`app.js`). Only one server instance should be assumed unless this map is externalized (e.g. Redis + adapter)—see notes below.

### Redis shapes (conceptual)

- **`user:<userId>`** — hash: `firstName`, `lastName`, `bio`, `joinReason`, `avatarUrl`, `availability` (`"available"` \| `"unavailable"`), optional `lat`, `lng`, `h3`
- **`h3:<h3Index>`** — set of user IDs currently associated with that cell

Availability is stored as **strings** (not booleans) because of Redis typing constraints—see `notes.txt`.

---

## Data model (Prisma)

Defined in `prisma/schema.prisma`:

- **`User`** — auth, profile, onboarding enums (`JoinReason`, `OnboardingStatus`, `Gender`, `LocationPermission`), soft-delete and ban flags
- **`Session`** — refresh token hash, expiry, optional `usedAt` for rotation/reuse detection
- **`ChatRoom`** — id, `lastMessageAt` (optional, for future messaging features)
- **`ChatParticipant`** — links users to rooms; unique `(userId, chatRoomId)`
- **`Message`** — stored content linked to room and sender (real-time messaging over WS is not fully wired in handlers; schema supports persistence)

Enums include `VerificationStatus` on the schema but related user fields are commented out—verification is not active in the current model.

---

## Operational notes and limitations

- **Horizontal scaling**: WebSocket routing and `connectionsMap` are process-local. Multiple nodes would not share connection maps unless redesigned (Redis pub/sub, sticky sessions, etc.).
- **Redis lifecycle**: Disconnect and offline cleanup are called out in `notes.txt` as areas for improvement (stale H3 sets, pushing events to offline users).
- **Startup demo seed**: `createDemoData` writes fake users into Redis; coordinate resolution (**12**) and target cell must match your testing expectations.
- **Chat flow**: The handler layer creates/reuses rooms in Postgres; full message sync/history over WebSockets is mostly outlined in comments inside `chatIntentHandler.js`, not implemented as active events.
- **Tests**: `npm test` is a placeholder and exits with an error.

---

## Scripts (`package.json`)

| Script | Command |
|--------|---------|
| `npm start` | `tsx app.js` |
| `npm run dev` | `nodemon --exec 'npm start'` |
| `npm test` | Placeholder (fails by design) |

---

## License

ISC (see `package.json`).
