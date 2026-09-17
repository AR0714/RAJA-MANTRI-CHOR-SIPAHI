import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { ordinal, rankPlayers } from '../../utils/helpers';
import { ROLE_META } from '../../utils/roles';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { Badge } from '../ui/Badge';

interface ScoreboardProps {
  /** Tighter layout for use beside another panel. */
  compact?: boolean;
  /** Show this round's role and points (once the round result is in). */
  showDeltas?: boolean;
  title?: string;
  /** Seconds to wait before totals count up (lets a result reveal play first). */
  countUpDelay?: number;
}

const RANK_STYLES = ['text-royal-gold-l', 'text-ink', 'text-role-raja/80', 'text-ink-muted'];

export function Scoreboard({ compact = false, showDeltas = true, title = 'Leaderboard', countUpDelay = 0 }: ScoreboardProps) {
  const players = useGameStore((s) => s.players);
  const totalScores = useGameStore((s) => s.totalScores);
  const lastRoundResult = useGameStore((s) => s.lastRoundResult);
  const currentRound = useGameStore((s) => s.currentRound);
  const maxRounds = useGameStore((s) => s.maxRounds);
  const playerId = useGameStore((s) => s.playerId);

  const scoreOf = (id: string, fallback: number) => totalScores[id] ?? fallback;
  const ranked = rankPlayers(players, (p) => scoreOf(p.id, p.totalScore));
  const roundResult = showDeltas && lastRoundResult?.round === currentRound ? lastRoundResult : null;

  return (
    <section
      className={`w-full rounded-3xl border border-royal-border bg-royal-card/70 ${compact ? 'p-4' : 'p-4 sm:p-6'}`}
      aria-label={title}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className={`font-cinzel font-bold text-royal-gold-l ${compact ? 'text-base' : 'text-lg sm:text-xl'}`}>{title}</h3>
        <Badge tone="gold">
          Round {currentRound} of {maxRounds}
        </Badge>
      </div>

      <ol className="space-y-2">
        <AnimatePresence initial={false}>
          {ranked.map((row, i) => {
            const total = scoreOf(row.id, row.totalScore);
            const isLeader = i === 0 && total > 0;
            const isMe = row.id === playerId;
            const delta = roundResult?.roundScores[row.id];
            const role = roundResult?.roles[row.id];
            const roleMeta = role ? ROLE_META[role] : null;

            return (
              <motion.li
                key={row.id}
                layout
                transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                className={`flex min-w-0 items-center gap-2 rounded-xl border px-2.5 sm:gap-3 sm:px-3 ${compact ? 'py-2' : 'py-2.5'} ${
                  isMe ? 'border-royal-gold/50 bg-royal-gold/5' : 'border-royal-border/60 bg-royal-surface/60'
                }`}
              >
                <span className={`w-8 shrink-0 font-mono text-xs font-medium ${RANK_STYLES[i] ?? 'text-ink-muted'}`}>
                  {ordinal(i + 1)}
                </span>
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-royal-gold to-accent-purple font-cinzel text-sm font-bold text-royal-dark">
                  {row.name.charAt(0).toUpperCase()}
                  {isLeader && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-sm" aria-label="Leader">
                      👑
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-poppins text-sm font-medium text-ink">
                    {row.name}
                    {isMe && <span className="ml-1 text-xs font-normal text-royal-gold-l">(you)</span>}
                    {!row.isConnected && <span className="ml-1 text-xs font-normal text-role-chor">· offline</span>}
                  </span>
                  {roleMeta && (
                    <span className={`block truncate font-poppins text-[11px] font-semibold ${roleMeta.textClass}`}>
                      {roleMeta.emoji} {roleMeta.label}
                    </span>
                  )}
                </span>
                {delta !== undefined && (
                  <motion.span
                    key={`${currentRound}-${row.id}`}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: countUpDelay }}
                    className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-xs font-medium ${
                      delta > 0 ? 'bg-role-sipahi/10 text-role-sipahi' : 'bg-royal-surface text-ink-muted'
                    }`}
                  >
                    +{delta.toLocaleString('en-IN')}
                  </motion.span>
                )}
                <AnimatedNumber
                  value={total}
                  from={delta !== undefined ? total - delta : undefined}
                  delay={delta !== undefined ? countUpDelay : 0}
                  className={`w-14 shrink-0 text-right font-mono font-medium text-ink sm:w-16 ${compact ? 'text-sm' : 'text-base'}`}
                />
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </section>
  );
}
