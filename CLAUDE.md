# Raja Mantri Chor Sipahi — Project Context for Claude Code

## What We Are Building
A production-grade real-time multiplayer web game for exactly 4 players, playable from
different locations. Based on the classic Indian card game popular in Uttar Pradesh and
Bihar. Players are secretly assigned roles and the Sipahi must identify the Chor.

## Monorepo Structure
This is a monorepo with two subdirectories:
- `client/` — React + Vite + TypeScript frontend (deploys to Vercel)
- `server/` — Node.js + Express + Socket.io backend (deploys to Railway)

Both must be kept in the same repository root.

---

## Tech Stack — EXACT Packages and Versions

### Server (server/)
- Node.js 20 LTS
- TypeScript 5.4
- express 4.19
- socket.io 4.7
- cors 2.x
- uuid 9.x
- dotenv 16.x
- ts-node-dev 2.x (devDependency)
- @types/express, @types/cors, @types/uuid, @types/node (devDependencies)

### Client (client/)
- React 18 + TypeScript (via Vite template react-ts)
- Vite 5.x
- tailwindcss 3.4 + postcss + autoprefixer
- framer-motion 11.x
- socket.io-client 4.7
- react-router-dom 6.x
- zustand 5.x
- react-hot-toast 2.x
- Google Fonts: Cinzel (700,900), Poppins (400,500,600,700), JetBrains Mono (400,500)

---

## Project Folder Structure

```
raja-mantri-chor-sipahi/
├── CLAUDE.md                          ← This file
├── .gitignore
│
├── server/
│   ├── src/
│   │   ├── game/
│   │   │   ├── types.ts              ← All TypeScript interfaces & enums
│   │   │   ├── Room.ts               ← Room class: state machine, scoring, logic
│   │   │   └── GameManager.ts        ← Registry of all active rooms
│   │   ├── socket/
│   │   │   └── handlers.ts           ← All socket.io event listeners
│   │   └── index.ts                  ← Express server + Socket.io bootstrap
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
└── client/
    ├── public/
    │   └── sounds/                   ← shuffle.mp3, reveal.mp3, correct.mp3,
    │                                    wrong.mp3, win.mp3
    ├── src/
    │   ├── components/
    │   │   ├── ui/
    │   │   │   ├── Button.tsx
    │   │   │   ├── Badge.tsx
    │   │   │   └── Spinner.tsx
    │   │   ├── game/
    │   │   │   ├── ChitCard.tsx      ← Animated role card (private reveal)
    │   │   │   ├── PlayerCard.tsx    ← Player avatar in lobby and game
    │   │   │   ├── GuessPanel.tsx    ← Sipahi's two mystery cards + timer
    │   │   │   ├── RoundResult.tsx   ← All roles revealed + score delta
    │   │   │   └── Scoreboard.tsx    ← Running total scores table
    │   │   └── layout/
    │   │       └── PageWrapper.tsx
    │   ├── pages/
    │   │   ├── HomePage.tsx          ← Create Room / Join Room
    │   │   ├── LobbyPage.tsx         ← Waiting room, player list, share link
    │   │   └── GamePage.tsx          ← Full game: all phases rendered here
    │   ├── hooks/
    │   │   ├── useSocket.ts          ← Socket.io connection + all events
    │   │   └── useAudio.ts           ← Sound effect playback
    │   ├── store/
    │   │   └── gameStore.ts          ← Zustand store for all game state
    │   ├── types/
    │   │   └── game.types.ts         ← Shared TS types (mirror server types)
    │   ├── utils/
    │   │   └── helpers.ts            ← Room code formatting, timer utils
    │   ├── App.tsx
    │   ├── main.tsx
    │   └── index.css                 ← Tailwind directives + Google Fonts import
    ├── .env
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── vite.config.ts

---

## Game Rules — UP/Bihar Variant (IMPORTANT)

### The 4 Roles
| Role    | Hindi    | Points if condition met |
|---------|----------|------------------------|
| Raja    | King     | 1000 pts — always      |
| Mantri  | Minister | 500 pts — always       |
| Sipahi  | Soldier  | 800 pts — only if correct guess |
| Chor    | Thief    | 800 pts — only if Sipahi wrong |

### Round Flow (7 Phases)
1. LOBBY — Players join room with 6-char code
2. CHIT_DEALING — Server assigns roles privately, players see their own via card flip
3. RAJA_REVEAL — Raja reveals to all, clicks "Mera Sipahi Kaun Hai?"
4. SIPAHI_REVEAL — Sipahi reveals themselves, clicks "Main Sipahi Hoon!"
5. SIPAHI_GUESSING — Sipahi sees 2 mystery cards, picks one (15-second timer)
6. ROUND_RESULT — All roles revealed, scores shown, 3s delay then next round
7. GAME_OVER — After 10 rounds, final winner, Play Again option

### Scoring Logic (implement in Room.ts)
```typescript
if (sipahiGuessedCorrectly) {
  sipahiScore += 800;
  chorScore += 0;
} else {
  sipahiScore += 0;
  chorScore += 800;   // Chor steals Sipahi's points
}
rajaScore += 1000;    // Always
mantriScore += 500;   // Always
```

---

## All Socket Events

### Client → Server (socket.emit)
| Event              | Payload                          | When                        |
|--------------------|----------------------------------|-----------------------------|
| create_room        | { playerName: string }           | User clicks Create Room     |
| join_room          | { roomCode: string, playerName } | User enters code and joins  |
| update_name        | { name: string }                 | Player edits name in lobby  |
| start_game         | {}                               | Host starts (4 players)     |
| raja_calls_sipahi  | {}                               | Raja clicks call button     |
| sipahi_reveal      | {}                               | Sipahi reveals self         |
| sipahi_guess       | { targetPlayerId: string }       | Sipahi clicks mystery card  |
| play_again         | {}                               | Game over, play again       |
| rejoin_room        | { roomCode, playerId, reconnectToken } | After refresh / reconnect |
| leave_room         | {}                               | Player leaves (e.g. Home)   |
| time_sync          | {} + ack → { serverNow }         | Clock sync for countdowns   |

### Server → Client (socket.emit / io.to().emit)
| Event              | Payload                                            | To              |
|--------------------|----------------------------------------------------|-----------------|
| room_created       | { roomCode, playerId, player, reconnectToken }     | Creator only    |
| room_joined        | { roomCode, playerId, players, reconnectToken }    | Joiner only     |
| room_rejoined      | { gameState, myRole, guessing, lastRoundResult, gameOver, roundHistory, … } | Rejoiner only |
| session_replaced   | { message }                                        | Old socket of a rejoined player |
| room_update        | { players, playerCount, hostId }                   | All in room     |
| game_started       | { gameState, roundNumber }                         | All in room     |
| phase_changed      | { gameState }  — sent on every phase transition   | All in room     |
| role_assigned      | { role, points }                                   | Each privately  |
| raja_revealed      | { rajaPlayerId, rajaName }                         | All in room     |
| sipahi_revealed    | { sipahiPlayerId, sipahiName }                     | All in room     |
| sipahi_guessing    | { hiddenPlayers, timerSeconds: 15, endsAt }        | All in room     |
| round_result       | { guessedPlayerId, correct, roles, roundScores, totalScores, round, nextPhaseAt } | All in room |
| game_over          | { finalScores, winner, roundHistory }              | All in room     |
| player_disconnected| { playerName, remainingCount }                     | All remaining   |
| error              | { message: string, code: string }                  | Relevant player |

---

## TypeScript Types (types.ts and game.types.ts)

```typescript
export type Role = 'raja' | 'mantri' | 'sipahi' | 'chor';

