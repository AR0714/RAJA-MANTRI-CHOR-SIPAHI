import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { Role } from '../../types/game.types';
import { ROLE_META } from '../../utils/roles';

interface ChitCardProps {
  /** The role on the face of the card. `null` keeps it face-down. */
  role: Role | null;
  revealed: boolean;
  /** Private chits show a "Keep this secret!" reminder after flipping. */
  isPrivate?: boolean;
  size?: 'md' | 'lg';
}

const SECRET_HINT_MS = 3000;

const SIZE_CLASSES = {
  md: 'h-64 w-44',
  lg: 'h-80 w-56 sm:h-96 sm:w-64',
} as const;

const faceStyle = { backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' } as const;

export function ChitCard({ role, revealed, isPrivate = false, size = 'lg' }: ChitCardProps) {
  const reduceMotion = useReducedMotion();
  const isFaceUp = revealed && role !== null;
  const meta = role ? ROLE_META[role] : null;
  const [showSecretHint, setShowSecretHint] = useState(false);

  useEffect(() => {
    if (!isFaceUp || !isPrivate) return;
    setShowSecretHint(true);
    const timer = window.setTimeout(() => setShowSecretHint(false), SECRET_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [isFaceUp, isPrivate]);

  return (
    <div className="flex flex-col items-center">
      <div className={`${SIZE_CLASSES[size]} [perspective:1200px]`}>
        <motion.div
          className="relative h-full w-full"
          style={{ transformStyle: 'preserve-3d' }}
          initial={false}
          animate={{ rotateY: isFaceUp ? 180 : 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Back: face-down chit */}
          <div
            style={faceStyle}
            className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-royal-border bg-gradient-to-br from-royal-card via-royal-surface to-royal-dark shadow-2xl shadow-black/50"
          >
            <div
              aria-hidden
              className="absolute inset-3 rounded-2xl border border-dashed border-royal-gold/25 bg-[repeating-linear-gradient(45deg,rgba(245,158,11,0.04)_0_10px,transparent_10px_20px)]"
            />
            <span className="relative font-cinzel text-7xl font-black text-royal-gold/70">?</span>
            <span className="relative mt-2 font-mono text-xs uppercase tracking-[0.3em] text-ink-muted">Chit</span>
          </div>

          {/* Front: the role */}
          <div
            style={{ ...faceStyle, transform: 'rotateY(180deg)' }}
            className={`absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl border-2 bg-royal-card p-5 shadow-2xl ${
              meta ? `${meta.borderClass} ${meta.glowClass}` : 'border-royal-border'
            }`}
            aria-hidden={!isFaceUp}
          >
            {meta && (
              <>
                <div className={`absolute inset-0 rounded-3xl ${meta.bgClass}`} aria-hidden />
                <span className="relative text-7xl sm:text-8xl" role="img" aria-label={meta.label}>
                  {meta.emoji}
                </span>
                <span className={`relative font-cinzel text-3xl font-black sm:text-4xl ${meta.textClass}`}>
                  {meta.label}
                </span>
                <span className="relative font-poppins text-xs uppercase tracking-[0.25em] text-ink-muted">
                  {meta.meaning}
                </span>
                <span
                  className={`relative mt-1 rounded-full border px-3 py-1 font-mono text-sm font-medium ${meta.borderClass} ${meta.textClass}`}
                >
                  {meta.points.toLocaleString('en-IN')} pts
                </span>
                <span className="relative text-center font-poppins text-[11px] text-ink-muted">{meta.pointsNote}</span>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {isPrivate && (
        <div className="mt-5 h-6">
          <AnimatePresence>
            {showSecretHint && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="font-poppins text-sm font-semibold text-royal-gold-l"
              >
                🤫 Keep this secret!
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
