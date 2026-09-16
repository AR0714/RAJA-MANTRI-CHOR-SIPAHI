import { v4 as uuidv4 } from 'uuid';
import { GameError } from './errors';
import { Room, type PlayerIdentity } from './Room';

const ROOM_CODE_LENGTH = 6;
const MAX_CODE_ATTEMPTS = 20;

/** Registry of all active rooms. */
export class GameManager {
  private readonly rooms = new Map<string, Room>();

  get roomCount(): number {
    return this.rooms.size;
  }

  createRoom(hostPlayer: PlayerIdentity): Room {
    const code = this.generateRoomCode();
    const room = new Room(code, hostPlayer);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  deleteRoom(code: string): boolean {
    const room = this.rooms.get(code);
    if (!room) return false;

    room.clearTimers();
    return this.rooms.delete(code);
  }

  getRoomByPlayerId(playerId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.hasPlayer(playerId)) return room;
    }
    return undefined;
  }

  /** Deletes every room with no connected players. Returns the deleted codes. */
  cleanupEmpty(): string[] {
    const deleted: string[] = [];
    for (const [code, room] of this.rooms) {
      if (room.isEmpty) {
        this.deleteRoom(code);
        deleted.push(code);
      }
    }
    return deleted;
  }

  /** 6-char uppercase alphanumeric code taken from a v4 UUID. */
  private generateRoomCode(): string {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const code = uuidv4().replace(/-/g, '').slice(0, ROOM_CODE_LENGTH).toUpperCase();
      if (!this.rooms.has(code)) return code;
    }
    throw new GameError('INTERNAL_ERROR', 'Could not allocate a room code. Please try again.');
  }
}
