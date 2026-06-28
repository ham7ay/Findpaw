import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Activity, Shield } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden">
      {/* Aurora background */}
      <div className="absolute inset-0 bg-aurora opacity-60 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        {/* Left — copy */}
        <div className="text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 backdrop-blur-md mb-6"
          >
            <Sparkles className="w-3.5 h-3.5 text-neon-cyan" />
            <span className="text-xs font-medium text-white/80">
              AI Trajectory Prediction • Real-Time
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-5xl lg:text-7xl font-bold leading-[1.05] tracking-tight"
          >
            <span className="block text-white">Track. Predict.</span>
            <span className="block neon-text">Protect.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg lg:text-xl text-white/60 max-w-xl mx-auto lg:mx-0 text-pretty"
          >
            Find🐾 fuses IoT GPS tags with a hybrid linear-regression + LSTM
            engine to predict where your pet or wild animal will go{' '}
            <span className="text-white">before</span> they get there.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
          >
            <Link to="/signup" className="btn-primary group">
              Start tracking
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link to="/dashboard" className="btn-secondary">
              Open demo dashboard
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-white/40"
          >
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-neon-cyan" /> 99.9% uptime
            </span>
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-neon-purple" /> End-to-end encrypted
            </span>
            <span>Used by 1,200+ shelters</span>
          </motion.div>
        </div>

        {/* Right — animated holographic globe */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative aspect-square max-w-[520px] mx-auto w-full"
        >
          <HolographicGlobe />
        </motion.div>
      </div>
    </section>
  );
}

/**
 * A stylized SVG "globe" with rotating coordinate grid, blinking
 * GPS pings, and a predicted-trajectory arc — pure SVG/CSS, no
 * external WebGL deps. Renders cheaply on mobile.
 */
function HolographicGlobe() {
  // Sample ping coordinates (lat-like values mapped to local SVG space)
  const pings = [
    { x: 32, y: 38, delay: 0 },
    { x: 68, y: 30, delay: 1.2 },
    { x: 75, y: 60, delay: 2.4 },
    { x: 28, y: 70, delay: 0.6 },
    { x: 52, y: 50, delay: 1.8 },
  ];

  return (
    <div className="relative w-full h-full">
      {/* Glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-neon-cyan/30 to-neon-purple/30 blur-3xl" />

      {/* Outer rotating ring */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle
            cx="50" cy="50" r="48"
            fill="none"
            stroke="url(#gradRing)"
            strokeWidth="0.3"
            strokeDasharray="2 4"
          />
          <defs>
            <linearGradient id="gradRing" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#06b6d4" stopOpacity="0.8"/>
              <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.4"/>
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Main globe */}
      <svg viewBox="0 0 100 100" className="absolute inset-[8%] w-[84%] h-[84%]">
        <defs>
          <radialGradient id="globeBg" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#1a2050" />
            <stop offset="100%" stopColor="#05060f" />
          </radialGradient>
          <linearGradient id="meridian" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#06b6d4" stopOpacity="0"/>
            <stop offset="0.5" stopColor="#06b6d4" stopOpacity="0.5"/>
            <stop offset="1" stopColor="#06b6d4" stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* Sphere */}
        <circle cx="50" cy="50" r="40" fill="url(#globeBg)" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="#06b6d4" strokeOpacity="0.25" strokeWidth="0.4" />

        {/* Latitude lines (ellipses) */}
        {[10, 20, 30].map((r, i) => (
          <ellipse key={`lat-${i}`} cx="50" cy="50" rx="40" ry={r} fill="none" stroke="url(#meridian)" strokeWidth="0.25" />
        ))}
        {/* Meridian lines */}
        {[10, 20, 30].map((r, i) => (
          <ellipse key={`lng-${i}`} cx="50" cy="50" rx={r} ry="40" fill="none" stroke="url(#meridian)" strokeWidth="0.25" />
        ))}

        {/* Predicted trajectory arc */}
        <motion.path
          d="M 28 70 Q 50 30 75 60"
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="0.6"
          strokeDasharray="2 1.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 3, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' }}
        />

        {/* GPS pings */}
        {pings.map((p, i) => (
          <g key={i}>
            <motion.circle
              cx={p.x} cy={p.y} r="2"
              fill="#06b6d4"
              initial={{ opacity: 0.3, scale: 1 }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.4, 1] }}
              transition={{ duration: 2, delay: p.delay, repeat: Infinity }}
            />
            <motion.circle
              cx={p.x} cy={p.y} r="2"
              fill="none"
              stroke="#06b6d4"
              strokeWidth="0.4"
              initial={{ opacity: 0.8, scale: 1 }}
              animate={{ opacity: 0, scale: 4 }}
              transition={{ duration: 2.5, delay: p.delay, repeat: Infinity }}
            />
          </g>
        ))}

        {/* Center predicted point */}
        <circle cx="50" cy="50" r="1.5" fill="#fff" />
      </svg>

      {/* HUD labels */}
      <div className="absolute top-4 right-4 glass rounded-lg px-3 py-1.5 text-[10px] font-mono">
        <span className="text-neon-cyan">LIVE</span> · 5 tags
      </div>
      <div className="absolute bottom-4 left-4 glass rounded-lg px-3 py-1.5 text-[10px] font-mono">
        <span className="text-neon-purple">AI</span> · 87% confidence
      </div>
    </div>
  );
}
