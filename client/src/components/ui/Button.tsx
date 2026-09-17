import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';
import { Spinner } from './Spinner';

type ButtonVariant = 'gold' | 'green' | 'outline' | 'ghost';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  gold: 'bg-gradient-to-r from-royal-gold to-royal-gold-l text-royal-dark shadow-lg shadow-royal-gold/20 hover:shadow-royal-gold/40',
  green: 'bg-role-sipahi text-royal-dark shadow-lg shadow-role-sipahi/25 hover:shadow-role-sipahi/40',
  outline: 'border border-royal-border bg-royal-surface text-ink hover:border-royal-gold/60 hover:text-royal-gold-l',
  ghost: 'text-ink-muted hover:bg-royal-surface hover:text-ink',
};

export function Button({
  variant = 'gold',
  isLoading = false,
  fullWidth = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled === true || isLoading;

  return (
    <motion.button
      type={type}
      whileHover={isDisabled ? undefined : { scale: 1.02 }}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      disabled={isDisabled}
      aria-busy={isLoading}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-poppins text-sm font-semibold transition-[box-shadow,background-color,color,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-gold-l focus-visible:ring-offset-2 focus-visible:ring-offset-royal-dark disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${VARIANT_CLASSES[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {isLoading && <Spinner size="sm" />}
      {children}
    </motion.button>
  );
}
