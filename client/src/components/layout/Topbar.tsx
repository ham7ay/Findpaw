import { Bell, Search, Menu, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TopbarProps {
  onMenuClick?: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 px-4 lg:px-8 h-16 border-b border-white/5 bg-navy-950/70 backdrop-blur-xl">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-white/60 hover:text-white"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-lg relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input
          type="text"
          placeholder="Search pets, devices, alerts… (⌘K)"
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/[0.03] border border-white/5 text-sm placeholder-white/30 focus:outline-none focus:border-neon-cyan/50 focus:bg-white/[0.06] transition"
        />
      </div>

      {/* AI status indicator */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neon-cyan/[0.08] border border-neon-cyan/20">
        <div className="relative">
          <Sparkles className="w-3.5 h-3.5 text-neon-cyan" />
          <span className="absolute inset-0 w-3.5 h-3.5 rounded-full bg-neon-cyan/30 animate-ping" />
        </div>
        <span className="text-xs font-medium text-neon-cyan">AI Engine Active</span>
      </div>

      <Link
        to="/alerts"
        className="relative p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors"
      >
        <Bell className="w-5 h-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-neon-pink shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
      </Link>
    </header>
  );
}