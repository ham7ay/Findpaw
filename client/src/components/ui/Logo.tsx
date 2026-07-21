import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { box: 'h-12 w-auto', text: 'text-lg', emoji: 'text-lg' },
  md: { box: 'h-16 w-auto', text: 'text-2xl', emoji: 'text-xl' },
  lg: { box: 'h-28 w-auto', text: 'text-4xl', emoji: 'text-3xl' },
};

export default function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const s = sizes[size];
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div style={{ perspective: '400px' }}>
        <motion.img
          src="/logo.png"
          alt="Find🐾 logo"
          className={cn('object-contain drop-shadow-[0_0_4px_rgba(6,182,212,0.3)]', s.box)}
          animate={{ rotateY: 360 }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
          style={{ transformStyle: 'preserve-3d' }}
        />
      </div>
      {showText && (
        <span className={cn('font-display font-bold tracking-wider neon-text', s.text)}>
          Find🐾
        </span>
      )}
    </div>
  );
}