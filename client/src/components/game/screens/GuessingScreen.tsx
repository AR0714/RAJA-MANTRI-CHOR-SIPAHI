import { useSocket } from '../../../hooks/useSocket';
import { useGameStore } from '../../../store/gameStore';
import { GuessPanel } from '../GuessPanel';
import { Scoreboard } from '../Scoreboard';

export function GuessingScreen() {
  const playerId = useGameStore((s) => s.playerId);
  const myRole = useGameStore((s) => s.myRole);
  const sipahiId = useGameStore((s) => s.sipahiId);
  const players = useGameStore((s) => s.players);
  const hiddenPlayers = useGameStore((s) => s.hiddenPlayers);
  const guessDeadline = useGameStore((s) => s.guessDeadline);
  const guessTimerSeconds = useGameStore((s) => s.guessTimerSeconds);
  const { sipahiGuess } = useSocket();

  const sipahiName = players.find((p) => p.id === sipahiId)?.name ?? 'The Sipahi';

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_280px]">
      <GuessPanel
        hiddenPlayers={hiddenPlayers}
        isSipahi={sipahiId !== null && sipahiId === playerId}
        isSuspect={myRole === 'mantri' || myRole === 'chor'}
        sipahiName={sipahiName}
        deadline={guessDeadline}
        timerSeconds={guessTimerSeconds}
        onGuess={sipahiGuess}
      />
      <Scoreboard compact showDeltas={false} />
    </div>
  );
}
