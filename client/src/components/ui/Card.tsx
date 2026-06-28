import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'holo';
  glow?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'holo', glow, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl p-5',
        variant === 'default' && 'bg-navy-800 border border-white/5',
        variant === 'glass' && 'glass',
        variant === 'holo' && 'holo-card',
        glow && 'animate-glow-pulse',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
);
Card.displayName = 'Card';
