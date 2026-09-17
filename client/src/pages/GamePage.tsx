import { AnimatePresence, motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { GameHeader } from '../components/game/GameHeader';
import { PlayerStrip } from '../components/game/PlayerStrip';
import { DealingScreen } from '../components/game/screens/DealingScreen';
import { GameOverScreen } from '../components/game/screens/GameOverScreen';
import { GuessingScreen } from '../components/game/screens/GuessingScreen';
import { RajaRevealScreen } from '../components/game/screens/RajaRevealScreen';
import { ResultScreen } from '../components/game/screens/ResultScreen';
import { SipahiRevealScreen } from '../components/game/screens/SipahiRevealScreen';
import { useGameStore } from '../store/gameStore';
import type { GamePhase } from '../types/game.types';

function PhaseScreen({ phase }: { phase: GamePhase }) {
  switch (phase) {
    case 'CHIT_DEALING':
      return <DealingScreen />;
    case 'RAJA_REVEAL':
      return <RajaRevealScreen />;
    case 'SIPAHI_REVEAL':
      return <SipahiRevealScreen />;
    case 'SIPAHI_GUESSING':
      return <GuessingScreen />;
    case 'ROUND_RESULT':
      return <ResultScreen />;
    case 'GAME_OVER':
      return <GameOverScreen />;
    case 'LOBBY':
      return null;
  }
}

export function GamePage() {
  const roomCode = useGameStore((s) => s.roomCode);
  const phase = useGameStore((s) => s.phase);
  const currentRound = useGameStore((s) => s.currentRound);

  if (!roomCode) return <Navigate to="/" replace />;
  if (phase === 'LOBBY') return <Navigate to="/lobby" replace />;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-royal-dark">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.10),transparent_65%)]"
      />
      <div className="sticky top-0 z-30">
        <GameHeader />
        {phase !== 'GAME_OVER' && <PlayerStrip />}
      </div>
      <main className="relative mx-auto flex min-h-[calc(100vh-110px)] w-full max-w-5xl flex-col justify-center px-4 py-10 sm:px-6">
        <AnimatePresence mode="wait">
          <motion.div
            // Remount per phase and round so each screen starts its animations fresh.
            key={`${phase}-${currentRound}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <PhaseScreen phase={phase} />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
