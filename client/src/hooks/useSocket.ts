import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useGameStore, type PendingAction } from '../store/gameStore';
import type {
  ClientToServerEvents,
  PublicPlayer,
  RoomRejoinedPayload,
  ServerToClientEvents,
} from '../types/game.types';
import { toRoundResult } from '../utils/helpers';
import {
  clearSession,
  clearTabSession,
  loadSession,
  saveSession,
  type SavedSession,
} from '../utils/session';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** How long a button spinner waits for a server reply before giving up. */
const PENDING_TIMEOUT_MS = 10_000;

/** One shared connection for the whole app. */
export const socket: GameSocket = io(import.meta.env.VITE_SERVER_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});

/** The socket id the server last attached to our seat. A different id means we must rejoin. */
let attachedSocketId: string | null = null;
/** Set while a rejoin_room request is waiting for a reply. */
let rejoinInFlight = false;

const scoresFromPlayers = (players: PublicPlayer[]): Record<string, number> =>
  Object.fromEntries(players.map((p) => [p.id, p.totalScore]));

function requestRejoin(session: SavedSession): void {
  rejoinInFlight = true;
  useGameStore.getState().setRejoining(true);
  toast.loading('Reconnecting…', { id: 'connection' });
  socket.emit('rejoin_room', session);
}

/** Rejoin a seat saved by an earlier visit (used by the home page). */
export function rejoinSavedSession(session: SavedSession): void {
  if (!socket.connected) {
    toast.error('Not connected to the game server yet.', { id: 'connection' });
    return;
  }
  requestRejoin(session);
}

/** Replaces the store with the server's snapshot for this player. */
function applyRejoinSnapshot(payload: RoomRejoinedPayload): void {
  const s = useGameStore.getState();
  const { gameState } = payload;

  s.reset();
  s.setRoomCode(payload.roomCode);
  s.setPlayerId(payload.playerId);
  s.setReconnectToken(payload.reconnectToken);
  s.setMyPlayerName(gameState.players.find((p) => p.id === payload.playerId)?.name ?? '');
  s.setPlayers(gameState.players);
  s.setScores(scoresFromPlayers(gameState.players));
  s.setPhase(gameState.phase);
  s.setCurrentRound(gameState.currentRound);
  s.setMaxRounds(gameState.maxRounds);
  s.setMyRole(payload.myRole);
  s.setRajaId(gameState.rajaId ?? null);
  s.setSipahiId(gameState.sipahiId ?? null);
  s.setRoundHistory(payload.roundHistory);

  if (payload.guessing) {
    s.setGuessing(payload.guessing.hiddenPlayers, payload.guessing.timerSeconds, payload.guessing.secondsLeft);
  }
  if (payload.lastRoundResult) {
    s.setLastRoundResult(payload.lastRoundResult);
    s.setScores(payload.lastRoundResult.totalScores);
  }
  if (payload.gameOver) {
    s.setWinner(payload.gameOver.winner);
    s.setScores(Object.fromEntries(payload.gameOver.finalScores.map((e) => [e.playerId, e.totalScore])));
  }
}

/**
 * Registers every server → client listener and keeps the store in sync.
 * Mount exactly once, inside the router.
 */
