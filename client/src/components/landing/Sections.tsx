import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Check, Star, Github, Twitter, Linkedin } from 'lucide-react';
import Logo from '../ui/Logo';

export function Testimonials() {
  const items = [
    {
      name: 'Dr. Aisha Khan',
      role: 'Lead Researcher, Margalla Wildlife',
      quote: 'The trajectory prediction model is the closest I have seen to actually working in the field. We caught two leopards trying to cross a highway before they got there.',
    },
    {
      name: 'Marco Rivera',
      role: 'Operations, Bay Animal Rescue',
      quote: 'We deployed Find🐾 across 40 sheltered dogs in three weeks. Escape incidents dropped 72%. The dashboard is also genuinely beautiful.',
    },
    {
      name: 'Hira Saeed',
      role: 'Cattle owner, Punjab',
      quote: 'I use the Urdu interface on my phone. When my buffalo wandered, the app predicted the river bank within 200 meters. Found in 15 minutes.',
    },
  ];

  return (
    <section id="testimonials" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-mono uppercase tracking-[0.2em] text-neon-cyan mb-3">// Trusted by</p>
          <h2 className="font-display text-4xl lg:text-5xl font-bold">Real stories. <span className="neon-text">Real animals.</span></h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {items.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="holo-card p-6"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-neon-amber text-neon-amber" />
                ))}
              </div>
              <p className="text-white/75 text-pretty leading-relaxed">"{t.quote}"</p>
              <div className="mt-5 pt-5 border-t border-white/5">
                <p className="font-semibold">{t.name}</p>
                <p className="text-xs text-white/40 mt-0.5">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Pricing() {
  const plans = [
    {
      name: 'Starter',
      price: 'Free',
      desc: 'For 1 pet, 1 device. Personal use.',
      features: ['Real-time tracking', 'Basic AI prediction', '7-day history', 'Email alerts'],
      cta: 'Start free',
      highlight: false,
    },
    {
      name: 'Pro',
      price: '$9',
      desc: 'For families and small shelters.',
      features: ['Up to 10 pets', 'Full hybrid AI engine', 'Unlimited history', 'SMS + email alerts', 'CSV/PDF exports', 'Geofence polygons'],
      cta: 'Start trial',
      highlight: true,
    },
    {
      name: 'Field',
      price: 'Custom',
      desc: 'Wildlife & livestock at scale.',
      features: ['Unlimited devices', 'Custom AI model training', 'API access', 'On-premise option', 'SLA & support'],
      cta: 'Talk to us',
      highlight: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-mono uppercase tracking-[0.2em] text-neon-purple mb-3">// Pricing</p>
          <h2 className="font-display text-4xl lg:text-5xl font-bold">Simple plans. <span className="neon-text">No surprises.</span></h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`holo-card p-8 ${p.highlight ? 'border-neon-cyan/50 shadow-neon-cyan' : ''}`}
            >
              {p.highlight && (
                <div className="badge badge-cyan mb-4">Most popular</div>
              )}
              <h3 className="font-display text-xl font-bold">{p.name}</h3>
              <p className="text-white/50 text-sm mt-1">{p.desc}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-5xl font-bold neon-text">{p.price}</span>
                {p.price.startsWith('$') && <span className="text-white/40 text-sm">/mo</span>}
              </div>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                    <Check className="w-4 h-4 text-neon-cyan shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className={`mt-8 block text-center ${p.highlight ? 'btn-primary' : 'btn-secondary'} w-full`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CTA() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto holo-card p-12 lg:p-16 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-aurora opacity-60 pointer-events-none" />
        <div className="relative">
          <h2 className="font-display text-4xl lg:text-5xl font-bold leading-tight">
            Stop searching. <br />
            <span className="neon-text">Start predicting.</span>
          </h2>
          <p className="mt-6 text-white/70 max-w-xl mx-auto text-lg">
            Set up your first tag in under 5 minutes. The free tier covers most pets — no credit card.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 justify-center">
            <Link to="/signup" className="btn-primary">Create free account</Link>
            <a href="#features" className="btn-secondary">Learn more</a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 px-6">
      <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
        <div>
          <Logo />
          <p className="text-sm text-white/50 mt-3 max-w-xs">
            AI-powered animal tracking for smarter protection.
          </p>
        </div>
        {[
          { title: 'Product', links: ['Features', 'AI Engine', 'Pricing', 'API'] },
          { title: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
          { title: 'Legal',   links: ['Privacy', 'Terms', 'Security', 'GDPR'] },
        ].map((col) => (
          <div key={col.title}>
            <h4 className="font-semibold text-white/90 mb-3">{col.title}</h4>
            <ul className="space-y-2 text-sm text-white/50">
              {col.links.map((l) => (
                <li key={l}><a href="#" className="hover:text-white transition">{l}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-white/40">© {new Date().getFullYear()} Find🐾 · Built with 💜 for Final Year Project</p>
        <div className="flex gap-3 text-white/40">
          <a href="#" className="hover:text-white"><Github className="w-4 h-4" /></a>
          <a href="#" className="hover:text-white"><Twitter className="w-4 h-4" /></a>
          <a href="#" className="hover:text-white"><Linkedin className="w-4 h-4" /></a>
        </div>
      </div>
    </footer>
  );
}
