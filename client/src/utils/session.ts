/**
 * The saved seat a player can rejoin after a refresh or dropped connection.
 *
 * It is written to both storages: sessionStorage is per tab, so a refreshed tab
 * rejoins as the right player even when several tabs are open; localStorage
 * survives the tab closing, so the home page can offer to rejoin.
 */
export interface SavedSession {
  roomCode: string;
  playerId: string;
  reconnectToken: string;
}

const SESSION_KEY = 'rmcs:session';

/** Routes that belong to a room, where a refresh should rejoin automatically. */
const ROOM_PATHS = ['/lobby', '/game'];

function isSavedSession(value: unknown): value is SavedSession {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.roomCode === 'string' && typeof v.playerId === 'string' && typeof v.reconnectToken === 'string';
}

function read(storage: () => Storage): SavedSession | null {
  try {
    const raw = storage().getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSavedSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function write(storage: () => Storage, session: SavedSession | null): void {
  try {
    if (session) storage().setItem(SESSION_KEY, JSON.stringify(session));
    else storage().removeItem(SESSION_KEY);
  } catch {
    // Storage may be unavailable (private mode); rejoining is then best-effort.
  }
}

export function saveSession(session: SavedSession): void {
  write(() => sessionStorage, session);
  write(() => localStorage, session);
}

/** This tab's session first, then the most recent one from any tab. */
export function loadSession(): SavedSession | null {
  return read(() => sessionStorage) ?? read(() => localStorage);
}

/** A session that another tab or a closed tab left behind (used by the home page). */
export function loadStoredSession(): SavedSession | null {
  return read(() => localStorage);
}

export function clearSession(): void {
  write(() => sessionStorage, null);
  write(() => localStorage, null);
}

/** Forget this tab's session only (another tab took over the seat). */
export function clearTabSession(): void {
  write(() => sessionStorage, null);
}

/** Whether this page load should try to rejoin before rendering room pages. */
export function shouldRejoinOnLoad(): boolean {
  if (typeof window === 'undefined') return false;
  return ROOM_PATHS.includes(window.location.pathname) && loadSession() !== null;
}
