import type { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import {
  AUTO_ACTION_DELAY_MS,
  DEAL_REVEAL_DELAY_MS,
  EMPTY_ROOM_TTL_MS,
  LOBBY_REJOIN_GRACE_MS,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  ROOM_CODE_PATTERN,
  ROUND_RESULT_DELAY_MS,
  SIPAHI_REVEAL_DELAY_MS,
} from '../game/constants';
import { GameError } from '../game/errors';
import type { GameManager } from '../game/GameManager';
import type { Room, RoleAssignment } from '../game/Room';
import type {
  ClientToServerEvents,
  InterServerEvents,
  PublicPlayer,
  ServerToClientEvents,
  SocketData,
  TimeSyncResponse,
} from '../game/types';

export type GameServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

interface Seat {
  room: Room;
  playerId: string;
}

// ─── Input validation ─────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(payload: unknown, key: string): string {
  const value = isRecord(payload) ? payload[key] : undefined;
  if (typeof value !== 'string') {
    throw new GameError('INVALID_INPUT', `Missing or invalid "${key}".`);
  }
  return value;
}

/** ASCII control characters (U+0000–U+001F and DEL). */
const CONTROL_CHARS = /[\x00-\x1F\x7F]/;

function parsePlayerName(payload: unknown, key: string): string {
  const name = readString(payload, key).trim();
  if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH || CONTROL_CHARS.test(name)) {
    throw new GameError('INVALID_INPUT', `Name must be ${NAME_MIN_LENGTH}–${NAME_MAX_LENGTH} characters.`);
  }
  return name;
}

function parseRoomCode(payload: unknown): string {
  const code = readString(payload, 'roomCode').trim().toUpperCase();
  if (!ROOM_CODE_PATTERN.test(code)) {
    throw new GameError('INVALID_INPUT', 'Room code must be 6 letters or numbers.');
  }
  return code;
}

