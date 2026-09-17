import { useMemo } from 'react';
import { create } from 'zustand';

type SoundName = 'shuffle' | 'reveal' | 'correct' | 'wrong' | 'win';

const SOUND_FILES: Readonly<Record<SoundName, string>> = {
  shuffle: '/sounds/shuffle.mp3',
  reveal: '/sounds/reveal.mp3',
  correct: '/sounds/correct.mp3',
  wrong: '/sounds/wrong.mp3',
  win: '/sounds/win.mp3',
};

const MUTE_STORAGE_KEY = 'rmcs:muted';

// ─── Mute preference ──────────────────────────────────────────────────────────

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

interface AudioSettings {
  isMuted: boolean;
  toggleMute: () => void;
}

const useAudioSettings = create<AudioSettings>()((set, get) => ({
  isMuted: readMuted(),
  toggleMute: () => {
    const isMuted = !get().isMuted;
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, String(isMuted));
    } catch {
      // Not persisting the preference is fine.
    }
    set({ isMuted });
  },
}));

// ─── Sound loading ────────────────────────────────────────────────────────────

/** `null` means the file could not be loaded, so the synthesized cue is used. */
const loaded = new Map<SoundName, HTMLAudioElement | null>();

function preloadSounds(): void {
  if (loaded.size > 0 || typeof Audio === 'undefined') return;

  for (const name of Object.keys(SOUND_FILES) as SoundName[]) {
    try {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.addEventListener('error', () => loaded.set(name, null), { once: true });
      audio.src = SOUND_FILES[name];
      loaded.set(name, audio);
    } catch {
      loaded.set(name, null);
    }
  }
}

// ─── Synthesized fallback (used when /sounds files are missing) ───────────────

interface Tone {
  freq: number;
  start: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
}

const FALLBACK_TONES: Readonly<Record<SoundName, Tone[]>> = {
  shuffle: [0, 0.07, 0.14, 0.21, 0.28].map((start, i) => ({
    freq: 180 + i * 30,
    start,
    duration: 0.05,
    type: 'triangle',
    gain: 0.08,
  })),
  reveal: [
    { freq: 523, start: 0, duration: 0.12, type: 'sine' },
    { freq: 659, start: 0.1, duration: 0.12, type: 'sine' },
    { freq: 784, start: 0.2, duration: 0.25, type: 'sine' },
  ],
  correct: [
    { freq: 587, start: 0, duration: 0.14, type: 'triangle' },
    { freq: 740, start: 0.12, duration: 0.14, type: 'triangle' },
    { freq: 880, start: 0.24, duration: 0.35, type: 'triangle' },
  ],
  wrong: [
    { freq: 330, start: 0, duration: 0.2, type: 'sawtooth', gain: 0.06 },
    { freq: 247, start: 0.18, duration: 0.4, type: 'sawtooth', gain: 0.06 },
  ],
  win: [
    { freq: 523, start: 0, duration: 0.15, type: 'square', gain: 0.06 },
    { freq: 659, start: 0.15, duration: 0.15, type: 'square', gain: 0.06 },
    { freq: 784, start: 0.3, duration: 0.15, type: 'square', gain: 0.06 },
    { freq: 1047, start: 0.45, duration: 0.5, type: 'square', gain: 0.06 },
  ],
};

let audioContext: AudioContext | null = null;

function playFallback(name: SoundName): void {
  try {
    audioContext ??= new AudioContext();
    const ctx = audioContext;
    if (ctx.state === 'suspended') void ctx.resume();

    for (const tone of FALLBACK_TONES[name]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startAt = ctx.currentTime + tone.start;
      const peak = tone.gain ?? 0.1;

      osc.type = tone.type ?? 'sine';
      osc.frequency.value = tone.freq;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + tone.duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + tone.duration + 0.02);
    }
  } catch {
    // Audio is optional; never let it break the game.
  }
}

function playSound(name: SoundName): void {
  if (useAudioSettings.getState().isMuted) return;
  preloadSounds();

  const audio = loaded.get(name);
  if (!audio) {
    playFallback(name);
    return;
  }
  try {
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Autoplay blocked or the file failed to decode.
      loaded.set(name, null);
      playFallback(name);
    });
  } catch {
    playFallback(name);
  }
}

/** Stable identities, so effects that depend on them do not re-run when mute toggles. */
const SOUND_PLAYERS = {
  playShuffle: () => playSound('shuffle'),
  playReveal: () => playSound('reveal'),
  playCorrect: () => playSound('correct'),
  playWrong: () => playSound('wrong'),
  playWin: () => playSound('win'),
} as const;

export interface UseAudioResult {
  playShuffle: () => void;
  playReveal: () => void;
  playCorrect: () => void;
  playWrong: () => void;
  playWin: () => void;
  isMuted: boolean;
  toggleMute: () => void;
}

export function useAudio(): UseAudioResult {
  const isMuted = useAudioSettings((s) => s.isMuted);
  const toggleMute = useAudioSettings((s) => s.toggleMute);
  preloadSounds();

  return useMemo(() => ({ ...SOUND_PLAYERS, isMuted, toggleMute }), [isMuted, toggleMute]);
}
