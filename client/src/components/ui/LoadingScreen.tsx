import { motion } from 'framer-motion';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-navy-950 z-50">
      <div className="relative flex flex-col items-center gap-6">
        {/* Animated rings */}
        <div className="relative w-24 h-24">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-neon-cyan/40"
            animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border-2 border-neon-purple/40"
            animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
          />
          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center text-2xl shadow-neon-cyan">
            🐾
          </div>
        </div>
        <div className="text-center">
          <p className="font-display text-xl tracking-wider neon-text">Find🐾</p>
          <p className="text-xs text-white/40 mt-1">Initializing AI engine…</p>
        </div>
      </div>
    </div>
  );
}
