import type { Role } from '../types/game.types';

export interface RoleMeta {
  role: Role;
  label: string;
  meaning: string;
  emoji: string;
  hex: string;
  points: number;
  pointsNote: string;
  /** Tailwind classes are spelled out in full so the JIT picks them up. */
  textClass: string;
  borderClass: string;
  bgClass: string;
  glowClass: string;
}

export const ROLE_META: Readonly<Record<Role, RoleMeta>> = {
  raja: {
    role: 'raja',
    label: 'Raja',
    meaning: 'King',
    emoji: '👑',
    hex: '#FB923C',
    points: 1000,
    pointsNote: 'Always',
    textClass: 'text-role-raja',
    borderClass: 'border-role-raja',
    bgClass: 'bg-role-raja/10',
    glowClass: 'shadow-role-raja/30',
  },
  mantri: {
    role: 'mantri',
    label: 'Mantri',
    meaning: 'Minister',
    emoji: '📜',
    hex: '#60A5FA',
    points: 500,
    pointsNote: 'Always',
    textClass: 'text-role-mantri',
    borderClass: 'border-role-mantri',
    bgClass: 'bg-role-mantri/10',
    glowClass: 'shadow-role-mantri/30',
  },
  sipahi: {
    role: 'sipahi',
    label: 'Sipahi',
    meaning: 'Soldier',
    emoji: '⚔️',
    hex: '#34D399',
    points: 800,
    pointsNote: 'If you catch the Chor',
    textClass: 'text-role-sipahi',
    borderClass: 'border-role-sipahi',
    bgClass: 'bg-role-sipahi/10',
    glowClass: 'shadow-role-sipahi/30',
  },
  chor: {
    role: 'chor',
    label: 'Chor',
    meaning: 'Thief',
    emoji: '🦹',
    hex: '#EF4444',
    points: 800,
    pointsNote: 'If the Sipahi guesses wrong',
    textClass: 'text-role-chor',
    borderClass: 'border-role-chor',
    bgClass: 'bg-role-chor/10',
    glowClass: 'shadow-role-chor/30',
  },
};

export const ROLE_ORDER: readonly Role[] = ['raja', 'mantri', 'sipahi', 'chor'];

export function formatPoints(value: number): string {
  return Math.round(value).toLocaleString('en-IN');
}
