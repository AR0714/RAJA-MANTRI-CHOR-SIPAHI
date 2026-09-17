import { useEffect } from 'react';
import { useAudio } from '../../../hooks/useAudio';
import { useGameStore } from '../../../store/gameStore';
import { Spinner } from '../../ui/Spinner';
import { RoundResult } from '../RoundResult';
import { Scoreboard } from '../Scoreboard';

/** Mirrors ROUND_RESULT_DELAY_MS on the server. */
const NEXT_ROUND_SECONDS = 3;

export function ResultScreen() {
  const result = useGameStore((s) => s.lastRoundResult);
  const players = useGameStore((s) => s.players);
  const playerId = useGameStore((s) => s.playerId);
  const maxRounds = useGameStore((s) => s.maxRounds);
  const { playCorrect, playWrong } = useAudio();

  const round = result?.round;
  const correct = result?.correct;

  useEffect(() => {
    if (round === undefined) return;
    if (correct) playCorrect();
    else playWrong();
  }, [round, correct, playCorrect, playWrong]);

  if (!result) {
    return (
      <div className="flex justify-center py-20 text-royal-gold">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <RoundResult
        result={result}
        players={players}
        myPlayerId={playerId}
        isFinalRound={result.round >= maxRounds}
        nextRoundInSeconds={NEXT_ROUND_SECONDS}
      />
      <div className="mx-auto max-w-xl">
        <Scoreboard />
      </div>
    </div>
  );
}
