import { useMemo, type CSSProperties } from 'react';

const COLORS = ['#F59E0B', '#FCD34D', '#FB923C', '#FDE68A', '#A78BFA'];
const PARTICLE_COUNT = 90;

type ParticleStyle = CSSProperties & Record<'--drift' | '--spin', string>;

/** Gold confetti burst using CSS keyframes (`confetti-fall` in index.css). */
export function Confetti() {
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const style: ParticleStyle = {
          left: `${Math.random() * 100}%`,
          width: `${6 + Math.random() * 6}px`,
          height: `${10 + Math.random() * 8}px`,
          backgroundColor: COLORS[i % COLORS.length],
          borderRadius: i % 3 === 0 ? '9999px' : '2px',
          animationDelay: `${Math.random() * 0.9}s`,
          animationDuration: `${2.6 + Math.random() * 2.2}s`,
          '--drift': `${(Math.random() - 0.5) * 240}px`,
          '--spin': `${360 + Math.random() * 720}deg`,
        };
        return style;
      }),
    [],
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {particles.map((style, i) => (
        <span key={i} className="confetti-particle" style={style} />
      ))}
    </div>
  );
}
