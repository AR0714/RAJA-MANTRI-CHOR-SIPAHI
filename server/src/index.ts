import http from 'http';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';

dotenv.config();

const PORT = Number(process.env.PORT ?? 5000);
const CLIENT_URL = process.env.CLIENT_URL;

if (!CLIENT_URL) {
  console.error('❌ CLIENT_URL is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const app = express();
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  console.log(`✅ Socket connected: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`❌ Socket disconnected: ${socket.id} (${reason})`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🎮 Server listening on port ${PORT}`);
  console.log(`📤 Accepting connections from ${CLIENT_URL}`);
});
