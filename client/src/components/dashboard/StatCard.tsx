import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  delta?: string;
  deltaTone?: 'up' | 'down' | 'neutral';
  accent?: 'cyan' | 'purple' | 'green' | 'amber' | 'pink';
  delay?: number;
}

const accents = {
  cyan:   'from-neon-cyan/20 to-neon-cyan/5 text-neon-cyan',
  purple: 'from-neon-purple/20 to-neon-purple/5 text-neon-purple',
  green:  'from-neon-green/20 to-neon-green/5 text-neon-green',
  amber:  'from-neon-amber/20 to-neon-amber/5 text-neon-amber',
  pink:   'from-neon-pink/20 to-neon-pink/5 text-neon-pink',
};

export default function StatCard({ icon, label, value, delta, deltaTone = 'neutral', accent = 'cyan', delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="holo-card p-5 group hover:-translate-y-0.5 transition-transform"
    >
      <div className="flex items-start justify-between">
        <div className={cn('p-2.5 rounded-xl bg-gradient-to-br', accents[accent])}>
          {icon}
        </div>
        {delta && (
          <span className={cn(
            'text-xs font-mono px-1.5 py-0.5 rounded',
            deltaTone === 'up' && 'text-neon-green bg-neon-green/10',
            deltaTone === 'down' && 'text-rose-400 bg-rose-500/10',
            deltaTone === 'neutral' && 'text-white/50 bg-white/5'
          )}>
            {delta}
          </span>
        )}
      </div>
      <p className="text-xs uppercase tracking-wider text-white/40 mt-4">{label}</p>
      <p className="font-display text-3xl font-bold mt-1">{value}</p>
    </motion.div>
  );
}
