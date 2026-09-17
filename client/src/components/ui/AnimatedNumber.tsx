import { animate, useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { formatPoints } from '../../utils/roles';

interface AnimatedNumberProps {
  value: number;
  /** Starting value on first render. Defaults to `value` (no initial count-up). */
  from?: number;
  duration?: number;
  delay?: number;
  prefix?: string;
  className?: string;
}

/** Counts up (or down) to `value` whenever it changes. */
export function AnimatedNumber({
  value,
  from,
  duration = 0.9,
  delay = 0,
  prefix = '',
  className = '',
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const displayed = useRef(from ?? value);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const render = (n: number) => {
      displayed.current = n;
      if (ref.current) ref.current.textContent = `${prefix}${formatPoints(n)}`;
    };

    if (reduceMotion) {
      render(value);
      return;
    }

    // Start from whatever is on screen, so interrupted animations continue smoothly.
    const controls = animate(displayed.current, value, {
      duration,
      delay,
      ease: 'easeOut',
      onUpdate: render,
    });
    return () => controls.stop();
  }, [value, duration, delay, prefix, reduceMotion]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {formatPoints(from ?? value)}
    </span>
  );
}
