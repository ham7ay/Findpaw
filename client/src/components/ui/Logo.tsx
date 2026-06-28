import { cn } from '../../lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { box: 'w-8 h-8', text: 'text-base', emoji: 'text-lg' },
  md: { box: 'w-10 h-10', text: 'text-xl', emoji: 'text-xl' },
  lg: { box: 'w-14 h-14', text: 'text-3xl', emoji: 'text-3xl' },
};

export default function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const s = sizes[size];
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className={cn(
          'relative rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple',
          'flex items-center justify-center shadow-neon-cyan',
          s.box
        )}
      >
        <span className={s.emoji}>🐾</span>
        <div className="absolute inset-0 rounded-xl ring-1 ring-white/20 pointer-events-none" />
      </div>
      {showText && (
        <span className={cn('font-display font-bold tracking-wider neon-text', s.text)}>
          Find🐾
        </span>
      )}
    </div>
  );
}
