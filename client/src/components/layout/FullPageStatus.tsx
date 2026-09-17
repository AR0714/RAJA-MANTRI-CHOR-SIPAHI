import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

interface FullPageStatusProps {
  emoji: string;
  title: string;
  message?: string;
  /** Spins the emoji to show that something is in progress. */
  spinning?: boolean;
  children?: ReactNode;
}

/** Centered full-screen message used for loading, errors and outages. */
export function FullPageStatus({ emoji, title, message, spinning = false, children }: FullPageStatusProps) {
  const reduceMotion = useReducedMotion();

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-royal-dark px-4 text-center"
      aria-live="polite"
    >
      <motion.div
        aria-hidden
        className="text-7xl"
        animate={spinning && !reduceMotion ? { rotate: 360 } : undefined}
        transition={spinning ? { duration: 1.6, repeat: Infinity, ease: 'linear' } : undefined}
      >
        {emoji}
      </motion.div>
      <h1 className="mt-6 font-cinzel text-2xl font-bold text-royal-gold-l sm:text-3xl">{title}</h1>
      {message && <p className="mt-3 max-w-sm font-poppins text-sm text-ink-muted">{message}</p>}
      {children && <div className="mt-8">{children}</div>}
    </main>
  );
}
