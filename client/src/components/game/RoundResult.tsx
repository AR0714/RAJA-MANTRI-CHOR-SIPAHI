import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { PublicPlayer, Role, RoundResultPayload } from '../../types/game.types';
import { ROLE_META, ROLE_ORDER } from '../../utils/roles';
import { serverNow } from '../../utils/serverClock';
import { AnimatedNumber } from '../ui/AnimatedNumber';

interface RoundResultProps {
  result: RoundResultPayload;
  players: PublicPlayer[];
  myPlayerId: string | null;
  isFinalRound: boolean;
}

// Reveal choreography (seconds): header → cards flip with a stagger → scores count up → countdown.
const HEADER_S = 0;
const FIRST_FLIP_S = 0.5;
const FLIP_STAGGER_S = 0.2;
const FLIP_DURATION_S = 0.6;
const COUNT_UP_S = FIRST_FLIP_S + FLIP_DURATION_S;
const COUNTDOWN_S = FIRST_FLIP_S + ROLE_ORDER.length * FLIP_STAGGER_S + FLIP_DURATION_S;

function useSecondsUntil(serverTimestamp: number): number {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((serverTimestamp - serverNow()) / 1000)));

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.ceil((serverTimestamp - serverNow()) / 1000)));
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [serverTimestamp]);

  return left;
}

export function RoundResult({ result, players, myPlayerId, isFinalRound }: RoundResultProps) {
  const secondsLeft = useSecondsUntil(result.nextPhaseAt);

  const nameOf = (id: string | null) => players.find((p) => p.id === id)?.name ?? 'Someone';
  const idWithRole = (role: Role) => Object.keys(result.roles).find((id) => result.roles[id] === role) ?? null;

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
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 14, delay: HEADER_S }}
        className={`mt-3 font-cinzel text-3xl font-black sm:text-5xl ${result.correct ? 'text-role-sipahi' : 'text-role-raja'}`}
      >
        {result.correct ? 'Sipahi caught Chor! ✅' : 'Chor escaped! 🦹'}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="mt-2 font-poppins text-sm text-ink-muted sm:text-base"
      >
        {accusation} {result.correct ? `${chorName} was caught red-handed.` : `The Chor was ${chorName}.`}
      </motion.p>

      <ul className="mt-8 grid w-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((card, i) => (
          <ResultCard
            key={card.role}
            {...card}
            isMe={card.playerId !== null && card.playerId === myPlayerId}
            flipDelay={FIRST_FLIP_S + i * FLIP_STAGGER_S}
          />
        ))}
      </ul>

      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: COUNTDOWN_S }}
        className="mt-6 min-h-7 font-poppins text-sm text-ink-muted"
        aria-live="polite"
      >
        {isFinalRound ? (
          <span className="font-cinzel text-xl font-bold text-royal-gold-l">
            Game Over! {secondsLeft > 0 && <span className="font-mono text-sm text-ink-muted">Final scores in {secondsLeft}...</span>}
          </span>
        ) : secondsLeft > 0 ? (
          <>
            Next round in <span className="font-mono text-base font-medium text-ink">{secondsLeft}</span>...
          </>
        ) : (
          'Dealing the next round…'
        )}
      </motion.p>
    </section>
  );
}

interface ResultCardProps {
  role: Role;
  name: string;
  points: number;
  isMe: boolean;
  flipDelay: number;
}

const faceStyle = { backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' } as const;

/** A face-down chit that flips open to show the player, their role and the points they earned. */
function ResultCard({ role, name, points, isMe, flipDelay }: ResultCardProps) {
  const reduceMotion = useReducedMotion();
  const meta = ROLE_META[role];

  return (
    <li className="h-44 [perspective:1000px] sm:h-48">
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: 'preserve-3d' }}
        initial={{ rotateY: reduceMotion ? 0 : 180 }}
        animate={{ rotateY: 0 }}
        transition={{ delay: reduceMotion ? 0 : flipDelay, duration: reduceMotion ? 0 : FLIP_DURATION_S, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Front: revealed role */}
        <div
          style={faceStyle}
          className={`absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl border-2 bg-royal-card p-3 shadow-xl ${meta.borderClass} ${meta.glowClass}`}
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
            delay={flipDelay + FLIP_DURATION_S * 0.8}
            prefix="+"
            className={`relative mt-1 font-mono text-xl font-medium ${points === 0 ? 'text-ink-muted' : 'text-royal-gold-l'}`}
          />
        </div>

        {/* Back: face-down chit */}
        <div
          style={{ ...faceStyle, transform: 'rotateY(180deg)' }}
          className="absolute inset-0 flex items-center justify-center rounded-2xl border-2 border-royal-border bg-gradient-to-br from-royal-card to-royal-dark shadow-xl"
          aria-hidden
        >
          <span className="font-cinzel text-5xl font-black text-royal-gold/60">?</span>
        </div>
      </motion.div>
    </li>
  );
}

export const RESULT_COUNT_UP_DELAY_S = COUNT_UP_S + ROLE_ORDER.length * FLIP_STAGGER_S;
