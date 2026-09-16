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
  id: string; // socket.id
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
  guessTimer?: NodeJS.Timeout;
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

// ─── Server → Client payloads ─────────────────────────────────────────────────

export interface RoomCreatedPayload {
  roomCode: string;
  playerId: string;
  player: PublicPlayer;
}

export interface RoomJoinedPayload {
  roomCode: string;
  playerId: string;
  players: PublicPlayer[];
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
}

export interface RoundResultPayload {
  correct: boolean;
  roles: Record<string, Role>;
  roundScores: Record<string, number>;
  totalScores: Record<string, number>;
  round: number;
}

export interface GameOverPayload {
  finalScores: FinalScoreEntry[];
  winner: FinalScoreEntry;
  roundHistory: RoundResult[];
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
}

export interface ServerToClientEvents {
  room_created: (payload: RoomCreatedPayload) => void;
  room_joined: (payload: RoomJoinedPayload) => void;
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

export type SocketData = Record<string, never>;
