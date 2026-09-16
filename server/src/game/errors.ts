import type { ErrorCode } from './types';

/** An expected, user-facing failure. Handlers turn it into an `error` event. */
export class GameError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'GameError';
    this.code = code;
  }
}
