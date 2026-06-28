import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-7 py-3.5 text-base rounded-xl',
};

const variants = {
  primary:
    'bg-gradient-to-r from-neon-cyan to-neon-purple text-white shadow-neon-cyan hover:shadow-neon-purple hover:scale-[1.02] active:scale-[0.98]',
  secondary:
    'bg-white/[0.05] border border-white/10 text-white/90 hover:bg-white/[0.09] hover:border-white/20',
  ghost: 'text-white/70 hover:text-white hover:bg-white/[0.06]',
  danger:
    'bg-gradient-to-r from-rose-500 to-neon-pink text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] hover:scale-[1.02] active:scale-[0.98]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        sizes[size],
        variants[variant],
        className
      )}
      {...rest}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
