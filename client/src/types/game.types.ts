// Mirrors server/src/game/types.ts — keep the two files in sync.

// ─── Core game types ──────────────────────────────────────────────────────────

export type Role = 'raja' | 'mantri' | 'sipahi' | 'chor';

export type GamePhase =
  | 'LOBBY'
  | 'CHIT_DEALING'
  | 'RAJA_REVEAL'
  | 'SIPAHI_REVEAL'
  | 'SIPAHI_GUESSING'
  | 'ROUND_RESULT'
  | 'GAME_OVER';

export interface Player {
  id: string; // stable id (uuid) — survives reconnects, unlike socket.id
  name: string;
  isHost: boolean;
  isConnected: boolean;
  totalScore: number;
  role?: Role; // Only populated after dealing, only sent privately
}

/** A player as other clients may see them — the role is never included. */
export type PublicPlayer = Omit<Player, 'role'>;

export interface Room {
  code: string;
  players: Player[];
  phase: GamePhase;
  currentRound: number; // 1–10 (0 while in the lobby)
  maxRounds: number; // 10
  hostId: string;
  rajaId?: string;
  sipahiId?: string;
  roundHistory: RoundResult[];
}

export interface RoundResult {
  round: number;
  rajaId: string;
  mantriId: string;
  sipahiId: string;
  chorId: string;
  guessedPlayerId: string | null; // null when the guess timer ran out
  correct: boolean;
  roundScores: Record<string, number>;
}

/** Room state that is safe to broadcast to everyone in the room. */
export interface PublicGameState {
  code: string;
  players: PublicPlayer[];
  phase: GamePhase;
  currentRound: number;
  maxRounds: number;
  hostId: string;
  rajaId?: string; // present once the Raja has been revealed
  sipahiId?: string; // present once the Sipahi has revealed themselves
}

export interface FinalScoreEntry {
  playerId: string;
  name: string;
  totalScore: number;
}

export type ErrorCode =
  | 'INVALID_INPUT'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'NAME_TAKEN'
  | 'ALREADY_IN_ROOM'
  | 'NOT_IN_ROOM'
  | 'NOT_HOST'
  | 'NOT_ENOUGH_PLAYERS'
  | 'GAME_IN_PROGRESS'
  | 'INVALID_PHASE'
  | 'NOT_YOUR_TURN'
  | 'INVALID_TARGET'
  | 'REJOIN_FAILED'
  | 'INTERNAL_ERROR';

// ─── Client → Server payloads ─────────────────────────────────────────────────

export type EmptyPayload = Record<string, never>;

export interface CreateRoomPayload {
  playerName: string;
}

export interface JoinRoomPayload {
  roomCode: string;
  playerName: string;
}

export interface UpdateNamePayload {
  name: string;
}

export type StartGamePayload = EmptyPayload;
export type RajaCallsSipahiPayload = EmptyPayload;
export type SipahiRevealPayload = EmptyPayload;

export interface SipahiGuessPayload {
  targetPlayerId: string;
}

export type PlayAgainPayload = EmptyPayload;

export interface RejoinRoomPayload {
  roomCode: string;
  playerId: string;
  reconnectToken: string;
}

export type LeaveRoomPayload = EmptyPayload;

// ─── Server → Client payloads ─────────────────────────────────────────────────

export interface RoomCreatedPayload {
  roomCode: string;
  playerId: string;
  player: PublicPlayer;
  /** Secret for rejoining after a disconnect. Sent only to this player. */
  reconnectToken: string;
}

export interface RoomJoinedPayload {
  roomCode: string;
  playerId: string;
  players: PublicPlayer[];
  /** Secret for rejoining after a disconnect. Sent only to this player. */
  reconnectToken: string;
}

export interface RoomUpdatePayload {
  players: PublicPlayer[];
  playerCount: number;
  hostId: string;
}

export interface GameStartedPayload {
  gameState: PublicGameState;
  roundNumber: number;
}

