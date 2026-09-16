import { randomInt } from 'crypto';
import {
  GUESS_TIMER_SECONDS,
  MAX_PLAYERS,
  MAX_ROUNDS,
  ROLES,
  ROLE_POINTS,
} from './constants';
import { GameError } from './errors';
import type {
  FinalScoreEntry,
  GameOverPayload,
  GamePhase,
  Player,
  PublicGameState,
  PublicPlayer,
  RajaRevealedPayload,
  Role,
  Room as RoomState,
  RoundResult,
  RoundResultPayload,
  SipahiGuessingPayload,
  SipahiRevealedPayload,
} from './types';

export interface PlayerIdentity {
  id: string;
  name: string;
}

export interface RoleAssignment {
  playerId: string;
  role: Role;
  points: number;
}

export type AdvanceResult =
  | { type: 'next_round'; assignments: RoleAssignment[] }
  | { type: 'game_over'; payload: GameOverPayload };

/** Phases in which the Raja's identity is public. */
const RAJA_PUBLIC_PHASES: readonly GamePhase[] = [
  'RAJA_REVEAL',
  'SIPAHI_REVEAL',
  'SIPAHI_GUESSING',
  'ROUND_RESULT',
];

/** Phases in which the Sipahi's identity is public. */
const SIPAHI_PUBLIC_PHASES: readonly GamePhase[] = ['SIPAHI_GUESSING', 'ROUND_RESULT'];

function toPublicPlayer(player: Player): PublicPlayer {
  return {
    id: player.id,
    name: player.name,
    isHost: player.isHost,
    isConnected: player.isConnected,
    totalScore: player.totalScore,
  };
}

function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const a = result[i] as T;
    result[i] = result[j] as T;
    result[j] = a;
  }
  return result;
}

export class Room {
  private readonly state: RoomState;
  /** Pending automatic phase transition (deal delay, next round, auto-actions). */
  private transitionTimer: NodeJS.Timeout | undefined;

  constructor(roomCode: string, hostPlayer: PlayerIdentity) {
    this.state = {
      code: roomCode,
      players: [
        {
          id: hostPlayer.id,
          name: hostPlayer.name,
          isHost: true,
          isConnected: true,
          totalScore: 0,
        },
      ],
      phase: 'LOBBY',
      currentRound: 0,
      maxRounds: MAX_ROUNDS,
      hostId: hostPlayer.id,
      roundHistory: [],
    };
  }

  // ─── Read-only accessors ────────────────────────────────────────────────────

  get code(): string {
    return this.state.code;
  }

  get phase(): GamePhase {
    return this.state.phase;
  }

  get hostId(): string {
    return this.state.hostId;
  }

  get currentRound(): number {
    return this.state.currentRound;
  }

  get rajaId(): string | undefined {
    return this.state.rajaId;
  }

  get sipahiId(): string | undefined {
    return this.state.sipahiId;
  }

  get connectedCount(): number {
    return this.state.players.filter((p) => p.isConnected).length;
  }

  /** True when nobody connected is left in the room. */
  get isEmpty(): boolean {
    return this.connectedCount === 0;
  }

  hasPlayer(playerId: string): boolean {
    return this.state.players.some((p) => p.id === playerId);
  }

  getPublicPlayer(playerId: string): PublicPlayer | undefined {
    const player = this.findPlayer(playerId);
    return player ? toPublicPlayer(player) : undefined;
  }

  getPublicPlayers(): PublicPlayer[] {
    return this.state.players.map(toPublicPlayer);
  }

  isPlayerConnected(playerId: string | undefined): boolean {
    return playerId !== undefined && this.findPlayer(playerId)?.isConnected === true;
  }

  // ─── Lobby ──────────────────────────────────────────────────────────────────

