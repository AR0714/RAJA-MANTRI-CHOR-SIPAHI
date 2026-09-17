import { useEffect, useState, type ReactNode } from 'react';
import { socket } from '../../hooks/useSocket';
import { useGameStore } from '../../store/gameStore';
import { Button } from '../ui/Button';
import { FullPageStatus } from './FullPageStatus';

const CONNECT_TIMEOUT_MS = 10_000;

/**
 * Holds the app behind a loading screen until the first socket connection,
 * and while a refreshed page is rejoining its room. Later drops are handled
 * in place with toasts so an in-progress game stays on screen.
 */
export function ConnectionGate({ children }: { children: ReactNode }) {
  const isConnected = useGameStore((s) => s.isConnected);
  const isRejoining = useGameStore((s) => s.isRejoining);
  const roomCode = useGameStore((s) => s.roomCode);
  const [hasConnected, setHasConnected] = useState(socket.connected);
  const [timedOut, setTimedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (isConnected) setHasConnected(true);
  }, [isConnected]);

  useEffect(() => {
    if (hasConnected) return;
    setTimedOut(false);
    const timer = window.setTimeout(() => setTimedOut(true), CONNECT_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [hasConnected, attempt]);

  if (!hasConnected) {
    if (timedOut) {
      return (
        <FullPageStatus
          emoji="🏚️"
          title="Server unavailable — try again"
          message="We couldn't reach the game server. Check your connection, or the server may be waking up."
        >
          <Button
            onClick={() => {
              socket.disconnect();
              socket.connect();
              setAttempt((n) => n + 1);
            }}
            className="px-8"
          >
            🔄 Retry
          </Button>
        </FullPageStatus>
      );
    }
    return <FullPageStatus emoji="👑" spinning title="Connecting to server..." />;
  }

  if (isRejoining && !roomCode) {
    return <FullPageStatus emoji="👑" spinning title="Rejoining your game..." message="Hang tight, catching you up." />;
  }

  return <>{children}</>;
}