export type GamePhase =
  | 'LOBBY'
  | 'CHIT_DEALING'
  | 'RAJA_REVEAL'
  | 'SIPAHI_REVEAL'
  | 'SIPAHI_GUESSING'
  | 'ROUND_RESULT'
  | 'GAME_OVER';

export interface Player {
  id: string;           // stable uuid (NOT socket.id) — survives reconnects
  name: string;
  isHost: boolean;
  isConnected: boolean;
  totalScore: number;
  role?: Role;          // Only populated after dealing, only sent privately
}

export interface Room {
  code: string;
  players: Player[];
  phase: GamePhase;
  currentRound: number;  // 1–10
  maxRounds: number;     // 10
  hostId: string;
  rajaId?: string;
  sipahiId?: string;
  guessTimer?: NodeJS.Timeout;
  roundHistory: RoundResult[];
}

export interface RoundResult {
  round: number;
  rajaId: string;
  mantriId: string;
  sipahiId: string;
  chorId: string;
  guessedPlayerId: string | null;  // null when the 15s timer expired (counts as wrong)
  correct: boolean;
  roundScores: Record<string, number>;
}
```

---

## Design System — Visual Identity

### Colors (use in Tailwind config and CSS)
```
--bg:       #070B14   (page background, very dark navy)
--surface:  #0C1526   (section backgrounds)
--card:     #111D38   (card backgrounds)
--border:   #1C2E50   (borders)
--gold:     #F59E0B   (primary accent — saffron/royal)
--gold-l:   #FCD34D   (lighter gold for text)
--red:      #EF4444   (Chor, danger, wrong)
--blue:     #60A5FA   (Mantri, info)
--green:    #34D399   (Sipahi correct, success)
--orange:   #FB923C   (Raja)
--purple:   #A78BFA   (accents)
--text:     #F1F5F9   (primary text)
--muted:    #94A3B8   (secondary text)
```

### Role Colors
- Raja → orange (#FB923C) + crown emoji 👑
- Mantri → blue (#60A5FA) + scroll emoji 📜
- Sipahi → green (#34D399) + sword emoji ⚔️
- Chor → red (#EF4444) + thief emoji 🦹

### Typography
- Headings/titles: font-family Cinzel (serif, royal feel)
- Body/UI: font-family Poppins (clean, readable)
- Code/scores: font-family JetBrains Mono

### Tailwind Config Extensions
```typescript
fontFamily: {
  cinzel: ['"Cinzel"', 'serif'],
  poppins: ['"Poppins"', 'sans-serif'],
  mono: ['"JetBrains Mono"', 'monospace'],
},
colors: {
  royal: {
    dark:    '#070B14',
    surface: '#0C1526',
    card:    '#111D38',
    border:  '#1C2E50',
    gold:    '#F59E0B',
    'gold-l':'#FCD34D',
  }
}
```

---

## Coding Standards

- TypeScript strict mode: ON. No `any` types anywhere.
- All socket payloads must be typed interfaces
- Server Room.ts must use a class with proper encapsulation
- Use `uuid` v4 for room codes formatted as first 6 chars uppercase
- Client state in Zustand store only — no prop drilling
- Framer Motion for all animations (card flips, transitions, score count-up)
- react-hot-toast for all notifications (player joined, disconnected, errors)
- All server-side console.logs use emoji prefixes: ✅ ❌ 👑 🎮 📤
- No hardcoded URLs — always use environment variables
- CORS: only allow CLIENT_URL from .env
- Server validates all inputs (name length 1–20 chars, room code 6 uppercase chars)
- Room cleanup: delete rooms when all players disconnect

---

## Environment Variables

### server/.env
```
PORT=5000
CLIENT_URL=http://localhost:5173
```

### client/.env
```
VITE_SERVER_URL=http://localhost:5000
```

---

## Development Phases

- Phase 1: Foundation — project scaffold, installs, health check, basic socket connection
- Phase 2: Server Game Engine — types.ts, Room.ts, GameManager.ts, handlers.ts (full game logic)
- Phase 3: Client Lobby — useSocket, gameStore, HomePage, LobbyPage
- Phase 4: Client Game — all game phase screens in GamePage
- Phase 5: Polish — animations, sounds, error handling, mobile
- Phase 6: Deploy — Railway (server) + Vercel (client)

---

## Reconnection

- Player ids are stable uuids. The server maps each player to their current socket.
- `room_created` / `room_joined` send a private `reconnectToken`. The client saves
  { roomCode, playerId, reconnectToken } in sessionStorage + localStorage.
- On reconnect or page refresh the client emits `rejoin_room`; the server replies with
  `room_rejoined` (full catch-up snapshot) or `error` (ROOM_NOT_FOUND / REJOIN_FAILED).
- Lobby seats are held for 20s after a disconnect; in-game seats are kept until the game ends.
- Rooms with nobody connected are kept for 60s so players can rejoin.
- The server acts for a disconnected Raja/Sipahi after 5s; a disconnected Sipahi's guess times out.

## Timing & fairness

- `endsAt` / `nextPhaseAt` are server-clock epoch ms. Clients estimate the server clock with
  `time_sync` (utils/serverClock.ts) so all four screens show the same countdown.
- Ties after round 10 are won by the player who joined the room first.
- Socket.io: websocket + polling, pingTimeout 60s, pingInterval 25s, connectTimeout 45s.
- CLIENT_URL may be a comma-separated list of exact origins; wildcards are rejected.

## Key Rules for Claude Code

1. Always use TypeScript. Never use JavaScript files in src/.
2. Always keep server and client in separate subdirectories.
3. Never commit .env files (add to .gitignore).
4. Use socket.to(roomCode).emit() to broadcast to a room (excluding sender).
5. Use io.to(roomCode).emit() to broadcast to all including sender.
6. Roles are assigned FRESH every round — shuffle and redistribute each time.
7. The Sipahi's role is PRIVATE — never broadcast it to others until SIPAHI_REVEAL phase.
8. Room codes are 6 uppercase alphanumeric characters (not UUID).
9. The 15-second timer is server-side — not client-side.
10. When a player disconnects mid-game, broadcast player_disconnected to remaining players.