  addPlayer(identity: PlayerIdentity): PublicPlayer {
    if (this.state.phase !== 'LOBBY') {
      throw new GameError('GAME_IN_PROGRESS', 'This game has already started.');
    }
    if (this.hasPlayer(identity.id)) {
      throw new GameError('ALREADY_IN_ROOM', 'You are already in this room.');
    }
    if (this.state.players.length >= MAX_PLAYERS) {
      throw new GameError('ROOM_FULL', `This room already has ${MAX_PLAYERS} players.`);
    }
    this.assertNameAvailable(identity.name, identity.id);

    const player: Player = {
      id: identity.id,
      name: identity.name,
      isHost: false,
      isConnected: true,
      totalScore: 0,
    };
    this.state.players.push(player);
    return toPublicPlayer(player);
  }

  /** Removes a player entirely (lobby / game over). Reassigns host if needed. */
  removePlayer(playerId: string): PublicPlayer | undefined {
    const index = this.state.players.findIndex((p) => p.id === playerId);
    if (index === -1) return undefined;

    const [removed] = this.state.players.splice(index, 1);
    if (removed && removed.id === this.state.hostId) {
      this.reassignHost();
    }
    return removed ? toPublicPlayer(removed) : undefined;
  }

  /** Marks a player as disconnected mid-game, keeping their seat and score. */
  markDisconnected(playerId: string): PublicPlayer | undefined {
    const player = this.findPlayer(playerId);
    if (!player) return undefined;

    player.isConnected = false;
    if (player.id === this.state.hostId) {
      this.reassignHost();
    }
    return toPublicPlayer(player);
  }

  updateName(playerId: string, name: string): void {
    if (this.state.phase !== 'LOBBY') {
      throw new GameError('INVALID_PHASE', 'Names can only be changed in the lobby.');
    }
    const player = this.requirePlayer(playerId);
    this.assertNameAvailable(name, playerId);
    player.name = name;
  }

  canStart(): boolean {
    return (
      this.state.phase === 'LOBBY' &&
      this.state.players.length === MAX_PLAYERS &&
      this.state.players.every((p) => p.isConnected)
    );
  }

  startGame(requesterId: string): RoleAssignment[] {
    this.assertHost(requesterId);
    if (this.state.phase !== 'LOBBY') {
      throw new GameError('GAME_IN_PROGRESS', 'The game has already started.');
    }
    if (!this.canStart()) {
      throw new GameError('NOT_ENOUGH_PLAYERS', `Exactly ${MAX_PLAYERS} players are needed to start.`);
    }

    for (const player of this.state.players) {
      player.totalScore = 0;
    }
    this.state.roundHistory = [];
    this.state.currentRound = 1;
    return this.dealChits();
  }

  // ─── Round flow ─────────────────────────────────────────────────────────────

  /** Shuffles and privately assigns fresh roles for the current round. */
  dealChits(): RoleAssignment[] {
    this.clearGuessTimer();
    const roles = shuffle(ROLES);

    const assignments = this.state.players.map((player, i): RoleAssignment => {
      const role = roles[i];
      if (!role) {
        throw new GameError('INTERNAL_ERROR', 'Role deck does not match player count.');
      }
      player.role = role;
      return { playerId: player.id, role, points: ROLE_POINTS[role] };
    });

    this.state.rajaId = this.requirePlayerWithRole('raja').id;
    this.state.sipahiId = this.requirePlayerWithRole('sipahi').id;
    this.state.phase = 'CHIT_DEALING';
    return assignments;
  }

  setRajaRevealed(): RajaRevealedPayload {
    this.assertPhase('CHIT_DEALING');
    const raja = this.requirePlayerWithRole('raja');
    this.state.phase = 'RAJA_REVEAL';
    return { rajaPlayerId: raja.id, rajaName: raja.name };
  }

  /** The Raja asks "Mera Sipahi Kaun Hai?" */
  callSipahi(requesterId: string): void {
    this.assertPhase('RAJA_REVEAL');
    if (requesterId !== this.state.rajaId) {
      throw new GameError('NOT_YOUR_TURN', 'Only the Raja can call the Sipahi.');
    }
    this.state.phase = 'SIPAHI_REVEAL';
  }

