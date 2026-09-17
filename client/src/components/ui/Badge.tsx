import type { ReactNode } from 'react';

type BadgeTone = 'gold' | 'green' | 'muted' | 'red';

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  gold: 'border-royal-gold/40 bg-royal-gold/10 text-royal-gold-l',
  green: 'border-role-sipahi/40 bg-role-sipahi/10 text-role-sipahi',
  muted: 'border-royal-border bg-royal-surface text-ink-muted',
  red: 'border-role-chor/40 bg-role-chor/10 text-role-chor',
};

export function Badge({ tone = 'muted', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs font-medium ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
