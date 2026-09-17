import { useAudio } from '../../hooks/useAudio';
import { useGameStore } from '../../store/gameStore';
import { ROLE_META } from '../../utils/roles';

/** Top bar shown on every game screen: round, private role, mute, room code. */
export function GameHeader() {
  const roomCode = useGameStore((s) => s.roomCode);
  const phase = useGameStore((s) => s.phase);
  const currentRound = useGameStore((s) => s.currentRound);
  const maxRounds = useGameStore((s) => s.maxRounds);
  const myRole = useGameStore((s) => s.myRole);
  const isConnected = useGameStore((s) => s.isConnected);
  const { isMuted, toggleMute } = useAudio();

  // Hide the role chip while dealing so it doesn't spoil the card flip.
  const roleMeta = myRole && phase !== 'CHIT_DEALING' && phase !== 'GAME_OVER' ? ROLE_META[myRole] : null;

  return (
    <header className="sticky top-0 z-30 border-b border-royal-border/60 bg-royal-dark/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-nowrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="text-xl" aria-hidden>
            👑
          </span>
          <span className="hidden font-cinzel text-sm font-bold text-royal-gold-l sm:inline">Raja Mantri Chor Sipahi</span>
          {phase !== 'GAME_OVER' && currentRound > 0 && (
            <span className="whitespace-nowrap font-mono text-xs text-ink-muted">
              R{currentRound}/{maxRounds}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {roleMeta && (
            <span
              title="Only you can see this"
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 font-poppins text-xs font-semibold ${roleMeta.borderClass} ${roleMeta.textClass} ${roleMeta.bgClass}`}
            >
              <span aria-hidden>{roleMeta.emoji}</span>
              <span className="sr-only">Your role: </span>
              <span className="hidden min-[420px]:inline">{roleMeta.label}</span>
              <span className="sr-only min-[420px]:hidden">{roleMeta.label}</span>
            </span>
          )}
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
            aria-pressed={isMuted}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-royal-border bg-royal-surface text-base transition-colors hover:border-royal-gold/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-gold-l"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          {roomCode && (
            <span
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-royal-gold/40 bg-royal-gold/10 px-3 py-1 font-mono text-xs font-medium tracking-widest text-royal-gold-l"
              aria-label={`Room code ${roomCode}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-role-sipahi' : 'animate-pulse bg-role-chor'}`}
                aria-hidden
              />
              {roomCode}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