  /** The Sipahi declares "Main Sipahi Hoon!" */
  setSipahiRevealed(requesterId: string): SipahiRevealedPayload {
    this.assertPhase('SIPAHI_REVEAL');
    if (requesterId !== this.state.sipahiId) {
      throw new GameError('NOT_YOUR_TURN', 'Only the Sipahi can reveal themselves.');
    }
    const sipahi = this.requirePlayerWithRole('sipahi');
    this.state.phase = 'SIPAHI_GUESSING';
    return { sipahiPlayerId: sipahi.id, sipahiName: sipahi.name };
  }

  /** Starts the server-side guess timer; `onExpire` fires if the Sipahi never guesses. */
  startGuessTimer(onExpire: () => void): SipahiGuessingPayload {
    this.assertPhase('SIPAHI_GUESSING');
    this.clearGuessTimer();
    this.state.guessTimer = setTimeout(() => {
      this.state.guessTimer = undefined;
      onExpire();
    }, GUESS_TIMER_SECONDS * 1000);

    const hiddenPlayers = shuffle([
      this.requirePlayerWithRole('mantri'),
      this.requirePlayerWithRole('chor'),
    ]).map(toPublicPlayer);

    return { hiddenPlayers, timerSeconds: GUESS_TIMER_SECONDS };
  }

  /**
   * Resolves the Sipahi's guess. `targetPlayerId` is null when the timer expired,
   * which counts as a wrong guess.
   */
  processGuess(requesterId: string, targetPlayerId: string | null): RoundResultPayload {
    this.assertPhase('SIPAHI_GUESSING');
    if (requesterId !== this.state.sipahiId) {
      throw new GameError('NOT_YOUR_TURN', 'Only the Sipahi can make the guess.');
    }

    const raja = this.requirePlayerWithRole('raja');
    const mantri = this.requirePlayerWithRole('mantri');
    const sipahi = this.requirePlayerWithRole('sipahi');
    const chor = this.requirePlayerWithRole('chor');

    if (targetPlayerId !== null && targetPlayerId !== mantri.id && targetPlayerId !== chor.id) {
      throw new GameError('INVALID_TARGET', 'You must pick one of the two hidden players.');
    }

    this.clearGuessTimer();
    const sipahiGuessedCorrectly = targetPlayerId === chor.id;

    const roundScores: Record<string, number> = {
      [raja.id]: 0,
      [mantri.id]: 0,
      [sipahi.id]: 0,
      [chor.id]: 0,
    };

    if (sipahiGuessedCorrectly) {
      roundScores[sipahi.id] = ROLE_POINTS.sipahi; // +800
      roundScores[chor.id] = 0;
    } else {
      roundScores[sipahi.id] = 0;
      roundScores[chor.id] = ROLE_POINTS.chor; // +800 — Chor steals Sipahi's points
    }
    roundScores[raja.id] = ROLE_POINTS.raja; // +1000 always
    roundScores[mantri.id] = ROLE_POINTS.mantri; // +500 always

    const roles: Record<string, Role> = {};
    const totalScores: Record<string, number> = {};
    for (const player of this.state.players) {
      player.totalScore += roundScores[player.id] ?? 0;
      totalScores[player.id] = player.totalScore;
      if (player.role) roles[player.id] = player.role;
    }

    const result: RoundResult = {
      round: this.state.currentRound,
      rajaId: raja.id,
      mantriId: mantri.id,
      sipahiId: sipahi.id,
      chorId: chor.id,
      guessedPlayerId: targetPlayerId,
      correct: sipahiGuessedCorrectly,
      roundScores,
    };
    this.state.roundHistory.push(result);
    this.state.phase = 'ROUND_RESULT';

    return {
      correct: sipahiGuessedCorrectly,
      roles,
      roundScores,
      totalScores,
      round: this.state.currentRound,
    };
  }

  /** Moves to the next round, or ends the game after the final round. */
  advanceRound(): AdvanceResult {
    this.assertPhase('ROUND_RESULT');

    if (this.state.currentRound >= this.state.maxRounds) {
      this.state.phase = 'GAME_OVER';
      this.state.rajaId = undefined;
      this.state.sipahiId = undefined;
      const finalScores = this.getFinalScores();
      const winner = finalScores[0];
      if (!winner) {
        throw new GameError('INTERNAL_ERROR', 'Cannot determine a winner without players.');
      }
      return {
        type: 'game_over',
        payload: { finalScores, winner, roundHistory: [...this.state.roundHistory] },
      };
    }

    this.state.currentRound += 1;
    return { type: 'next_round', assignments: this.dealChits() };
  }

