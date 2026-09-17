import { motion } from 'framer-motion';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { PageWrapper } from '../components/layout/PageWrapper';
import { useSocket } from '../hooks/useSocket';
import { useGameStore } from '../store/gameStore';
import {
  NAME_MAX_LENGTH,
  ROOM_CODE_LENGTH,
  isValidPlayerName,
  isValidRoomCode,
  normalizeRoomCode,
} from '../utils/helpers';

const NAME_STORAGE_KEY = 'rmcs:playerName';

function readSavedName(): string {
  try {
    return localStorage.getItem(NAME_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveName(name: string): void {
  try {
    localStorage.setItem(NAME_STORAGE_KEY, name);
  } catch {
    // Storage can be unavailable (private mode); remembering the name is optional.
  }
}

export function HomePage() {
  const { createRoom, joinRoom } = useSocket();
  const pendingAction = useGameStore((s) => s.pendingAction);
  const [createName, setCreateName] = useState(readSavedName);
  const [joinName, setJoinName] = useState(readSavedName);
  const [roomCode, setRoomCode] = useState('');

  // Pre-fill the code from a shared link like /?code=ABC123.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) setRoomCode(normalizeRoomCode(code));
  }, []);

  const isBusy = pendingAction !== null;

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!isValidPlayerName(createName)) {
      toast.error(`Enter a name (1–${NAME_MAX_LENGTH} characters).`);
      return;
    }
    saveName(createName.trim());
    createRoom(createName);
  };

  const handleJoin = (event: FormEvent) => {
    event.preventDefault();
    if (!isValidPlayerName(joinName)) {
      toast.error(`Enter a name (1–${NAME_MAX_LENGTH} characters).`);
      return;
    }
    if (!isValidRoomCode(roomCode)) {
      toast.error(`Room code must be ${ROOM_CODE_LENGTH} letters or numbers.`);
      return;
    }
    saveName(joinName.trim());
    joinRoom(roomCode, joinName);
  };

  return (
    <PageWrapper className="flex min-h-screen flex-col justify-center">
      <header className="text-center">
        <motion.div
          initial={{ y: -20, opacity: 0, rotate: -12 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 180, damping: 12, delay: 0.1 }}
          className="text-6xl sm:text-7xl"
          aria-hidden
        >
          👑
        </motion.div>
        <h1 className="mt-4 bg-gradient-to-r from-royal-gold to-royal-gold-l bg-clip-text font-cinzel text-4xl font-black leading-tight text-transparent sm:text-6xl">
          Raja Mantri Chor Sipahi
        </h1>
        <p className="mx-auto mt-4 max-w-xl font-poppins text-sm text-ink-muted sm:text-base">
          The Classic UP/Bihar Card Game · 4 Players · Real-time Multiplayer
        </p>
      </header>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <LobbyCard
          icon="🏰"
          title="Create Room"
          description="Start a new game and invite three friends with a room code."
          delay={0.15}
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <TextField
              id="create-name"
              label="Your name"
              value={createName}
              onChange={setCreateName}
              maxLength={NAME_MAX_LENGTH}
              placeholder="e.g. Ankit"
              autoComplete="nickname"
            />
            <Button type="submit" fullWidth isLoading={pendingAction === 'create'} disabled={isBusy}>
              Create Room
            </Button>
          </form>
        </LobbyCard>

        <LobbyCard
          icon="🎟️"
          title="Join Room"
          description="Got a code from a friend? Enter it to take your seat."
          delay={0.25}
        >
          <form onSubmit={handleJoin} className="space-y-4">
            <TextField
              id="join-name"
              label="Your name"
              value={joinName}
              onChange={setJoinName}
              maxLength={NAME_MAX_LENGTH}
              placeholder="e.g. Priya"
              autoComplete="nickname"
            />
            <TextField
              id="join-code"
              label="Room code"
              value={roomCode}
              onChange={(value) => setRoomCode(normalizeRoomCode(value))}
              placeholder="ABC123"
              autoComplete="off"
              mono
            />
            <Button
              type="submit"
              variant="outline"
              fullWidth
              isLoading={pendingAction === 'join'}
              disabled={isBusy}
            >
              Join Room
            </Button>
          </form>
        </LobbyCard>
      </div>
    </PageWrapper>
  );
}

interface LobbyCardProps {
  icon: string;
  title: string;
  description: string;
  delay: number;
  children: ReactNode;
}

function LobbyCard({ icon, title, description, delay, children }: LobbyCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className="rounded-3xl border border-royal-border bg-royal-card/80 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8"
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden>
          {icon}
        </span>
        <h2 className="font-cinzel text-2xl font-bold text-royal-gold-l">{title}</h2>
      </div>
      <p className="mb-6 mt-2 font-poppins text-sm text-ink-muted">{description}</p>
      {children}
    </motion.section>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Omit when onChange already trims the value (e.g. pasted codes with dashes). */
  maxLength?: number;
  placeholder: string;
  autoComplete: string;
  mono?: boolean;
}

function TextField({ id, label, value, onChange, maxLength, placeholder, autoComplete, mono = false }: TextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-poppins text-xs font-medium uppercase tracking-wider text-ink-muted">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        spellCheck={false}
        className={`w-full rounded-xl border border-royal-border bg-royal-surface px-4 py-3 text-ink placeholder:text-ink-muted/50 transition-colors focus:border-royal-gold focus:outline-none focus:ring-2 focus:ring-royal-gold/30 ${
          mono ? 'font-mono text-lg uppercase tracking-[0.35em]' : 'font-poppins'
        }`}
      />
    </div>
  );
}
