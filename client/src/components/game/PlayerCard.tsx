import { motion } from 'framer-motion';
import type { PublicPlayer } from '../../types/game.types';

interface PlayerCardProps {
  player: PublicPlayer | null;
  seat: number;
  isMe?: boolean;
}

export function PlayerCard({ player, seat, isMe = false }: PlayerCardProps) {
  if (!player) {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-dashed border-royal-border bg-royal-surface/60 p-4">
        <div className="h-12 w-12 animate-pulse rounded-full bg-royal-card" />
        <div className="flex-1">
          <p className="animate-pulse font-poppins text-sm text-ink-muted">Waiting...</p>
          <p className="font-mono text-xs text-ink-muted/60">Seat {seat}</p>
        </div>
      </div>
    );
  }

  const initial = player.name.charAt(0).toUpperCase();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={`flex items-center gap-4 rounded-2xl border bg-royal-card p-4 ${
        isMe ? 'border-royal-gold/60 shadow-lg shadow-royal-gold/10' : 'border-royal-border'
      }`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-royal-gold to-accent-purple font-cinzel text-lg font-bold text-royal-dark">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-poppins font-semibold text-ink">
          {player.name}
          {isMe && <span className="ml-2 text-xs font-normal text-royal-gold-l">(you)</span>}
        </p>
        <p className="font-mono text-xs text-ink-muted">
          {player.isHost ? '👑 Host' : `Seat ${seat}`}
          {!player.isConnected && <span className="ml-2 text-role-chor">· offline</span>}
        </p>
      </div>
    </motion.div>
  );
}