  /** Scores sorted highest first; ties keep join order. */
  getFinalScores(): FinalScoreEntry[] {
    return this.state.players
      .map((p) => ({ playerId: p.id, name: p.name, totalScore: p.totalScore }))
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  /** Returns a finished game to the lobby, dropping players who have left. */
  resetForNewGame(requesterId: string): void {
    this.assertPhase('GAME_OVER');
    this.assertHost(requesterId);

    this.clearTimers();
    this.state.players = this.state.players.filter((p) => p.isConnected);
    for (const player of this.state.players) {
      player.totalScore = 0;
      delete player.role;
    }
    this.state.phase = 'LOBBY';
    this.state.currentRound = 0;
    this.state.rajaId = undefined;
    this.state.sipahiId = undefined;
    this.state.roundHistory = [];
  }

  getPublicState(): PublicGameState {
    const state: PublicGameState = {
      code: this.state.code,
      players: this.getPublicPlayers(),
      phase: this.state.phase,
      currentRound: this.state.currentRound,
      maxRounds: this.state.maxRounds,
      hostId: this.state.hostId,
    };
    if (this.state.rajaId && RAJA_PUBLIC_PHASES.includes(this.state.phase)) {
      state.rajaId = this.state.rajaId;
    }
    if (this.state.sipahiId && SIPAHI_PUBLIC_PHASES.includes(this.state.phase)) {
      state.sipahiId = this.state.sipahiId;
    }
    return state;
  }

  // ─── Timers ─────────────────────────────────────────────────────────────────

  /** Schedules the next automatic transition, replacing any pending one. */
  scheduleTransition(delayMs: number, callback: () => void): void {
    this.clearTransitionTimer();
    this.transitionTimer = setTimeout(() => {
      this.transitionTimer = undefined;
      callback();
    }, delayMs);
  }

  clearTimers(): void {
    this.clearGuessTimer();
    this.clearTransitionTimer();
  }

  private clearGuessTimer(): void {
    if (this.state.guessTimer) {
      clearTimeout(this.state.guessTimer);
      this.state.guessTimer = undefined;
    }
  }

  private clearTransitionTimer(): void {
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = undefined;
    }
  }

  // ─── Internal helpers ───────────────────────────────────────────────────────

  private findPlayer(playerId: string): Player | undefined {
    return this.state.players.find((p) => p.id === playerId);
  }

  private requirePlayer(playerId: string): Player {
    const player = this.findPlayer(playerId);
    if (!player) {
      throw new GameError('NOT_IN_ROOM', 'You are not in this room.');
    }
    return player;
  }

  private requirePlayerWithRole(role: Role): Player {
    const player = this.state.players.find((p) => p.role === role);
    if (!player) {
      throw new GameError('INTERNAL_ERROR', `No player holds the ${role} role.`);
    }
    return player;
  }

  private assertPhase(expected: GamePhase): void {
    if (this.state.phase !== expected) {
      throw new GameError(
        'INVALID_PHASE',
        `That action is not allowed right now (phase is ${this.state.phase}).`,
      );
    }
  }

  private assertHost(requesterId: string): void {
    if (requesterId !== this.state.hostId) {
      throw new GameError('NOT_HOST', 'Only the host can do that.');
    }
  }

  private assertNameAvailable(name: string, ownId: string): void {
    const lower = name.toLowerCase();
    const taken = this.state.players.some((p) => p.id !== ownId && p.name.toLowerCase() === lower);
    if (taken) {
      throw new GameError('NAME_TAKEN', `The name "${name}" is already taken in this room.`);
    }
  }

  private reassignHost(): void {
    const nextHost = this.state.players.find((p) => p.isConnected && p.id !== this.state.hostId);
    if (!nextHost) return;

    for (const player of this.state.players) {
      player.isHost = player.id === nextHost.id;
    }
    this.state.hostId = nextHost.id;
  }
}
