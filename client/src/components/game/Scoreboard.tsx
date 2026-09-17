import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { Badge } from '../ui/Badge';

interface ScoreboardProps {
  /** Tighter layout for use beside another panel. */
  compact?: boolean;
  /** Show the latest round's +points next to each total. */
  showDeltas?: boolean;
  title?: string;
}

export function Scoreboard({ compact = false, showDeltas = true, title = 'Scoreboard' }: ScoreboardProps) {
  const players = useGameStore((s) => s.players);
  const totalScores = useGameStore((s) => s.totalScores);
  const lastRoundResult = useGameStore((s) => s.lastRoundResult);
  const currentRound = useGameStore((s) => s.currentRound);
  const maxRounds = useGameStore((s) => s.maxRounds);
  const playerId = useGameStore((s) => s.playerId);

  const rows = players
    .map((p, joinOrder) => ({ ...p, score: totalScores[p.id] ?? p.totalScore, joinOrder }))
    .sort((a, b) => b.score - a.score || a.joinOrder - b.joinOrder);

  const topScore = rows[0]?.score ?? 0;
  const deltas = showDeltas && lastRoundResult?.round === currentRound ? lastRoundResult.roundScores : null;

  return (
    <section
      className={`w-full rounded-3xl border border-royal-border bg-royal-card/70 ${compact ? 'p-4' : 'p-5 sm:p-6'}`}
      aria-label={title}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className={`font-cinzel font-bold text-royal-gold-l ${compact ? 'text-base' : 'text-lg sm:text-xl'}`}>{title}</h3>
        <Badge tone="gold">
          Round {currentRound} / {maxRounds}
        </Badge>
      </div>

      <ol className="space-y-2">
        <AnimatePresence initial={false}>
          {rows.map((row, i) => {
            const isLeader = topScore > 0 && row.score === topScore;
            const isMe = row.id === playerId;
            const delta = deltas?.[row.id];
            return (
              <motion.li
                key={row.id}
                layout
                transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                className={`flex min-w-0 items-center gap-2 rounded-xl border px-2.5 sm:gap-3 sm:px-3 ${compact ? 'py-2' : 'py-2.5'} ${
                  isMe ? 'border-royal-gold/50 bg-royal-gold/5' : 'border-royal-border/60 bg-royal-surface/60'
                }`}
              >
                <span className="w-4 shrink-0 text-center font-mono text-xs text-ink-muted">{i + 1}</span>
                <span className="w-5 shrink-0 text-center" aria-label={isLeader ? 'Leader' : undefined}>
                  {isLeader ? '👑' : ''}
                </span>
                <span className="min-w-0 flex-1 truncate font-poppins text-sm font-medium text-ink">
                  {row.name}
                  {isMe && <span className="ml-1 text-xs font-normal text-royal-gold-l">(you)</span>}
                  {!row.isConnected && <span className="ml-1 text-xs font-normal text-role-chor">· offline</span>}
                </span>
                {delta !== undefined && (
                  <motion.span
                    key={`${currentRound}-${delta}`}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`shrink-0 font-mono text-xs ${delta > 0 ? 'text-role-sipahi' : 'text-ink-muted'}`}
                  >
                    +{delta.toLocaleString('en-IN')}
                  </motion.span>
                )}
                <AnimatedNumber
                  value={row.score}
                  from={delta !== undefined ? row.score - delta : undefined}
                  delay={delta !== undefined ? 0.8 : 0}
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