function parseBoundedString(payload: unknown, key: string, maxLength: number): string {
  const value = readString(payload, key);
  if (value.length === 0 || value.length > maxLength) {
    throw new GameError('INVALID_INPUT', `Missing or invalid "${key}".`);
  }
  return value;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export function registerHandlers(io: GameServer, manager: GameManager): void {
  /** Runs a room action from a timer, ignoring rooms that have since been deleted. */
  const runForRoom = (room: Room, label: string, action: () => void): void => {
    if (manager.getRoom(room.code) !== room) return;
    try {
      action();
    } catch (err) {
      console.error(`❌ [${room.code}] ${label} failed:`, err);
    }
  };

  const emitRoomUpdate = (room: Room): void => {
    io.to(room.code).emit('room_update', {
      players: room.getPublicPlayers(),
      playerCount: room.playerCount,
      hostId: room.hostId,
    });
  };

  const emitPhaseChanged = (room: Room): void => {
    io.to(room.code).emit('phase_changed', { gameState: room.getPublicState() });
  };

  const deleteRoom = (room: Room, reason: string): void => {
    if (manager.deleteRoom(room.code)) {
      console.log(`❌ [${room.code}] Room deleted — ${reason}`);
    }
  };

  /** Broadcasts the new round, then sends each player their role on their own socket. */
  const startRound = (room: Room, assignments: RoleAssignment[]): void => {
    io.to(room.code).emit('game_started', {
      gameState: room.getPublicState(),
      roundNumber: room.currentRound,
    });

    for (const { playerId, role, points } of assignments) {
      const socketId = room.getSocketId(playerId);
      if (socketId) io.sockets.sockets.get(socketId)?.emit('role_assigned', { role, points });
    }
    console.log(`📤 [${room.code}] Round ${room.currentRound} chits dealt`);

    room.scheduleTransition(DEAL_REVEAL_DELAY_MS, () =>
      runForRoom(room, 'raja reveal', () => revealRaja(room)),
    );
  };

  const revealRaja = (room: Room): void => {
    const payload = room.setRajaRevealed();
    io.to(room.code).emit('raja_revealed', payload);
    emitPhaseChanged(room);
    console.log(`👑 [${room.code}] Raja is ${payload.rajaName}`);
    runAutoActions(room);
  };

  const callSipahi = (room: Room, requesterId: string): void => {
    room.callSipahi(requesterId);
    emitPhaseChanged(room);
    runAutoActions(room);
  };

  const revealSipahi = (room: Room, requesterId: string): void => {
    const revealed = room.setSipahiRevealed(requesterId);
    io.to(room.code).emit('sipahi_revealed', revealed);
    emitPhaseChanged(room);
    console.log(`📤 [${room.code}] Sipahi is ${revealed.sipahiName}`);

    // Give everyone a moment to see the reveal before the guess timer starts.
    room.scheduleTransition(SIPAHI_REVEAL_DELAY_MS, () =>
      runForRoom(room, 'begin guessing', () => beginGuessing(room, revealed.sipahiPlayerId)),
    );
  };

  const beginGuessing = (room: Room, sipahiId: string): void => {
    room.beginGuessing();
    const guessing = room.startGuessTimer(() =>
      runForRoom(room, 'guess timeout', () => {
        console.log(`❌ [${room.code}] Sipahi ran out of time`);
        resolveGuess(room, sipahiId, null);
      }),
    );
    // Send the hidden players before the phase flips so clients never render an empty panel.
    io.to(room.code).emit('sipahi_guessing', guessing);
    emitPhaseChanged(room);
  };

  const resolveGuess = (room: Room, requesterId: string, targetPlayerId: string | null): void => {
    const result = room.processGuess(requesterId, targetPlayerId);
    io.to(room.code).emit('round_result', result);
    emitPhaseChanged(room);
    console.log(
      `${result.correct ? '✅' : '❌'} [${room.code}] Round ${result.round}: Sipahi guessed ${result.correct ? 'correctly' : 'wrong'}`,
    );

    room.scheduleTransition(ROUND_RESULT_DELAY_MS, () =>
      runForRoom(room, 'advance round', () => advanceRound(room)),
    );
  };

  const advanceRound = (room: Room): void => {
    const next = room.advanceRound();
    if (next.type === 'next_round') {
      startRound(room, next.assignments);
      return;
    }
    io.to(room.code).emit('game_over', next.payload);
    emitPhaseChanged(room);
    console.log(`👑 [${room.code}] Game over — winner: ${next.payload.winner.name}`);
  };

  /**
   * Keeps the game moving when the Raja or Sipahi has dropped out. The delay gives them
   * time to reconnect (e.g. after a page refresh). A disconnected Sipahi who never
   * guesses simply runs out the server-side guess timer.
   */
  const runAutoActions = (room: Room): void => {
    const { phase, rajaId, sipahiId } = room;

    if (phase === 'RAJA_REVEAL' && rajaId && !room.isPlayerConnected(rajaId)) {
      room.scheduleTransition(AUTO_ACTION_DELAY_MS, () =>
        runForRoom(room, 'auto raja call', () => {
          if (room.phase === 'RAJA_REVEAL' && !room.isPlayerConnected(rajaId)) callSipahi(room, rajaId);
        }),
      );
    } else if (
      phase === 'SIPAHI_REVEAL' &&
      sipahiId &&
      !room.isSipahiRevealed && // once revealed, the begin-guessing transition is already pending
      !room.isPlayerConnected(sipahiId)
    ) {
      room.scheduleTransition(AUTO_ACTION_DELAY_MS, () =>
        runForRoom(room, 'auto sipahi reveal', () => {
          if (room.phase === 'SIPAHI_REVEAL' && !room.isPlayerConnected(sipahiId)) revealSipahi(room, sipahiId);
        }),
      );
    }
  };

  /** Shared follow-up after a player disconnects or leaves. */
  const afterDeparture = (room: Room, player: PublicPlayer | undefined): void => {
    if (room.playerCount === 0) {
      deleteRoom(room, 'no players left');
      return;
    }

    if (room.isEmpty) {
      room.scheduleEmptyRoomDeletion(EMPTY_ROOM_TTL_MS, () =>
        runForRoom(room, 'expire empty room', () => {
          if (room.isEmpty) deleteRoom(room, 'nobody rejoined in time');
        }),
      );
      console.log(`❌ [${room.code}] Everyone disconnected — keeping room for ${EMPTY_ROOM_TTL_MS / 1000}s`);
    }

    if (player) {
      io.to(room.code).emit('player_disconnected', {
        playerName: player.name,
        remainingCount: room.connectedCount,
      });
    }
    emitRoomUpdate(room);
    runAutoActions(room);
  };

  io.on('connection', (socket: GameSocket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    /** Runs a client-triggered action, reporting expected failures back to the sender. */
    const handle = (event: string, action: () => void): void => {
      try {
        action();
      } catch (err) {
        if (err instanceof GameError) {
          socket.emit('error', { message: err.message, code: err.code });
          return;
        }
        console.error(`❌ Unexpected error handling ${event} from ${socket.id}:`, err);
        socket.emit('error', { message: 'Something went wrong. Please try again.', code: 'INTERNAL_ERROR' });
      }
    };

    /** The seat this socket currently speaks for, if it has not been replaced. */
    const getSeat = (): Seat | null => {
      const { roomCode, playerId } = socket.data;
      if (!roomCode || !playerId) return null;
      const room = manager.getRoom(roomCode);
      if (!room || !room.hasPlayer(playerId) || !room.isCurrentSocket(playerId, socket.id)) return null;
      return { room, playerId };
    };

    const requireSeat = (): Seat => {
      const seat = getSeat();
      if (!seat) throw new GameError('NOT_IN_ROOM', 'You are not in a room.');
      return seat;
    };

    const assertNotInRoom = (): void => {
      if (getSeat()) throw new GameError('ALREADY_IN_ROOM', 'You are already in a room.');
    };

    const bindSocket = (room: Room, playerId: string): void => {
      socket.data.roomCode = room.code;
      socket.data.playerId = playerId;
      void socket.join(room.code);
    };

    // Lets clients estimate the server clock so every screen counts down to the same instant.
    socket.on('time_sync', (_payload: unknown, ack?: (response: TimeSyncResponse) => void) => {
      if (typeof ack === 'function') ack({ serverNow: Date.now() });
    });

    socket.on('create_room', (payload: unknown) =>
      handle('create_room', () => {
        const playerName = parsePlayerName(payload, 'playerName');
        assertNotInRoom();

        const playerId = uuidv4();
        const room = manager.createRoom({ id: playerId, name: playerName, socketId: socket.id });
        bindSocket(room, playerId);

        const player = room.getPublicPlayer(playerId);
        if (!player) throw new GameError('INTERNAL_ERROR', 'Failed to create room.');

        socket.emit('room_created', {
          roomCode: room.code,
          playerId,
          player,
          reconnectToken: room.getReconnectToken(playerId),
        });
        emitRoomUpdate(room);
        console.log(`🎮 [${room.code}] Room created by ${playerName}`);
      }),
    );

    socket.on('join_room', (payload: unknown) =>
      handle('join_room', () => {
        const roomCode = parseRoomCode(payload);
        const playerName = parsePlayerName(payload, 'playerName');
        assertNotInRoom();

        const room = manager.getRoom(roomCode);
        if (!room) {
          throw new GameError('ROOM_NOT_FOUND', `No room found with code ${roomCode}.`);
        }

        const playerId = uuidv4();
        room.addPlayer({ id: playerId, name: playerName, socketId: socket.id });
        bindSocket(room, playerId);

        socket.emit('room_joined', {
          roomCode: room.code,
          playerId,
          players: room.getPublicPlayers(),
          reconnectToken: room.getReconnectToken(playerId),
        });
        emitRoomUpdate(room);
        console.log(`✅ [${room.code}] ${playerName} joined (${room.playerCount}/4)`);
      }),
    );

    socket.on('rejoin_room', (payload: unknown) =>
      handle('rejoin_room', () => {
        const roomCode = parseRoomCode(payload);
        const playerId = parseBoundedString(payload, 'playerId', 64);
        const reconnectToken = parseBoundedString(payload, 'reconnectToken', 128);

        const current = getSeat();
        if (current && (current.room.code !== roomCode || current.playerId !== playerId)) {
          throw new GameError('ALREADY_IN_ROOM', 'You are already in a different room.');
        }

        const room = manager.getRoom(roomCode);
        if (!room) {
          throw new GameError('ROOM_NOT_FOUND', 'This room has expired.');
        }

        const { replacedSocketId } = room.reconnect(playerId, reconnectToken, socket.id);
        bindSocket(room, playerId);

        // The same player was still open elsewhere (another tab or device): hand over the seat.
        if (replacedSocketId) {
          const previous = io.sockets.sockets.get(replacedSocketId);
          if (previous) {
            previous.emit('session_replaced', { message: 'You rejoined this game from another tab or device.' });
            previous.data.roomCode = undefined;
            previous.data.playerId = undefined;
            void previous.leave(room.code);
          }
        }

        socket.emit('room_rejoined', room.getRejoinSnapshot(playerId));
        emitRoomUpdate(room);
        console.log(`✅ [${room.code}] ${room.getPublicPlayer(playerId)?.name ?? playerId} rejoined (${room.phase})`);
      }),
    );

    socket.on('leave_room', () =>
      handle('leave_room', () => {
        const { room, playerId } = requireSeat();
        socket.data.roomCode = undefined;
        socket.data.playerId = undefined;
        void socket.leave(room.code);

        // Mid-round the seat has to stay (roles are dealt), so treat it as a disconnect.
        const canRemove = room.phase === 'LOBBY' || room.phase === 'GAME_OVER';
        const player = canRemove ? room.removePlayer(playerId) : room.markDisconnected(playerId);
        console.log(`❌ [${room.code}] ${player?.name ?? playerId} left the room`);
        afterDeparture(room, player);
      }),
    );

    socket.on('update_name', (payload: unknown) =>
      handle('update_name', () => {
        const name = parsePlayerName(payload, 'name');
        const { room, playerId } = requireSeat();
        room.updateName(playerId, name);
        emitRoomUpdate(room);
      }),
    );

    socket.on('start_game', () =>
      handle('start_game', () => {
        const { room, playerId } = requireSeat();
        const assignments = room.startGame(playerId);
        console.log(`👑 [${room.code}] Game started`);
        startRound(room, assignments);
      }),
    );

    socket.on('raja_calls_sipahi', () =>
      handle('raja_calls_sipahi', () => {
        const { room, playerId } = requireSeat();
        callSipahi(room, playerId);
      }),
    );

    socket.on('sipahi_reveal', () =>
      handle('sipahi_reveal', () => {
        const { room, playerId } = requireSeat();
        revealSipahi(room, playerId);
      }),
    );

    socket.on('sipahi_guess', (payload: unknown) =>
      handle('sipahi_guess', () => {
        const targetPlayerId = parseBoundedString(payload, 'targetPlayerId', 64);
        const { room, playerId } = requireSeat();
        resolveGuess(room, playerId, targetPlayerId);
      }),
    );

    socket.on('play_again', () =>
      handle('play_again', () => {
        const { room, playerId } = requireSeat();
        room.resetForNewGame(playerId);
        emitRoomUpdate(room);
        emitPhaseChanged(room);
        console.log(`🎮 [${room.code}] Back to lobby for a new game`);
      }),
    );

    socket.on('disconnect', (reason) => {
      console.log(`❌ Socket disconnected: ${socket.id} (${reason})`);

      try {
        // Ignore sockets that already left, or whose seat moved to a newer connection.
        const seat = getSeat();
        if (!seat) return;
        const { room, playerId } = seat;

        const player = room.markDisconnected(playerId);

        if (room.phase === 'LOBBY') {
          room.schedulePlayerRemoval(playerId, LOBBY_REJOIN_GRACE_MS, () =>
            runForRoom(room, 'release lobby seat', () => {
              if (room.phase !== 'LOBBY' || room.isPlayerConnected(playerId)) return;
              room.removePlayer(playerId);
              if (room.playerCount === 0) {
                deleteRoom(room, 'no players left');
                return;
              }
              emitRoomUpdate(room);
            }),
          );
        }

        afterDeparture(room, player);
      } catch (err) {
        console.error(`❌ Error cleaning up after ${socket.id}:`, err);
      }
    });
  });
}
