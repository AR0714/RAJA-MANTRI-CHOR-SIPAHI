import type { Role } from './types';

export const MAX_PLAYERS = 4;
export const MAX_ROUNDS = 10;

export const ROLE_POINTS: Readonly<Record<Role, number>> = {
  raja: 1000,
  mantri: 500,
  sipahi: 800,
  chor: 800,
};

export const ROLES: readonly Role[] = ['raja', 'mantri', 'sipahi', 'chor'];

export const NAME_MIN_LENGTH = 1;
export const NAME_MAX_LENGTH = 20;
export const ROOM_CODE_PATTERN = /^[A-Z0-9]{6}$/;

/** Server-side Sipahi guess timer. */
export const GUESS_TIMER_SECONDS = 15;
/** Time players get to flip and read their chit before the Raja is revealed. */
export const DEAL_REVEAL_DELAY_MS = 4000;
/** Time the round result is shown before the next round is dealt. */
export const ROUND_RESULT_DELAY_MS = 3000;
/** Delay before the server acts on behalf of a disconnected Raja or Sipahi. */
export const AUTO_ACTION_DELAY_MS = 2000;
