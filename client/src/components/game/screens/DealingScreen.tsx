import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, type CSSProperties } from 'react';
import { useAudio } from '../../../hooks/useAudio';
import { useGameStore } from '../../../store/gameStore';
import { ChitCard } from '../ChitCard';

const SHUFFLE_MS = 1500;

type ShuffleStyle = CSSProperties & Record<'--tilt' | '--shift', string>;

const SHUFFLE_CARDS: ShuffleStyle[] = [
  { '--tilt': '-8deg', '--shift': '-60px', animationDelay: '0s' },
  { '--tilt': '5deg', '--shift': '50px', animationDelay: '0.12s' },
  { '--tilt': '-3deg', '--shift': '-35px', animationDelay: '0.24s' },
  { '--tilt': '9deg', '--shift': '70px', animationDelay: '0.36s' },
];

export function DealingScreen() {
  const myRole = useGameStore((s) => s.myRole);
  const { playShuffle, playReveal } = useAudio();
  const [shuffleDone, setShuffleDone] = useState(false);
  const revealed = shuffleDone && myRole !== null;

  useEffect(() => {
    playShuffle();
    const timer = window.setTimeout(() => setShuffleDone(true), SHUFFLE_MS);
    return () => window.clearTimeout(timer);
  }, [playShuffle]);

  useEffect(() => {
    if (revealed) playReveal();
  }, [revealed, playReveal]);

  return (
    <section className="flex flex-col items-center text-center">
      <AnimatePresence mode="wait">
        {!shuffleDone ? (
          <motion.div
            key="shuffle"
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center"
          >
            <div className="relative h-64 w-44 sm:h-80 sm:w-56" aria-hidden>
              {SHUFFLE_CARDS.map((style, i) => (
                <div
                  key={i}
                  style={style}
                  className="shuffle-card absolute inset-0 flex items-center justify-center rounded-3xl border-2 border-royal-border bg-gradient-to-br from-royal-card to-royal-dark shadow-2xl shadow-black/50"
                >
                  <span className="font-cinzel text-5xl font-black text-royal-gold/50">?</span>
                </div>
              ))}
            </div>
            <p className="mt-8 animate-pulse font-cinzel text-2xl font-bold text-royal-gold-l sm:text-3xl">
              Dealing chits...
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <ChitCard role={myRole} revealed={revealed} isPrivate />
            <p className="mt-2 max-w-sm font-poppins text-sm text-ink-muted sm:text-base">
              {revealed ? 'Your role this round — keep it secret from others!' : 'Waiting for your chit…'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
