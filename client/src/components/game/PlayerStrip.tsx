import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import type { Role } from '../../types/game.types';
import { rankPlayers } from '../../utils/helpers';
import { ROLE_META } from '../../utils/roles';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { RESULT_COUNT_UP_DELAY_S } from './RoundResult';

/**
 * Always-visible player panel (like a Ludo score bar): who is playing, their live
 * total, rank and leader crown, plus any role that is public right now.
 */
export function PlayerStrip() {
  const players = useGameStore((s) => s.players);
  const totalScores = useGameStore((s) => s.totalScores);
  const playerId = useGameStore((s) => s.playerId);
  const phase = useGameStore((s) => s.phase);
  const rajaId = useGameStore((s) => s.rajaId);
  const sipahiId = useGameStore((s) => s.sipahiId);
  const lastRoundResult = useGameStore((s) => s.lastRoundResult);
  const currentRound = useGameStore((s) => s.currentRound);

  const scoreOf = (id: string, fallback: number) => totalScores[id] ?? fallback;
  const ranked = rankPlayers(players, (p) => scoreOf(p.id, p.totalScore));
  const rankOf = new Map(ranked.map((p, i) => [p.id, i + 1]));
  const leaderId = ranked[0] && scoreOf(ranked[0].id, ranked[0].totalScore) > 0 ? ranked[0].id : null;
  const showResult = phase === 'ROUND_RESULT' && lastRoundResult?.round === currentRound;

  const publicRole = (id: string): Role | null => {
    if (showResult) return lastRoundResult?.roles[id] ?? null;
    if (id === sipahiId) return 'sipahi';
    if (id === rajaId) return 'raja';
    return null;
  };

  return (
    <nav aria-label="Players" className="border-b border-royal-border/60 bg-royal-surface/80 backdrop-blur">
      <ul className="mx-auto grid max-w-5xl grid-cols-4 gap-1.5 px-2 py-2 sm:gap-3 sm:px-6">
        {players.map((player) => {
          const role = publicRole(player.id);
          const roleMeta = role ? ROLE_META[role] : null;
          const isMe = player.id === playerId;
          const rank = rankOf.get(player.id) ?? 0;
          const total = scoreOf(player.id, player.totalScore);
          const delta = showResult ? lastRoundResult?.roundScores[player.id] : undefined;

          return (
            <li
              key={player.id}
              className={`flex min-w-0 items-center gap-1.5 rounded-xl border px-1.5 py-1 sm:gap-2 sm:px-2.5 ${
                isMe ? 'border-royal-gold/60 bg-royal-gold/10' : 'border-royal-border/60 bg-royal-card/60'
              } ${player.isConnected ? '' : 'opacity-50'}`}
            >
              <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-royal-gold to-accent-purple font-cinzel text-xs font-bold text-royal-dark sm:h-8 sm:w-8 sm:text-sm">
                {player.name.charAt(0).toUpperCase()}
                {roleMeta && (
                  <motion.span
                    key={`${currentRound}-${role}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -bottom-1 -right-1.5 text-[11px] leading-none"
                    aria-label={roleMeta.label}
                  >
                    {roleMeta.emoji}
                  </motion.span>
                )}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="flex items-center gap-0.5 truncate font-poppins text-[11px] font-semibold text-ink sm:text-xs">
                  {player.id === leaderId && <span aria-label="Leader">👑</span>}
                  <span className="truncate">{isMe ? 'You' : player.name}</span>
                </span>
                <span className="flex items-baseline gap-1 font-mono text-[10px] text-ink-muted sm:text-[11px]">
                  <AnimatedNumber
                    value={total}
                    from={delta !== undefined ? total - delta : undefined}
                    delay={delta !== undefined ? RESULT_COUNT_UP_DELAY_S : 0}
                    className="text-royal-gold-l"
                  />
                  <span className="hidden min-[400px]:inline">#{rank}</span>
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
