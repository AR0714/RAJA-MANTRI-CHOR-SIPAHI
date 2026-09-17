import { AnimatePresence, motion } from 'framer-motion';
import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PlayerCard } from '../components/game/PlayerCard';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useSocket } from '../hooks/useSocket';
import { useGameStore } from '../store/gameStore';
import {
  MAX_PLAYERS,
  NAME_MAX_LENGTH,
  buildWhatsAppShareUrl,
  isValidPlayerName,
} from '../utils/helpers';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers or contexts without the async clipboard API.
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    return ok;
  }
}

export function LobbyPage() {
  const roomCode = useGameStore((s) => s.roomCode);
  const playerId = useGameStore((s) => s.playerId);
  const players = useGameStore((s) => s.players);
  const pendingAction = useGameStore((s) => s.pendingAction);
  const { startGame, updateName } = useSocket();

  const [copied, setCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');

  if (!roomCode) {
    return <Navigate to="/" replace />;
  }

  const me = players.find((p) => p.id === playerId);
  const isHost = me?.isHost === true;
  const playerCount = players.length;
  const isReady = playerCount === MAX_PLAYERS && players.every((p) => p.isConnected);
  const seats = Array.from({ length: MAX_PLAYERS }, (_, i) => players[i] ?? null);

  const handleCopy = async () => {
    if (await copyText(roomCode)) {
      setCopied(true);
      toast.success('Room code copied');
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Could not copy. Select the code and copy it manually.');
    }
  };

  const startEditingName = () => {
    setDraftName(me?.name ?? '');
    setIsEditingName(true);
  };

  const handleRename = (event: FormEvent) => {
    event.preventDefault();
    if (!isValidPlayerName(draftName)) {
      toast.error(`Enter a name (1–${NAME_MAX_LENGTH} characters).`);
      return;
    }
    if (draftName.trim() !== me?.name) updateName(draftName);
    setIsEditingName(false);
  };

  return (
    <PageWrapper className="max-w-2xl">
      <section className="text-center">
        <p className="font-poppins text-xs font-medium uppercase tracking-[0.3em] text-ink-muted">Room code</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
          <motion.p
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="select-all bg-gradient-to-r from-royal-gold to-royal-gold-l bg-clip-text font-mono text-5xl font-medium tracking-[0.2em] text-transparent sm:text-6xl"
            aria-label={`Room code ${roomCode.split('').join(' ')}`}
          >
            {roomCode}
          </motion.p>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="outline" onClick={() => void handleCopy()}>
            {copied ? '✅ Copied' : '📋 Copy code'}
          </Button>
          <a
            href={buildWhatsAppShareUrl(roomCode)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 font-poppins text-sm font-semibold text-royal-dark shadow-lg shadow-[#25D366]/20 transition-shadow hover:shadow-[#25D366]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 focus-visible:ring-offset-royal-dark"
          >
            💬 Share on WhatsApp
          </a>
        </div>
      </section>

      <section className="mt-12 rounded-3xl border border-royal-border bg-royal-card/60 p-5 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-cinzel text-xl font-bold text-royal-gold-l sm:text-2xl">Players</h2>
          <Badge tone={isReady ? 'green' : 'gold'}>
            {playerCount} / {MAX_PLAYERS} Players
          </Badge>
        </div>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {seats.map((player, i) => (
            <li key={player?.id ?? `empty-${i}`}>
              <PlayerCard player={player} seat={i + 1} isMe={player !== null && player.id === playerId} />
            </li>
          ))}
        </ul>

        <div className="mt-4 min-h-10">
          <AnimatePresence mode="wait" initial={false}>
            {isEditingName ? (
              <motion.form
                key="edit"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                onSubmit={handleRename}
                className="flex flex-wrap items-center gap-2"
              >
                <label htmlFor="rename" className="sr-only">
                  New name
                </label>
                <input
                  id="rename"
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  maxLength={NAME_MAX_LENGTH}
                  className="min-h-11 min-w-0 flex-1 rounded-xl border border-royal-border bg-royal-surface px-3 py-2 font-poppins text-base text-ink focus:border-royal-gold focus:outline-none focus:ring-2 focus:ring-royal-gold/30"
                />
                <Button type="submit" className="px-4">
                  Save
                </Button>
                <Button variant="ghost" className="px-3" onClick={() => setIsEditingName(false)}>
                  Cancel
                </Button>
              </motion.form>
            ) : (
              <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button variant="ghost" className="px-3 text-xs" onClick={startEditingName}>
                  ✏️ Change my name
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <section className="mt-8 text-center">
        {isHost ? (
          <>
            <Button
              variant={isReady ? 'green' : 'outline'}
              disabled={!isReady}
              isLoading={pendingAction === 'start'}
              onClick={startGame}
              className="w-full px-10 py-3 text-base sm:w-auto"
            >
              {isReady ? '🎮 Start Game' : 'Start Game'}
            </Button>
            {!isReady && (
              <p className="mt-3 font-poppins text-sm text-ink-muted">
                Waiting for {MAX_PLAYERS - playerCount} more {MAX_PLAYERS - playerCount === 1 ? 'player' : 'players'}…
              </p>
            )}
          </>
        ) : (
          <p className="flex items-center justify-center gap-3 font-poppins text-ink-muted">
            <span className="h-2 w-2 animate-pulse rounded-full bg-royal-gold" />
            Waiting for host to start the game...
          </p>
        )}
      </section>
    </PageWrapper>
  );
}
