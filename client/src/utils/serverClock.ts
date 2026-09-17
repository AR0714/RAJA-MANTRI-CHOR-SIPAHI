import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, TimeSyncResponse } from '../types/game.types';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SAMPLES = 4;
const SAMPLE_TIMEOUT_MS = 3000;

/** Estimated `serverClock - localClock` in milliseconds. */
let offsetMs = 0;
let syncing = false;

/**
 * Current time on the server's clock. Countdowns use this so every player,
 * whatever their device clock or network delay, sees the same number.
 */
export function serverNow(): number {
  return Date.now() + offsetMs;
}

function sample(socket: GameSocket): Promise<{ offset: number; rtt: number } | null> {
  return new Promise((resolve) => {
    const sentAt = Date.now();
    socket.timeout(SAMPLE_TIMEOUT_MS).emit('time_sync', {}, (err: Error | null, response: TimeSyncResponse) => {
      if (err) {
        resolve(null);
        return;
      }
      const receivedAt = Date.now();
      const rtt = receivedAt - sentAt;
      // Assume the reply took half the round trip (NTP-style estimate).
      resolve({ offset: response.serverNow + rtt / 2 - receivedAt, rtt });
    });
  });
}

/** Measures the clock offset a few times and keeps the lowest-latency sample. */
export async function syncServerClock(socket: GameSocket): Promise<void> {
  if (syncing || !socket.connected) return;
  syncing = true;
  try {
    let best: { offset: number; rtt: number } | null = null;
    for (let i = 0; i < SAMPLES; i++) {
      const result = await sample(socket);
      if (result && (!best || result.rtt < best.rtt)) best = result;
    }
    if (best) offsetMs = best.offset;
  } finally {
    syncing = false;
  }
}