export function useSocketEvents(): void {
  const navigate = useNavigate();

  useEffect(() => {
    const store = useGameStore.getState;

    const goToRoomPage = (phase: string) => {
      const target = phase === 'LOBBY' ? '/lobby' : '/game';
      if (window.location.pathname !== target) navigate(target, { replace: true });
    };

    const onConnect = (): void => {
      const s = store();
      s.setConnected(true);

      if (s.roomCode && s.playerId && s.reconnectToken) {
        // Reconnected after a drop: the server knows our seat by the old socket, so rejoin.
        if (attachedSocketId !== socket.id && !rejoinInFlight) {
          requestRejoin({ roomCode: s.roomCode, playerId: s.playerId, reconnectToken: s.reconnectToken });
        }
        return;
      }

      if (s.isRejoining && !rejoinInFlight) {
        // Page was refreshed on /lobby or /game.
        const saved = loadSession();
        if (saved) requestRejoin(saved);
        else s.setRejoining(false);
      }
    };

    const onDisconnect = (): void => {
      store().setConnected(false);
      store().setPendingAction(null);
      rejoinInFlight = false;
      if (store().roomCode) {
        toast.loading('Connection lost. Reconnecting…', { id: 'connection' });
      }
    };

    const onConnectError = (): void => {
      store().setConnected(false);
      store().setPendingAction(null);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    if (socket.connected) onConnect();

    socket.on('room_created', ({ roomCode, playerId, player, reconnectToken }) => {
      const s = store();
      s.reset();
      s.setRoomCode(roomCode);
      s.setPlayerId(playerId);
      s.setReconnectToken(reconnectToken);
      s.setMyPlayerName(player.name);
      s.setPlayers([player]);
      s.setScores(scoresFromPlayers([player]));
      attachedSocketId = socket.id ?? null;
      saveSession({ roomCode, playerId, reconnectToken });
      toast.success(`Room ${roomCode} created`);
      navigate('/lobby');
    });

    socket.on('room_joined', ({ roomCode, playerId, players, reconnectToken }) => {
      const s = store();
      const me = players.find((p) => p.id === playerId);
      s.reset();
      s.setRoomCode(roomCode);
      s.setPlayerId(playerId);
      s.setReconnectToken(reconnectToken);
      s.setMyPlayerName(me?.name ?? '');
      s.setPlayers(players);
      s.setScores(scoresFromPlayers(players));
      attachedSocketId = socket.id ?? null;
      saveSession({ roomCode, playerId, reconnectToken });
      toast.success(`Joined room ${roomCode}`);
      navigate('/lobby');
    });

    socket.on('room_rejoined', (payload) => {
      rejoinInFlight = false;
      attachedSocketId = socket.id ?? null;
      applyRejoinSnapshot(payload);
      saveSession({ roomCode: payload.roomCode, playerId: payload.playerId, reconnectToken: payload.reconnectToken });
      store().setRejoining(false);
      toast.success('Reconnected', { id: 'connection' });
      goToRoomPage(payload.gameState.phase);
    });

    socket.on('session_replaced', ({ message }) => {
      attachedSocketId = null;
      clearTabSession();
      store().reset();
      toast.error(message, { id: 'connection' });
      navigate('/', { replace: true });
    });

    socket.on('room_update', ({ players }) => {
      const s = store();
      const previous = new Map(s.players.map((p) => [p.id, p]));
      for (const player of players) {
        if (player.id === s.playerId) continue;
        const before = previous.get(player.id);
        if (!before) toast(`${player.name} joined`, { icon: '👋' });
        else if (!before.isConnected && player.isConnected) toast(`${player.name} reconnected`, { icon: '🔌' });
      }
      const me = players.find((p) => p.id === s.playerId);
      if (me) s.setMyPlayerName(me.name);
      s.setPlayers(players);
      s.setScores(scoresFromPlayers(players));
    });

    socket.on('game_started', ({ gameState, roundNumber }) => {
      const s = store();
      if (roundNumber === 1) {
        s.setRoundHistory([]);
        s.setWinner(null);
      }
      s.resetRound();
      s.setPendingAction(null);
      s.setPhase(gameState.phase);
      s.setCurrentRound(roundNumber);
      s.setMaxRounds(gameState.maxRounds);
      s.setPlayers(gameState.players);
      s.setScores(scoresFromPlayers(gameState.players));
      navigate('/game');
    });

    socket.on('phase_changed', ({ gameState }) => {
      const s = store();
      s.setPhase(gameState.phase);
      s.setCurrentRound(gameState.currentRound);
      s.setMaxRounds(gameState.maxRounds);
      s.setPlayers(gameState.players);
      s.setScores(scoresFromPlayers(gameState.players));
      if (gameState.rajaId) s.setRajaId(gameState.rajaId);
      if (gameState.sipahiId) s.setSipahiId(gameState.sipahiId);

      if (gameState.phase === 'LOBBY') {
        s.resetRound();
        s.setRoundHistory([]);
        s.setWinner(null);
        navigate('/lobby');
      }
    });

    socket.on('role_assigned', ({ role }) => {
      store().setMyRole(role);
    });

    socket.on('raja_revealed', ({ rajaPlayerId }) => {
      store().setRajaId(rajaPlayerId);
    });

    socket.on('sipahi_revealed', ({ sipahiPlayerId }) => {
      store().setSipahiId(sipahiPlayerId);
    });

    socket.on('sipahi_guessing', ({ hiddenPlayers, timerSeconds }) => {
      store().setGuessing(hiddenPlayers, timerSeconds);
    });

    socket.on('round_result', (payload) => {
      const s = store();
      s.setLastRoundResult(payload);
      s.setScores(payload.totalScores);
      s.setPlayers(
        s.players.map((p) => ({ ...p, totalScore: payload.totalScores[p.id] ?? p.totalScore })),
      );
      const result = toRoundResult(payload);
      if (result) s.addRoundResult(result);
    });

    socket.on('game_over', ({ finalScores, winner, roundHistory }) => {
      const s = store();
      s.setWinner(winner);
      s.setRoundHistory(roundHistory);
      s.setScores(Object.fromEntries(finalScores.map((e) => [e.playerId, e.totalScore])));
    });

    socket.on('player_disconnected', ({ playerName, remainingCount }) => {
      toast(`${playerName} left · ${remainingCount} still here`, { icon: '🚪' });
    });

    socket.on('error', ({ message, code }) => {
      const s = store();
      s.setPendingAction(null);

      if (rejoinInFlight) {
        rejoinInFlight = false;
        attachedSocketId = null;
        clearSession();
        s.reset();
        s.setRejoining(false);
        toast.error(code === 'ROOM_NOT_FOUND' ? 'Your room expired' : 'Your seat was released — please join again', {
          id: 'connection',
        });
        navigate('/', { replace: true });
        return;
      }
      toast.error(message);
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('room_rejoined');
      socket.off('session_replaced');
      socket.off('room_update');
      socket.off('game_started');
      socket.off('phase_changed');
      socket.off('role_assigned');
      socket.off('raja_revealed');
      socket.off('sipahi_revealed');
      socket.off('sipahi_guessing');
      socket.off('round_result');
      socket.off('game_over');
      socket.off('player_disconnected');
      socket.off('error');
    };
  }, [navigate]);
}

export interface UseSocketResult {
  socket: GameSocket;
  isConnected: boolean;
  createRoom: (playerName: string) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  updateName: (name: string) => void;
  startGame: () => void;
  rajaCallsSipahi: () => void;
  sipahiReveal: () => void;
  sipahiGuess: (targetPlayerId: string) => void;
  playAgain: () => void;
  /** Gives up this seat and forgets the saved session. */
  leaveRoom: () => void;
}

/** Leaves the room on the server (if connected) and clears local state. */
export function leaveCurrentRoom(): void {
  if (socket.connected && useGameStore.getState().roomCode) {
    socket.emit('leave_room', {});
  }
  attachedSocketId = null;
  rejoinInFlight = false;
  clearSession();
  useGameStore.getState().reset();
  useGameStore.getState().setRejoining(false);
}

/** Connection status plus typed emitters for every client → server event. */
export function useSocket(): UseSocketResult {
  const isConnected = useGameStore((s) => s.isConnected);

  const ensureConnected = useCallback((): boolean => {
    if (socket.connected) return true;
    toast.error('Not connected to the game server. Retrying…', { id: 'connection' });
    socket.connect();
    return false;
  }, []);

  const withPending = useCallback((action: Exclude<PendingAction, null>, emit: () => void) => {
    const { setPendingAction } = useGameStore.getState();
    setPendingAction(action);
    emit();
    window.setTimeout(() => {
      if (useGameStore.getState().pendingAction === action) {
        setPendingAction(null);
        toast.error('The server did not respond. Please try again.');
      }
    }, PENDING_TIMEOUT_MS);
  }, []);

  return useMemo<UseSocketResult>(
    () => ({
      socket,
      isConnected,
      createRoom: (playerName) => {
        if (!ensureConnected()) return;
        withPending('create', () => socket.emit('create_room', { playerName: playerName.trim() }));
      },
      joinRoom: (roomCode, playerName) => {
        if (!ensureConnected()) return;
        withPending('join', () =>
          socket.emit('join_room', { roomCode: roomCode.trim().toUpperCase(), playerName: playerName.trim() }),
        );
      },
      updateName: (name) => {
        if (!ensureConnected()) return;
        socket.emit('update_name', { name: name.trim() });
      },
      startGame: () => {
        if (!ensureConnected()) return;
        withPending('start', () => socket.emit('start_game', {}));
      },
      rajaCallsSipahi: () => {
        if (ensureConnected()) socket.emit('raja_calls_sipahi', {});
      },
      sipahiReveal: () => {
        if (ensureConnected()) socket.emit('sipahi_reveal', {});
      },
      sipahiGuess: (targetPlayerId) => {
        if (ensureConnected()) socket.emit('sipahi_guess', { targetPlayerId });
      },
      playAgain: () => {
        if (ensureConnected()) socket.emit('play_again', {});
      },
      leaveRoom: leaveCurrentRoom,
    }),
    [isConnected, ensureConnected, withPending],
  );
}
