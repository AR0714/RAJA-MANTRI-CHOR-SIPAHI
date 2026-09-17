import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import type { GamePhase } from '../types/game.types';

export const APP_TITLE = 'Raja Mantri Chor Sipahi';

function gameTitle(phase: GamePhase, round: number): string {
  switch (phase) {
    case 'CHIT_DEALING':
      return 'Your Role';
    case 'SIPAHI_GUESSING':
      return 'Choose!';
    case 'ROUND_RESULT':
      return `Round ${round} Result`;
    case 'GAME_OVER':
      return 'Game Over';
    case 'RAJA_REVEAL':
    case 'SIPAHI_REVEAL':
      return `Round ${round}`;
    case 'LOBBY':
      return 'Waiting';
  }
}

/** Keeps the browser tab title in sync with the current page and game phase. */
export function useDocumentTitle(): void {
  const { pathname } = useLocation();
  const phase = useGameStore((s) => s.phase);
  const round = useGameStore((s) => s.currentRound);

  useEffect(() => {
    let prefix: string | null = null;
    if (pathname === '/lobby') prefix = 'Waiting';
    else if (pathname === '/game') prefix = gameTitle(phase, round);

    document.title = prefix ? `${prefix} — ${APP_TITLE}` : APP_TITLE;
  }, [pathname, phase, round]);
}
