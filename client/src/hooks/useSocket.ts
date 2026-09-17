import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useGameStore, type PendingAction } from '../store/gameStore';
import type {
  ClientToServerEvents,
  PublicPlayer,
  ServerToClientEvents,
} from '../types/game.types';
import { toRoundResult } from '../utils/helpers';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** How long a button spinner waits for a server reply before giving up. */
const PENDING_TIMEOUT_MS = 10_000;

/** One shared connection for the whole app. */
export const socket: GameSocket = io(import.meta.env.VITE_SERVER_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});

const scoresFromPlayers = (players: PublicPlayer[]): Record<string, number> =>
  Object.fromEntries(players.map((p) => [p.id, p.totalScore]));

/**
 * Registers every server → client listener and keeps the store in sync.
 * Mount exactly once, inside the router.
 */
export function useSocketEvents(): void {
  const navigate = useNavigate();

  useEffect(() => {
    const store = useGameStore.getState;

    const onConnect = (): void => {
      const { roomCode, playerId } = store();
      store().setConnected(true);

      // A new socket id means the server no longer knows us as a room member.
      if (roomCode && playerId && playerId !== socket.id) {
        store().reset();
        toast.error('Connection was lost, so you left the room.', { id: 'connection' });
        navigate('/');
      } else if (roomCode) {
        toast.success('Reconnected', { id: 'connection' });
      }
    };

    const onDisconnect = (): void => {
      store().setConnected(false);
      store().setPendingAction(null);
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
    if (socket.connected) store().setConnected(true);

    socket.on('room_created', ({ roomCode, playerId, player }) => {
      const s = store();
      s.reset();
      s.setRoomCode(roomCode);
      s.setPlayerId(playerId);
      s.setMyPlayerName(player.name);
      s.setPlayers([player]);
      s.setScores(scoresFromPlayers([player]));
      toast.success(`Room ${roomCode} created`);
      navigate('/lobby');
    });

    socket.on('room_joined', ({ roomCode, playerId, players }) => {
      const s = store();
      const me = players.find((p) => p.id === playerId);
      s.reset();
      s.setRoomCode(roomCode);
      s.setPlayerId(playerId);
      s.setMyPlayerName(me?.name ?? '');
      s.setPlayers(players);
      s.setScores(scoresFromPlayers(players));
      toast.success(`Joined room ${roomCode}`);
      navigate('/lobby');
    });

    socket.on('room_update', ({ players }) => {
      const s = store();
      const knownIds = new Set(s.players.map((p) => p.id));
      for (const player of players) {
        if (!knownIds.has(player.id) && player.id !== s.playerId) {
          toast(`${player.name} joined`, { icon: '👋' });
        }
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

    socket.on('error', ({ message }) => {
      store().setPendingAction(null);
      toast.error(message);
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('room_created');
      socket.off('room_joined');
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
  /** Leaves the current room by reconnecting with a fresh socket. */
  leaveRoom: () => void;
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
      leaveRoom: () => {
        // There is no leave event: the server drops a player whose socket disconnects.
        useGameStore.getState().reset();
        socket.disconnect();
        socket.connect();
      },
    }),
    [isConnected, ensureConnected, withPending],
  );
}
