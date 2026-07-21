import { cn } from '../../lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { box: 'w-12 h-12', text: 'text-lg', emoji: 'text-lg' },
  md: { box: 'w-16 h-16', text: 'text-2xl', emoji: 'text-xl' },
  lg: { box: 'w-28 h-28', text: 'text-4xl', emoji: 'text-3xl' },
};

export default function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const s = sizes[size];
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <img
        src="/logo.png"
        alt="Find🐾 logo"
        className={cn('object-contain drop-shadow-[0_0_4px_rgba(6,182,212,0.3)]', s.box)}
      />
      {showText && (
        <span className={cn('font-display font-bold tracking-wider neon-text', s.text)}>
          Find🐾
        </span>
      )}
    </div>
  );
}