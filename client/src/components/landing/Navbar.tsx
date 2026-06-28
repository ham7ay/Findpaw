import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Logo from '../ui/Logo';
import { cn } from '../../lib/utils';

const links = [
  { to: '/#features',   label: 'Features' },
  { to: '/#ai',         label: 'AI Engine' },
  { to: '/#pricing',    label: 'Pricing' },
  { to: '/#testimonials', label: 'Reviews' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-navy-950/80 backdrop-blur-2xl border-b border-white/5'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/"><Logo size="md" /></Link>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.to} href={l.to} className="text-sm text-white/70 hover:text-white transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-sm text-white/70 hover:text-white">Sign in</Link>
          <Link to="/signup" className="btn-primary !py-2 !px-5 !text-sm">Get started</Link>
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-white/80">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-navy-900/95 backdrop-blur-2xl border-t border-white/5 px-6 py-4 space-y-3">
          {links.map((l) => (
            <a key={l.to} href={l.to} className="block text-sm text-white/70 hover:text-white py-2" onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
            <Link to="/login" className="btn-secondary !py-2 text-center">Sign in</Link>
            <Link to="/signup" className="btn-primary !py-2 text-center">Get started</Link>
          </div>
        </div>
      )}
    </motion.nav>
  );
}
