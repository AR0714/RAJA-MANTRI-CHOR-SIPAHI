import { create } from 'zustand';
import type {
  FinalScoreEntry,
  GamePhase,
  PublicPlayer,
  Role,
  RoundResult,
  RoundResultPayload,
} from '../types/game.types';

export type PendingAction = 'create' | 'join' | 'start' | null;

interface GameState {
  roomCode: string | null;
  playerId: string | null;
  myPlayerName: string;
  players: PublicPlayer[];
  myRole: Role | null;
  phase: GamePhase;
  currentRound: number;
  maxRounds: number;
  totalScores: Record<string, number>;
  roundHistory: RoundResult[];
  isConnected: boolean;
  winner: FinalScoreEntry | null;
  /** Set once the Raja is revealed for the current round. */
  rajaId: string | null;
  /** Set once the Sipahi reveals themselves for the current round. */
  sipahiId: string | null;
  /** The two players the Sipahi must choose between. */
  hiddenPlayers: PublicPlayer[];
  /** Local timestamp (ms) when the server-side guess timer ends. */
  guessDeadline: number | null;
  /** Length of the guess timer, for drawing the countdown ring. */
  guessTimerSeconds: number;
  lastRoundResult: RoundResultPayload | null;
  /** The request the user is waiting on, used for button spinners. */
  pendingAction: PendingAction;
}

interface GameActions {
  setRoomCode: (roomCode: string | null) => void;
  setPlayerId: (playerId: string | null) => void;
  setMyPlayerName: (name: string) => void;
  setPlayers: (players: PublicPlayer[]) => void;
  setMyRole: (role: Role | null) => void;
  setPhase: (phase: GamePhase) => void;
  setCurrentRound: (round: number) => void;
  setMaxRounds: (maxRounds: number) => void;
  setScores: (totalScores: Record<string, number>) => void;
  addRoundResult: (result: RoundResult) => void;
  setRoundHistory: (history: RoundResult[]) => void;
  setWinner: (winner: FinalScoreEntry | null) => void;
  setConnected: (isConnected: boolean) => void;
  setRajaId: (rajaId: string | null) => void;
  setSipahiId: (sipahiId: string | null) => void;
  setGuessing: (hiddenPlayers: PublicPlayer[], timerSeconds: number) => void;
  setLastRoundResult: (result: RoundResultPayload | null) => void;
  /** Clears per-round state before a new deal. */
  resetRound: () => void;
  setPendingAction: (action: PendingAction) => void;
  /** Clears everything tied to a room. Connection status is kept. */
  reset: () => void;
}

export type GameStore = GameState & GameActions;

const initialRoomState: Omit<GameState, 'isConnected'> = {
  roomCode: null,
  playerId: null,
  myPlayerName: '',
  players: [],
  myRole: null,
  phase: 'LOBBY',
  currentRound: 0,
  maxRounds: 10,
  totalScores: {},
  roundHistory: [],
  winner: null,
  rajaId: null,
  sipahiId: null,
  hiddenPlayers: [],
  guessDeadline: null,
  guessTimerSeconds: 15,
  lastRoundResult: null,
  pendingAction: null,
};

export const useGameStore = create<GameStore>()((set) => ({
  ...initialRoomState,
  isConnected: false,

  setRoomCode: (roomCode) => set({ roomCode }),
  setPlayerId: (playerId) => set({ playerId }),
  setMyPlayerName: (myPlayerName) => set({ myPlayerName }),
  setPlayers: (players) => set({ players }),
  setMyRole: (myRole) => set({ myRole }),
  setPhase: (phase) => set({ phase }),
  setCurrentRound: (currentRound) => set({ currentRound }),
  setMaxRounds: (maxRounds) => set({ maxRounds }),
  setScores: (totalScores) => set({ totalScores }),
  addRoundResult: (result) =>
    set((state) => ({
      roundHistory: [...state.roundHistory.filter((r) => r.round !== result.round), result],
    })),
  setRoundHistory: (roundHistory) => set({ roundHistory }),
  setWinner: (winner) => set({ winner }),
  setConnected: (isConnected) => set({ isConnected }),
  setRajaId: (rajaId) => set({ rajaId }),
  setSipahiId: (sipahiId) => set({ sipahiId }),
  setGuessing: (hiddenPlayers, timerSeconds) =>
    set({
      hiddenPlayers,
      guessTimerSeconds: timerSeconds,
      guessDeadline: Date.now() + timerSeconds * 1000,
    }),
  setLastRoundResult: (lastRoundResult) => set({ lastRoundResult }),
  resetRound: () =>
    set({
      myRole: null,
      rajaId: null,
      sipahiId: null,
      hiddenPlayers: [],
      guessDeadline: null,
      lastRoundResult: null,
    }),
  setPendingAction: (pendingAction) => set({ pendingAction }),
  reset: () => set({ ...initialRoomState }),
}));
