import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAudio } from '../../../hooks/useAudio';
import { useSocket } from '../../../hooks/useSocket';
import { useGameStore } from '../../../store/gameStore';
import { ROLE_META, formatPoints } from '../../../utils/roles';
import { Button } from '../../ui/Button';
import { Confetti } from '../Confetti';
import { Scoreboard } from '../Scoreboard';

export function GameOverScreen() {
  const winner = useGameStore((s) => s.winner);
  const players = useGameStore((s) => s.players);
  const playerId = useGameStore((s) => s.playerId);
  const totalScores = useGameStore((s) => s.totalScores);
  const roundHistory = useGameStore((s) => s.roundHistory);
  const { playAgain, leaveRoom } = useSocket();
  const { playWin } = useAudio();
  const navigate = useNavigate();

  const isHost = players.find((p) => p.id === playerId)?.isHost === true;
  const topScore = winner?.totalScore ?? 0;
  const coWinners = players.filter((p) => p.id !== winner?.playerId && (totalScores[p.id] ?? 0) === topScore);
  const iWon = winner?.playerId === playerId || coWinners.some((p) => p.id === playerId);

  useEffect(() => {
    playWin();
  }, [playWin]);

  const goHome = () => {
    leaveRoom();
    navigate('/');
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

      <motion.h2
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 12, delay: 0.15 }}
        className="mt-4 bg-gradient-to-r from-royal-gold to-royal-gold-l bg-clip-text font-cinzel text-4xl font-black leading-tight text-transparent sm:text-6xl"
      >
        <span className="text-royal-gold-l [-webkit-text-fill-color:initial]">👑</span> {winner?.name ?? 'Nobody'} Wins!
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-3 font-poppins text-ink-muted"
      >
        {formatPoints(topScore)} points
        {coWinners.length > 0 && ` · tied with ${coWinners.map((p) => p.name).join(', ')}`}
        {iWon && <span className="ml-2 font-semibold text-royal-gold-l">— that’s you! 🎉</span>}
      </motion.p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={playAgain} disabled={!isHost} className="px-8 py-3 text-base">
          🔁 Play Again
        </Button>
        <Button variant="outline" onClick={goHome} className="px-8 py-3 text-base">
          🏠 Home
        </Button>
      </div>
      {!isHost && (
        <p className="mt-3 font-poppins text-xs text-ink-muted">Only the host can start a new game.</p>
      )}

      <div className="mt-10 w-full max-w-xl">
        <Scoreboard title="Final Scores" showDeltas={false} />
      </div>

      {roundHistory.length > 0 && (
        <div className="mt-6 w-full max-w-3xl overflow-x-auto rounded-3xl border border-royal-border bg-royal-card/70 p-4 sm:p-6">
          <h3 className="mb-3 text-left font-cinzel text-lg font-bold text-royal-gold-l">Round by Round</h3>
          <table className="w-full min-w-[560px] border-collapse font-mono text-xs">
            <thead>
              <tr className="text-ink-muted">
                <th className="py-2 pr-3 text-left font-poppins font-medium">Player</th>
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
              {players.map((p) => (
                <tr key={p.id} className="border-t border-royal-border/60">
                  <td className="max-w-[120px] truncate py-2 pr-3 text-left font-poppins text-sm text-ink">{p.name}</td>
                  {roundHistory.map((r) => {
                    const role =
                      r.rajaId === p.id ? 'raja' : r.mantriId === p.id ? 'mantri' : r.sipahiId === p.id ? 'sipahi' : 'chor';
                    const points = r.roundScores[p.id] ?? 0;
                    return (
                      <td key={r.round} className={`px-1.5 py-2 text-right ${points > 0 ? ROLE_META[role].textClass : 'text-ink-muted/60'}`}>
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
      )}
    </section>
  );
}
