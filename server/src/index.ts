import http from 'http';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { GameManager } from './game/GameManager';
import { registerHandlers, type GameServer } from './socket/handlers';

dotenv.config();

const PORT = Number(process.env.PORT ?? 5000);

/**
 * Exact origins allowed by CORS, from CLIENT_URL (comma-separated for more than one,
 * e.g. a production and a preview URL). Trailing slashes are ignored because browsers
 * never send them in the Origin header. Wildcards are rejected.
 */
function parseAllowedOrigins(raw: string | undefined): string[] {
  const origins = (raw ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter((origin) => origin.length > 0);

  if (origins.length === 0) {
    console.error('❌ CLIENT_URL is not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }
  if (origins.some((origin) => origin.includes('*'))) {
    console.error('❌ CLIENT_URL must list exact origins (e.g. https://your-app.vercel.app), not wildcards.');
    process.exit(1);
  }
  return origins;
}

const ALLOWED_ORIGINS = parseAllowedOrigins(process.env.CLIENT_URL);

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

const gameManager = new GameManager();

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    rooms: gameManager.roomCount,
    timestamp: new Date().toISOString(),
  });
});

const httpServer = http.createServer(app);

const io: GameServer = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] },
  // WebSocket first, with HTTP long-polling as a fallback for networks that block WebSockets.
  transports: ['websocket', 'polling'],
  // Generous heartbeats so players on patchy 3G/4G aren't dropped by brief stalls.
  pingTimeout: 60_000,
  pingInterval: 25_000,
  connectTimeout: 45_000,
});

registerHandlers(io, gameManager);

httpServer.listen(PORT, () => {
  console.log(`🎮 Server listening on port ${PORT}`);
  console.log(`📤 Accepting connections from ${ALLOWED_ORIGINS.join(', ')}`);
});
