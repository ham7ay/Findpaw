import { cn } from '../../lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { box: 'w-10 h-10', text: 'text-base', emoji: 'text-lg' },
  md: { box: 'w-14 h-14', text: 'text-xl', emoji: 'text-xl' },
  lg: { box: 'w-20 h-20', text: 'text-3xl', emoji: 'text-3xl' },
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