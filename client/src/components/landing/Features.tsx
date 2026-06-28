import { motion } from 'framer-motion';
import {
  Brain, MapPin, Bell, Activity, Lock, Battery, Radar, Globe,
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI Trajectory Prediction',
    body: 'Hybrid LR + LSTM model forecasts the next 8 GPS points with confidence intervals.',
    accent: 'from-neon-purple to-neon-pink',
  },
  {
    icon: MapPin,
    title: 'Real-Time Tracking',
    body: 'Sub-second GPS pushes over Socket.IO with animated heatmap trails.',
    accent: 'from-neon-cyan to-neon-blue',
  },
  {
    icon: Radar,
    title: 'Geofencing 2.0',
    body: 'Multi-zone polygonal safe areas with predictive breach warnings.',
    accent: 'from-emerald-400 to-neon-cyan',
  },
  {
    icon: Bell,
    title: 'Smart Alerts',
    body: 'Inactivity, escape, abnormal movement, geofence breach, low battery.',
    accent: 'from-neon-amber to-rose-500',
  },
  {
    icon: Activity,
    title: 'Behavior Analytics',
    body: 'Daily, weekly, monthly movement stats; export CSV/PDF reports.',
    accent: 'from-neon-blue to-neon-purple',
  },
  {
    icon: Battery,
    title: 'Power-Aware Devices',
    body: 'Adaptive sampling rates extend tag battery life by up to 6×.',
    accent: 'from-neon-green to-emerald-400',
  },
  {
    icon: Lock,
    title: 'End-to-End Secure',
    body: 'Firebase Auth, signed device keys, granular Firestore rules.',
    accent: 'from-slate-300 to-neon-cyan',
  },
  {
    icon: Globe,
    title: 'Works Anywhere',
    body: 'PWA + offline mode + multi-language; built for the field.',
    accent: 'from-neon-purple to-neon-blue',
  },
];

export default function Features() {
  return (
    <section id="features" className="relative py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-mono uppercase tracking-[0.2em] text-neon-cyan mb-3">
            // Capabilities
          </p>
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-balance">
            A complete tracking stack — <span className="neon-text">built for intelligence</span>
          </h2>
          <p className="mt-4 text-white/60 max-w-2xl mx-auto text-pretty">
            Every feature is designed around one idea: knowing where your animal is now is
            useful, but knowing where they're <em>about to be</em> is transformative.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: (i % 4) * 0.1 }}
              className="holo-card p-6 group hover:-translate-y-1 transition-transform duration-300"
            >
              <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${f.accent} shadow-lg mb-4`}>
                <f.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2 group-hover:text-neon-cyan transition-colors">
                {f.title}
              </h3>
              <p className="text-sm text-white/55 leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
