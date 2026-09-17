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

export function buildWhatsAppShareUrl(roomCode: string): string {
  const text = `Join my Raja Mantri game! Code: ${roomCode}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
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