export interface PhaseChangedPayload {
  gameState: PublicGameState;
}

export interface RoleAssignedPayload {
  role: Role;
  points: number;
}

export interface RajaRevealedPayload {
  rajaPlayerId: string;
  rajaName: string;
}

export interface SipahiRevealedPayload {
  sipahiPlayerId: string;
  sipahiName: string;
}

export interface SipahiGuessingPayload {
  hiddenPlayers: PublicPlayer[];
  timerSeconds: number;
  /** Server clock (epoch ms) when the guess timer runs out. Clients count down to this. */
  endsAt: number;
}

export interface RoundResultPayload {
  guessedPlayerId: string | null; // null when the guess timer ran out
  correct: boolean;
  roles: Record<string, Role>;
  roundScores: Record<string, number>;
  totalScores: Record<string, number>;
  round: number;
  /** Server clock (epoch ms) when the next round (or game over) begins. */
  nextPhaseAt: number;
}

export interface GameOverPayload {
  finalScores: FinalScoreEntry[];
  winner: FinalScoreEntry;
  roundHistory: RoundResult[];
}

export type GuessingSnapshot = SipahiGuessingPayload;

/** Everything a reconnecting player needs to catch up. Sent only to them. */
export interface RoomRejoinedPayload {
  roomCode: string;
  playerId: string;
  reconnectToken: string;
  gameState: PublicGameState;
  myRole: Role | null;
  guessing: GuessingSnapshot | null;
  lastRoundResult: RoundResultPayload | null;
  gameOver: GameOverPayload | null;
  roundHistory: RoundResult[];
}

export interface TimeSyncResponse {
  /** Server clock (epoch ms) when the request was handled. */
  serverNow: number;
}

export interface SessionReplacedPayload {
  message: string;
}

export interface PlayerDisconnectedPayload {
  playerName: string;
  remainingCount: number;
}

export interface ErrorPayload {
  message: string;
  code: ErrorCode;
}

// ─── Socket.io event maps ─────────────────────────────────────────────────────

export interface ClientToServerEvents {
  create_room: (payload: CreateRoomPayload) => void;
  join_room: (payload: JoinRoomPayload) => void;
  update_name: (payload: UpdateNamePayload) => void;
  start_game: (payload?: StartGamePayload) => void;
  raja_calls_sipahi: (payload?: RajaCallsSipahiPayload) => void;
  sipahi_reveal: (payload?: SipahiRevealPayload) => void;
  sipahi_guess: (payload: SipahiGuessPayload) => void;
  play_again: (payload?: PlayAgainPayload) => void;
  rejoin_room: (payload: RejoinRoomPayload) => void;
  leave_room: (payload?: LeaveRoomPayload) => void;
  time_sync: (payload: EmptyPayload, ack: (response: TimeSyncResponse) => void) => void;
}

export interface ServerToClientEvents {
  room_created: (payload: RoomCreatedPayload) => void;
  room_joined: (payload: RoomJoinedPayload) => void;
  room_rejoined: (payload: RoomRejoinedPayload) => void;
  session_replaced: (payload: SessionReplacedPayload) => void;
  room_update: (payload: RoomUpdatePayload) => void;
  game_started: (payload: GameStartedPayload) => void;
  phase_changed: (payload: PhaseChangedPayload) => void;
  role_assigned: (payload: RoleAssignedPayload) => void;
  raja_revealed: (payload: RajaRevealedPayload) => void;
  sipahi_revealed: (payload: SipahiRevealedPayload) => void;
  sipahi_guessing: (payload: SipahiGuessingPayload) => void;
  round_result: (payload: RoundResultPayload) => void;
  game_over: (payload: GameOverPayload) => void;
  player_disconnected: (payload: PlayerDisconnectedPayload) => void;
  error: (payload: ErrorPayload) => void;
}

export type InterServerEvents = Record<string, never>;

export interface SocketData {
  roomCode?: string;
  playerId?: string;
}
