import { motion } from 'framer-motion';
import { Brain, TrendingUp, AlertTriangle, MapPin } from 'lucide-react';

export default function AIShowcase() {
  return (
    <section className="relative py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — visual */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="holo-card p-8 scanline"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-neon-purple" />
                <span className="font-mono text-sm text-white/80">prediction.engine.v2</span>
              </div>
              <span className="badge badge-purple">LIVE</span>
            </div>

            {/* Mock trajectory chart */}
            <svg viewBox="0 0 400 200" className="w-full">
              {/* Grid */}
              {[0, 1, 2, 3, 4].map((i) => (
                <line key={i} x1="0" y1={i * 50} x2="400" y2={i * 50} stroke="rgba(255,255,255,0.04)" />
              ))}
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <line key={i} x1={i * 60} y1="0" x2={i * 60} y2="200" stroke="rgba(255,255,255,0.04)" />
              ))}

              {/* Historical path (solid cyan) */}
              <motion.path
                d="M 20 160 Q 80 140 120 130 T 200 100"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2.5"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5 }}
              />

              {/* Predicted path (dashed purple) */}
              <motion.path
                d="M 200 100 Q 260 70 320 50 T 380 30"
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="2.5"
                strokeDasharray="6 4"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, delay: 1.5 }}
              />

              {/* Confidence cone (fading area) */}
              <motion.path
                d="M 200 100 L 380 10 L 380 50 L 200 100 Z"
                fill="url(#confGrad)"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 2.5 }}
              />
              <defs>
                <linearGradient id="confGrad" x1="0" x2="1">
                  <stop offset="0" stopColor="#8b5cf6" stopOpacity="0.35"/>
                  <stop offset="1" stopColor="#8b5cf6" stopOpacity="0"/>
                </linearGradient>
              </defs>

              {/* Historical points */}
              {[[20,160],[80,140],[120,130],[170,115],[200,100]].map(([x,y],i) => (
                <circle key={`h${i}`} cx={x} cy={y} r="4" fill="#06b6d4" />
              ))}

              {/* Predicted points (hollow with glow) */}
              {[[240,85],[290,65],[340,45],[380,30]].map(([x,y],i) => (
                <g key={`p${i}`}>
                  <circle cx={x} cy={y} r="6" fill="rgba(139,92,246,0.2)" />
                  <circle cx={x} cy={y} r="3" fill="#8b5cf6" />
                </g>
              ))}

              {/* Current position marker */}
              <circle cx="200" cy="100" r="6" fill="#fff" />
              <circle cx="200" cy="100" r="10" fill="none" stroke="#fff" strokeOpacity="0.4" />

              <text x="20" y="190" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="JetBrains Mono">
                t-30min
              </text>
              <text x="190" y="190" fill="rgba(255,255,255,0.6)" fontSize="9" fontFamily="JetBrains Mono">
                NOW
              </text>
              <text x="350" y="190" fill="rgba(139,92,246,0.7)" fontSize="9" fontFamily="JetBrains Mono">
                t+8min
              </text>
            </svg>

            <div className="grid grid-cols-3 gap-3 mt-6">
              <Stat label="Confidence" value="87%" tone="cyan" />
              <Stat label="Risk Level" value="Low" tone="green" />
              <Stat label="Anomalies" value="0" tone="purple" />
            </div>
          </motion.div>

          {/* Right — copy */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <p className="text-sm font-mono uppercase tracking-[0.2em] text-neon-purple mb-3">
              // The prediction engine
            </p>
            <h2 className="font-display text-4xl lg:text-5xl font-bold leading-tight">
              See where they're <span className="neon-text">about to go.</span>
            </h2>
            <p className="mt-5 text-white/60 text-lg text-pretty">
              Most GPS apps tell you where your animal <em>was</em>. Find🐾 tells you where they'll be
              in 8 minutes — with measurable confidence.
            </p>

            <div className="mt-8 space-y-5">
              <Bullet icon={TrendingUp} title="Hybrid LR + LSTM">
                Linear regression locks in long-term trends; LSTM captures the bursty,
                non-linear behavior animals actually exhibit.
              </Bullet>
              <Bullet icon={MapPin} title="Confidence visualization">
                Predicted points come with shaded confidence cones so you instantly know
                how much to trust the forecast.
              </Bullet>
              <Bullet icon={AlertTriangle} title="Anomaly detection">
                Sharp direction reversals, speed spikes, geofence breaches — flagged with
                a numeric risk score, not vague labels.
              </Bullet>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'cyan' | 'green' | 'purple' }) {
  const toneClass = {
    cyan: 'text-neon-cyan border-neon-cyan/20 bg-neon-cyan/[0.06]',
    green: 'text-neon-green border-neon-green/20 bg-neon-green/[0.06]',
    purple: 'text-neon-purple border-neon-purple/20 bg-neon-purple/[0.06]',
  }[tone];
  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className="text-lg font-bold font-mono mt-0.5">{value}</p>
    </div>
  );
}

function Bullet({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-neon-cyan/15 to-neon-purple/15 border border-white/10 flex items-center justify-center">
        <Icon className="w-4.5 h-4.5 text-neon-cyan" />
      </div>
      <div>
        <h4 className="font-semibold">{title}</h4>
        <p className="text-sm text-white/55 mt-0.5">{children}</p>
      </div>
    </div>
  );
}
