import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useGameStore } from '../../store/gameStore';

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

export function PageWrapper({ children, className = '' }: PageWrapperProps) {
  const isConnected = useGameStore((s) => s.isConnected);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-royal-dark">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.12),transparent_65%)]"
      />
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2 font-mono text-xs text-ink-muted">
        <span
          className={`h-2 w-2 rounded-full ${isConnected ? 'bg-role-sipahi' : 'animate-pulse bg-role-chor'}`}
        />
        {isConnected ? 'Online' : 'Connecting…'}
      </div>
      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className={`relative mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 ${className}`}
      >
        {children}
      </motion.main>
    </div>
  );
}
