# 👑 Raja Mantri Chor Sipahi

A real-time multiplayer take on the classic chit game played across Uttar Pradesh and Bihar. Four friends join a room from anywhere, secret roles are dealt every round, and the Sipahi has 15 seconds to catch the Chor.

## How to play

Every round, four folded chits are shuffled and dealt, one per player. Only you see your own chit.

| Chit | Role | Points |
| --- | --- | --- |
| 👑 **Raja** | King | **1000** — always |
| 📜 **Mantri** | Minister | **500** — always |
| ⚔️ **Sipahi** | Soldier | **800** — only if they catch the Chor |
| 🦹 **Chor** | Thief | **800** — only if the Sipahi guesses wrong |

1. **Deal** — everyone flips their chit privately.
2. **Raja reveals** — the Raja announces themselves and asks, *"Mera Sipahi Kaun Hai?"* (Who is my Soldier?)
3. **Sipahi reveals** — the Sipahi steps forward: *"Main Sipahi Hoon!"*
4. **The guess** — the Sipahi sees the other two players (the Mantri and the Chor, but not which is which) and has 15 seconds to accuse one.
5. **Result** — all chits are revealed. A correct guess gives the Sipahi 800; a wrong guess (or running out of time) hands those 800 points to the Chor.

After **10 rounds**, the player with the most points wins.

## Screenshots

> _Add screenshots here — e.g. `docs/home.png`, `docs/lobby.png`, `docs/chit-reveal.png`, `docs/guess.png`, `docs/game-over.png`._

| Home | Lobby | Chit reveal |
| --- | --- | --- |
| _screenshot_ | _screenshot_ | _screenshot_ |

| Sipahi's guess | Round result | Game over |
| --- | --- | --- |
| _screenshot_ | _screenshot_ | _screenshot_ |

## Features

- Private 6-character rooms with copy-to-clipboard and WhatsApp sharing
- Server-authoritative game logic and a server-side guess timer, so clients can't cheat
- Roles are only ever sent to the player who holds them
- Reconnection: refresh the page or lose signal mid-game and you rejoin your seat with your role, score and timer intact
- Animated card flips, staggered result reveals, count-up scores and confetti
- Sound effects with a remembered mute toggle
- Mobile-first layout with 44px touch targets

## Tech stack

**Client** — React 18, TypeScript, Vite 5, Tailwind CSS 3.4, Framer Motion 11, Zustand 5, React Router 6, socket.io-client 4.7, react-hot-toast

**Server** — Node.js 22 LTS, TypeScript 5.4, Express 4.19, Socket.io 4.7, uuid, dotenv, cors

## Project structure

```
raja-mantri-chor-sipahi/
├── client/          React + Vite front end (deploys to Vercel)
│   └── src/
│       ├── components/  UI, game components and per-phase screens
│       ├── hooks/       useSocket, useAudio, useDocumentTitle
│       ├── pages/       HomePage, LobbyPage, GamePage
│       ├── store/       Zustand game store
│       └── types/       Shared types (mirror of the server's)
└── server/          Express + Socket.io back end (deploys to Railway)
    └── src/
        ├── game/        Room state machine, GameManager, types, constants
        └── socket/      Socket event handlers
```

## Local development

**Prerequisites:** Node.js 22 LTS and npm.

```bash
# 1. Server
cd server
npm install
cp .env.example .env
npm run dev          # http://localhost:5000  (health check: /health)

# 2. Client (in a second terminal)
cd client
npm install
cp .env.example .env
npm run dev          # http://localhost:5173
```

To play locally, open four browser tabs (or four devices on your network — set `VITE_SERVER_URL` and `CLIENT_URL` to your machine's LAN address). Create a room in one and join with the code in the others.

### Useful scripts

| Where | Command | What it does |
| --- | --- | --- |
| server | `npm run dev` | Start with auto-reload (ts-node-dev) |
| server | `npm run build` | Compile TypeScript to `dist/` |
| server | `npm start` | Run the compiled server |
| server | `npm run typecheck` | Type-check without emitting |
| client | `npm run dev` | Start the Vite dev server |
| client | `npm run build` | Type-check and build to `dist/` |
| client | `npm run lint` | Run ESLint |
| client | `npm run preview` | Serve the production build locally |

## Environment variables

| Variable | Where | Example | Description |
| --- | --- | --- | --- |
| `PORT` | server | `5000` | Port the HTTP + Socket.io server listens on (Railway sets this for you) |
| `CLIENT_URL` | server | `http://localhost:5173` | Origin of the web client; the only origin allowed by CORS. No trailing slash. |
| `VITE_SERVER_URL` | client | `http://localhost:5000` | URL of the game server. Baked in at build time. |

`.env` files are git-ignored; copy the `.env.example` files to get started.

## Deployment

### Server → Railway

1. Create a Railway project → **Deploy from GitHub repo** → pick this repository.
2. Service **Settings → Source → Root Directory**: `/server`.
3. Service **Settings → Config-as-code → Railway Config File**: `/server/railway.json`
   (Railway does not look inside the root directory for this file). It sets the build
   (`npm run build`), start (`npm start`) and health check (`/health`).
4. **Variables**: `CLIENT_URL` = your Vercel URL. For the very first deploy (before Vercel exists) use
   `http://localhost:5173` and change it later. Do not set `PORT`; Railway provides it.
5. **Settings → Networking → Generate Domain**, then check `https://<domain>/health` returns `{"status":"ok"}`.

Node 22 LTS is selected from `engines` in `server/package.json`. Game state lives in memory, so keep a
**single replica** (rooms are lost on restart or redeploy).

### Client → Vercel

1. **Add New → Project** → import this repository.
2. **Root Directory**: `client`. Vercel detects Vite (build `npm run build`, output `dist`).
3. **Environment Variables**: `VITE_SERVER_URL` = your Railway URL (e.g. `https://xxx.up.railway.app`, no trailing slash).
   It is baked in at build time, so redeploy after changing it.
4. Deploy. `client/vercel.json` rewrites all routes to `index.html` so `/lobby` and `/game` survive a refresh.

After both are live, set the server's `CLIENT_URL` to the exact Vercel URL (comma-separate extra origins such as a custom domain) and redeploy the server.
