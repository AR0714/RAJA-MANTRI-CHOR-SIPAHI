import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAudio } from '../../../hooks/useAudio';
import { useSocket } from '../../../hooks/useSocket';
import { useGameStore } from '../../../store/gameStore';
import type { RoundResult } from '../../../types/game.types';
import { copyText } from '../../../utils/clipboard';
import { ordinal, rankPlayers } from '../../../utils/helpers';
import { ROLE_META, formatPoints } from '../../../utils/roles';
import { Button } from '../../ui/Button';
import { Confetti } from '../Confetti';
import { Scoreboard } from '../Scoreboard';

const MEDALS = ['🥇', '🥈', '🥉'];

function roleIn(round: RoundResult, playerId: string) {
  if (round.rajaId === playerId) return 'raja';
  if (round.mantriId === playerId) return 'mantri';
  if (round.sipahiId === playerId) return 'sipahi';
  return 'chor';
}

export function GameOverScreen() {
  const winner = useGameStore((s) => s.winner);
  const players = useGameStore((s) => s.players);
  const playerId = useGameStore((s) => s.playerId);
  const roomCode = useGameStore((s) => s.roomCode);
  const totalScores = useGameStore((s) => s.totalScores);
  const roundHistory = useGameStore((s) => s.roundHistory);
  const { playAgain, leaveRoom } = useSocket();
  const { playWin } = useAudio();
  const navigate = useNavigate();

  const isHost = players.find((p) => p.id === playerId)?.isHost === true;
  const topScore = winner?.totalScore ?? 0;
  const ranked = rankPlayers(players, (p) => totalScores[p.id] ?? p.totalScore);
  // Equal scores are settled by join order, so anyone else on the top score lost the tie-break.
  const tiedRunnersUp = players.filter((p) => p.id !== winner?.playerId && (totalScores[p.id] ?? 0) === topScore);
  const iWon = winner?.playerId === playerId;

  useEffect(() => {
    playWin();
  }, [playWin]);

  const goHome = () => {
    leaveRoom();
    navigate('/', { replace: true });
  };

  const shareResult = async () => {
    const lines = [
      `👑 Raja Mantri Chor Sipahi — Final Scores${roomCode ? ` (Room ${roomCode})` : ''}`,
      '',
      ...ranked.map((p, i) => `${MEDALS[i] ?? `${ordinal(i + 1)}`} ${p.name} — ${formatPoints(totalScores[p.id] ?? p.totalScore)}`),
      '',
      `${winner?.name ?? 'Nobody'} is the Raja of the Game! 👑`,
      `Play: ${window.location.origin}`,
    ];
    if (await copyText(lines.join('\n'))) toast.success('Final scores copied — paste them in WhatsApp!');
    else toast.error('Could not copy the scores.');
  };

  return (
    <section className="flex flex-col items-center text-center">
      <Confetti />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-mono text-xs uppercase tracking-[0.3em] text-ink-muted"
      >
        Game over · {roundHistory.length} rounds played
      </motion.p>

      <motion.div
        initial={{ scale: 0.4, opacity: 0, rotate: -20 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 160, damping: 10, delay: 0.1 }}
        className="mt-4 text-7xl sm:text-8xl"
        aria-hidden
      >
        👑
      </motion.div>

      <motion.h2
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 12, delay: 0.25 }}
        className="mt-2 font-cinzel text-4xl font-black leading-tight sm:text-6xl"
      >
        <span className="bg-gradient-to-r from-royal-gold to-royal-gold-l bg-clip-text text-transparent">
          {winner?.name ?? 'Nobody'}
        </span>
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="mt-2 font-cinzel text-xl font-bold text-royal-gold-l sm:text-2xl"
      >
        👑 {winner?.name ?? 'Nobody'} is the Raja of the Game!
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-2 font-poppins text-sm text-ink-muted"
      >
        {formatPoints(topScore)} points
        {tiedRunnersUp.length > 0 &&
          ` · won the tie with ${tiedRunnersUp.map((p) => p.name).join(', ')} by joining the room first`}
        {iWon && <span className="ml-2 font-semibold text-royal-gold-l">— that’s you! 🎉</span>}
      </motion.p>

      <div className="mt-8 flex w-full max-w-md flex-wrap justify-center gap-3">
        {isHost && (
          <Button onClick={playAgain} className="px-6 text-base">
            🔁 Play Again
          </Button>
        )}
        <Button variant="green" onClick={() => void shareResult()} className="px-6 text-base">
          📤 Share Result
        </Button>
        <Button variant="outline" onClick={goHome} className="px-6 text-base">
          🏠 Home
        </Button>
      </div>
      {!isHost && (
        <p className="mt-3 font-poppins text-xs text-ink-muted">Waiting for the host to start a new game…</p>
      )}

      <div className="mt-10 w-full max-w-xl">
        <Scoreboard title="Final Standings" showDeltas={false} />
      </div>

      {roundHistory.length > 0 && (
        <div className="mt-6 w-full max-w-3xl rounded-3xl border border-royal-border bg-royal-card/70 p-4 sm:p-6">
          <h3 className="mb-3 text-left font-cinzel text-lg font-bold text-royal-gold-l">Round by Round</h3>
          <div className="overflow-x-auto" role="region" aria-label="Round by round scores" tabIndex={0}>
            <table className="w-full min-w-[600px] border-collapse font-mono text-xs">
              <thead>
                <tr className="text-ink-muted">
                  <th className="sticky left-0 bg-royal-card py-2 pr-3 text-left font-poppins font-medium">Player</th>
                  {roundHistory.map((r) => (
                    <th key={r.round} className="px-1.5 py-2 text-right font-medium" title={r.correct ? 'Chor caught' : 'Chor escaped'}>
                      R{r.round}
                      <span className="ml-0.5">{r.correct ? '✅' : '🦹'}</span>
                    </th>
                  ))}
                  <th className="py-2 pl-3 text-right font-poppins font-semibold text-royal-gold-l">Total</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((p, rank) => (
                  <tr key={p.id} className={`border-t border-royal-border/60 ${p.id === playerId ? 'bg-royal-gold/5' : ''}`}>
                    <td className="sticky left-0 max-w-[120px] truncate bg-royal-card py-2 pr-3 text-left font-poppins text-sm text-ink">
                      {rank === 0 && <span aria-label="Winner">👑 </span>}
                      {p.name}
                    </td>
                    {roundHistory.map((r) => {
                      const role = roleIn(r, p.id);
                      const points = r.roundScores[p.id] ?? 0;
                      return (
                        <td
                          key={r.round}
                          className={`px-1.5 py-2 text-right ${points > 0 ? ROLE_META[role].textClass : 'text-ink-muted/60'}`}
                        >
                          <span aria-hidden>{ROLE_META[role].emoji}</span>
                          <span className="sr-only">{ROLE_META[role].label}</span>
                          {points > 0 ? formatPoints(points) : '0'}
                        </td>
                      );
                    })}
                    <td className="py-2 pl-3 text-right text-sm font-medium text-ink">
                      {formatPoints(totalScores[p.id] ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
