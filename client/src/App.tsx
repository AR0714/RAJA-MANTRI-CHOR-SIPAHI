import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';
type HealthStatus = 'checking' | 'ok' | 'unreachable';

interface HealthResponse {
  status: string;
}

function App() {
  const [socketStatus, setSocketStatus] = useState<ConnectionStatus>('connecting');
  const [socketId, setSocketId] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus>('checking');

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${SERVER_URL}/health`, { signal: controller.signal })
      .then((res) => res.json() as Promise<HealthResponse>)
      .then((data) => setHealth(data.status === 'ok' ? 'ok' : 'unreachable'))
      .catch((err: unknown) => {
        if (!(err instanceof DOMException && err.name === 'AbortError')) setHealth('unreachable');
      });

    const socket = io(SERVER_URL);
    socket.on('connect', () => {
      setSocketStatus('connected');
      setSocketId(socket.id ?? null);
    });
    socket.on('disconnect', () => {
      setSocketStatus('disconnected');
      setSocketId(null);
    });
    socket.on('connect_error', () => setSocketStatus('disconnected'));

    return () => {
      controller.abort();
      socket.disconnect();
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-royal-border bg-royal-card p-8 text-center">
        <h1 className="font-cinzel text-3xl font-black text-royal-gold">Raja Mantri Chor Sipahi</h1>
        <p className="mt-2 text-sm text-ink-muted">Phase 1 · Foundation check</p>

        <dl className="mt-8 space-y-3 text-left font-mono text-sm">
          <StatusRow label="Health (/health)" value={health} good={health === 'ok'} />
          <StatusRow label="Socket" value={socketStatus} good={socketStatus === 'connected'} />
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Socket ID</dt>
            <dd className="truncate">{socketId ?? '—'}</dd>
          </div>
        </dl>
      </div>
    </main>
  );
}

interface StatusRowProps {
  label: string;
  value: string;
  good: boolean;
}

function StatusRow({ label, value, good }: StatusRowProps) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={good ? 'text-role-sipahi' : 'text-role-chor'}>{value}</dd>
    </div>
  );
}

export default App;
