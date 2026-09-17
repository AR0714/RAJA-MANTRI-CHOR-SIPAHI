import type { Role, RoundResult, RoundResultPayload } from '../types/game.types';

export const MAX_PLAYERS = 4;
export const ROOM_CODE_LENGTH = 6;
export const NAME_MAX_LENGTH = 20;

/** Uppercases and strips anything that can't appear in a room code. */
export function normalizeRoomCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, ROOM_CODE_LENGTH);
}

export function isValidRoomCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}

export function isValidPlayerName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= NAME_MAX_LENGTH;
}

/**
 * Link that opens the home page with the room code pre-filled, e.g.
 * https://your-app.vercel.app/?code=ABC123. Uses the current site's origin, so it
 * points at the deployed URL in production.
 */
export function buildInviteUrl(roomCode: string, origin: string = window.location.origin): string {
  return `${origin}/?code=${encodeURIComponent(roomCode)}`;
}

export function buildInviteMessage(roomCode: string): string {
  return `Join my Raja Mantri game! 👑 Code: ${roomCode}\n${buildInviteUrl(roomCode)}`;
}

export function buildWhatsAppShareUrl(roomCode: string): string {
  return `https://wa.me/?text=${encodeURIComponent(buildInviteMessage(roomCode))}`;
}

/** 1 → "1st", 2 → "2nd", 3 → "3rd", 4 → "4th". */
export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
}

/**
 * Players ranked by total score; ties go to whoever joined the room first
 * (the same rule the server uses to pick the winner).
 */
export function rankPlayers<T extends { id: string }>(players: T[], scoreOf: (p: T) => number): T[] {
  return players
    .map((player, joinOrder) => ({ player, joinOrder, score: scoreOf(player) }))
    .sort((a, b) => b.score - a.score || a.joinOrder - b.joinOrder)
    .map(({ player }) => player);
}

/** Formats seconds as m:ss. */
export function formatTimer(totalSeconds: number): string {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Builds a history entry from a round_result payload. */
export function toRoundResult(payload: RoundResultPayload): RoundResult | null {
  const idFor = (role: Role): string | undefined =>
    Object.keys(payload.roles).find((id) => payload.roles[id] === role);

  const rajaId = idFor('raja');
  const mantriId = idFor('mantri');
  const sipahiId = idFor('sipahi');
  const chorId = idFor('chor');
  if (!rajaId || !mantriId || !sipahiId || !chorId) return null;

  return {
    round: payload.round,
    rajaId,
    mantriId,
    sipahiId,
    chorId,
    guessedPlayerId: payload.guessedPlayerId,
    correct: payload.correct,
    roundScores: payload.roundScores,
  };
}
