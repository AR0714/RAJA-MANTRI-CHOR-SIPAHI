import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { PublicPlayer } from '../../types/game.types';

interface GuessPanelProps {
  hiddenPlayers: PublicPlayer[];
  isSipahi: boolean;
  sipahiName: string;
  /** Local timestamp (ms) when the server-side timer runs out. */
  deadline: number | null;
  timerSeconds: number;
  /** True when the viewer is one of the two suspects. */
  isSuspect: boolean;
  onGuess: (targetPlayerId: string) => void;
}

function useSecondsLeft(deadline: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (deadline === null) return;
    const interval = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(interval);
  }, [deadline]);

  return deadline === null ? 0 : Math.max(0, (deadline - now) / 1000);
}

export function GuessPanel({
  hiddenPlayers,
  isSipahi,
  sipahiName,
  deadline,
  timerSeconds,
  isSuspect,
  onGuess,
}: GuessPanelProps) {
  const [chosenId, setChosenId] = useState<string | null>(null);
  const secondsLeft = useSecondsLeft(deadline);
  const timeUp = secondsLeft <= 0 && deadline !== null;
  const canChoose = isSipahi && chosenId === null && !timeUp;

  const handleChoose = (playerId: string) => {
    if (!canChoose) return;
    setChosenId(playerId);
    onGuess(playerId);
  };

  const chosenName = hiddenPlayers.find((p) => p.id === chosenId)?.name;

  return (
    <section className="flex flex-col items-center text-center">
      <h2 className="font-cinzel text-3xl font-black text-ink sm:text-4xl">
        Who is the <span className="text-role-chor">Chor</span>? ⚔️
      </h2>
      <p className="mt-2 font-poppins text-sm text-ink-muted sm:text-base">
        {isSipahi
          ? 'One of these two is the thief. Choose wisely, Sipahi!'
          : `${sipahiName} must pick the Chor from these two.`}
      </p>

      <CountdownRing secondsLeft={secondsLeft} totalSeconds={timerSeconds} />

      <div className="mt-6 grid w-full max-w-xl grid-cols-2 gap-3 sm:mt-8 sm:gap-6">
        {hiddenPlayers.map((player, i) => (
          <MysteryCard
            key={player.id}
            player={player}
            index={i}
            interactive={canChoose}
            dimmed={!isSipahi}
            isChosen={chosenId === player.id}
            isOtherChosen={chosenId !== null && chosenId !== player.id}
            onChoose={() => handleChoose(player.id)}
          />
        ))}
      </div>

      <p className="mt-6 min-h-6 font-poppins text-sm text-ink-muted" aria-live="polite">
        {isSipahi && chosenName && `You accused ${chosenName}. Revealing…`}
        {isSipahi && !chosenName && timeUp && 'Time is up!'}
        {!isSipahi && (
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-role-sipahi" />
            Sipahi is choosing...
            {isSuspect && <span className="text-royal-gold-l">(you are a suspect — stay calm!)</span>}
          </span>
        )}
      </p>
    </section>
  );
}

interface MysteryCardProps {
  player: PublicPlayer;
  index: number;
  interactive: boolean;
  dimmed: boolean;
  isChosen: boolean;
  isOtherChosen: boolean;
  onChoose: () => void;
}

function MysteryCard({ player, index, interactive, dimmed, isChosen, isOtherChosen, onChoose }: MysteryCardProps) {
  const reduceMotion = useReducedMotion();
  const waiting = !isChosen && !isOtherChosen;

  return (
    <motion.button
      type="button"
      onClick={onChoose}
      disabled={!interactive}
      aria-label={`Accuse ${player.name}`}
      initial={{ opacity: 0, y: 30, rotate: index === 0 ? -4 : 4 }}
      animate={{ opacity: isOtherChosen ? 0.35 : 1, y: 0, rotate: 0, scale: isChosen ? 1.04 : 1 }}
      whileHover={interactive && !reduceMotion ? { y: -12, scale: 1.03 } : undefined}
      whileTap={interactive ? { scale: 0.97 } : undefined}
      transition={{ type: 'spring', stiffness: 260, damping: 22, delay: index * 0.1 }}
      className={`group relative flex aspect-[3/4] min-w-0 flex-col items-center justify-center gap-2 rounded-3xl border-2 bg-gradient-to-br from-royal-card to-royal-dark p-3 sm:gap-3 sm:p-4 shadow-2xl shadow-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-gold-l disabled:cursor-default ${
        isChosen ? 'border-royal-gold' : 'border-royal-border'
      } ${interactive ? 'cursor-pointer' : ''} ${dimmed ? 'grayscale-[60%]' : ''}`}
    >
      {waiting && !reduceMotion && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-[-2px] rounded-3xl border-2 border-role-chor"
          animate={{ opacity: [0.15, 0.8, 0.15] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: index * 0.4 }}
        />
      )}
      <span className="font-cinzel text-4xl font-black text-royal-gold/60 sm:text-6xl" aria-hidden>
        ?
      </span>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-royal-gold to-accent-purple font-cinzel text-xl sm:text-2xl font-bold text-royal-dark sm:h-16 sm:w-16">
        {player.name.charAt(0).toUpperCase()}
      </span>
      <span className="max-w-full truncate font-poppins text-sm font-semibold text-ink sm:text-lg">{player.name}</span>
      {interactive && (
        <span className="font-mono text-[11px] uppercase tracking-widest text-role-chor opacity-70 transition-opacity group-hover:opacity-100">
          Accuse
        </span>
      )}
      {isChosen && <span className="font-mono text-[11px] uppercase tracking-widest text-royal-gold-l">Accused</span>}
    </motion.button>
  );
}

interface CountdownRingProps {
  secondsLeft: number;
  totalSeconds: number;
}

const RING_RADIUS = 34;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function CountdownRing({ secondsLeft, totalSeconds }: CountdownRingProps) {
  const elapsedFraction = totalSeconds > 0 ? Math.min(1, 1 - secondsLeft / totalSeconds) : 1;
  const urgent = secondsLeft <= 5;

  return (
    <div
      className="relative mt-6 h-24 w-24"
      role="timer"
      aria-label={`${Math.ceil(secondsLeft)} seconds left`}
    >
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={RING_RADIUS} fill="none" stroke="#1C2E50" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r={RING_RADIUS}
          fill="none"
          stroke="#EF4444"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - elapsedFraction)}
          style={{ transition: 'stroke-dashoffset 0.1s linear' }}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center font-mono text-3xl font-medium ${
          urgent ? 'animate-pulse text-role-chor' : 'text-ink'
        }`}
      >
        {Math.ceil(secondsLeft)}
      </span>
    </div>
  );
}
