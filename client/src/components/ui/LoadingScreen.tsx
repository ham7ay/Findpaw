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
          <div className="absolute inset-4 rounded-full flex items-center justify-center" style={{ perspective: '400px' }}>
            <motion.img
              src="/logo.png"
              alt="Find🐾"
              className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]"
              animate={{ rotateY: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              style={{ transformStyle: 'preserve-3d' }}
            />
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