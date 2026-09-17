import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { PublicPlayer, RoundResultPayload } from '../../types/game.types';
import { ROLE_META, ROLE_ORDER } from '../../utils/roles';
import { AnimatedNumber } from '../ui/AnimatedNumber';

interface RoundResultProps {
  result: RoundResultPayload;
  players: PublicPlayer[];
  myPlayerId: string | null;
  isFinalRound: boolean;
  /** Seconds until the server deals the next round. */
  nextRoundInSeconds: number;
}

const CARD_STAGGER_S = 0.2;

export function RoundResult({ result, players, myPlayerId, isFinalRound, nextRoundInSeconds }: RoundResultProps) {
  const [countdown, setCountdown] = useState(nextRoundInSeconds);

  useEffect(() => {
    const interval = window.setInterval(() => setCountdown((n) => Math.max(0, n - 1)), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const nameOf = (id: string | null) => players.find((p) => p.id === id)?.name ?? 'Someone';
  const idWithRole = (role: string) => Object.keys(result.roles).find((id) => result.roles[id] === role) ?? null;

  const sipahiName = nameOf(idWithRole('sipahi'));
  const chorName = nameOf(idWithRole('chor'));
  const accusation =
    result.guessedPlayerId === null
      ? `${sipahiName} ran out of time.`
      : `${sipahiName} accused ${nameOf(result.guessedPlayerId)}.`;

  const cards = ROLE_ORDER.map((role) => {
    const playerId = idWithRole(role);
    return { role, playerId, name: nameOf(playerId), points: playerId ? (result.roundScores[playerId] ?? 0) : 0 };
  });

  return (
    <section className="flex flex-col items-center text-center">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink-muted">Round {result.round} result</p>

      <motion.h2
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 14 }}
        className={`mt-3 font-cinzel text-3xl font-black sm:text-5xl ${
          result.correct ? 'text-role-sipahi' : 'text-role-raja'
        }`}
      >
        {result.correct ? 'Sipahi caught the Chor! ✅' : 'Chor escaped! 🦹'}
      </motion.h2>
      <p className="mt-2 font-poppins text-sm text-ink-muted sm:text-base">
        {accusation} {result.correct ? `${chorName} was caught red-handed.` : `The Chor was ${chorName}.`}
      </p>

      <ul className="mt-8 grid w-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map(({ role, playerId, name, points }, i) => {
          const meta = ROLE_META[role];
          const isMe = playerId !== null && playerId === myPlayerId;
          const missedOut = points === 0;
          return (
            <motion.li
              key={role}
              initial={{ opacity: 0, y: 24, rotateX: -35 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ delay: 0.3 + i * CARD_STAGGER_S, type: 'spring', stiffness: 240, damping: 20 }}
              className={`relative flex flex-col items-center gap-1 rounded-2xl border-2 bg-royal-card p-4 shadow-xl ${meta.borderClass} ${meta.glowClass}`}
            >
              <div className={`absolute inset-0 rounded-2xl ${meta.bgClass}`} aria-hidden />
              <span className="relative text-4xl sm:text-5xl" aria-hidden>
                {meta.emoji}
              </span>
              <span className={`relative font-cinzel text-lg font-black sm:text-xl ${meta.textClass}`}>{meta.label}</span>
              <span className="relative max-w-full truncate font-poppins text-sm font-semibold text-ink">
                {name}
                {isMe && <span className="ml-1 text-xs font-normal text-royal-gold-l">(you)</span>}
              </span>
              <AnimatedNumber
                value={points}
                from={0}
                delay={0.5 + i * CARD_STAGGER_S}
                prefix="+"
                className={`relative mt-1 font-mono text-xl font-medium ${missedOut ? 'text-ink-muted' : 'text-royal-gold-l'}`}
              />
            </motion.li>
          );
        })}
      </ul>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mt-6 font-poppins text-sm text-ink-muted"
        aria-live="polite"
      >
        {isFinalRound ? (
          <span className="font-cinzel text-xl font-bold text-royal-gold-l">Game Over!</span>
        ) : countdown > 0 ? (
          <>
            Next round in <span className="font-mono text-ink">{countdown}</span>...
          </>
        ) : (
          'Dealing the next round…'
        )}
      </motion.p>
    </section>
  );
}
