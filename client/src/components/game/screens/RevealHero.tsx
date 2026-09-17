import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

interface RevealHeroProps {
  emoji: string;
  /** `celebrate` bounces the emoji in; `pulse` gently breathes while waiting. */
  mode: 'celebrate' | 'pulse';
  glowColor: string;
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
}

export function RevealHero({ emoji, mode, glowColor, eyebrow, title, subtitle, children }: RevealHeroProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="flex flex-col items-center text-center">
      <div className="relative flex h-44 w-44 items-center justify-center sm:h-52 sm:w-52">
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-full blur-2xl"
          style={{ backgroundColor: glowColor }}
          initial={{ opacity: 0.15, scale: 0.8 }}
          animate={reduceMotion ? { opacity: 0.25 } : { opacity: [0.15, 0.4, 0.15], scale: [0.8, 1.05, 0.8] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.span
          className="relative text-8xl sm:text-9xl"
          aria-hidden
          initial={mode === 'celebrate' ? { scale: 0, rotate: -30, y: -40 } : { scale: 0.9 }}
          animate={
            reduceMotion
              ? { scale: 1, rotate: 0, y: 0 }
              : mode === 'celebrate'
                ? { scale: 1, rotate: 0, y: 0 }
                : { scale: [0.9, 1.05, 0.9] }
          }
          transition={
            mode === 'celebrate'
              ? { type: 'spring', stiffness: 200, damping: 10 }
              : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
          }
        >
          {emoji}
        </motion.span>
      </div>

      {eyebrow && (
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.3em] text-ink-muted">{eyebrow}</p>
      )}
      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-2 font-cinzel text-3xl font-black text-ink sm:text-5xl"
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-3 max-w-md font-poppins text-sm text-ink-muted sm:text-base"
        >
          {subtitle}
        </motion.p>
      )}
      {children && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          {children}
        </motion.div>
      )}
    </section>
  );
}
