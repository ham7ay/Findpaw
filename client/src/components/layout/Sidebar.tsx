import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PawPrint,
  Map as MapIcon,
  Bell,
  BarChart3,
  Cpu,
  Shield,
  LogOut,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Logo from '../ui/Logo';
import { useAuthStore } from '../../store/authStore';
import { logout } from '../../lib/firebase';
import { cn } from '../../lib/utils';

const navItems = [
  { to: '/dashboard',  label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/pets',       label: 'My Pets',       icon: PawPrint },
  { to: '/tracking',   label: 'Live Tracking', icon: MapIcon },
  { to: '/alerts',     label: 'Alerts',        icon: Bell },
  { to: '/analytics',  label: 'Analytics',     icon: BarChart3 },
  { to: '/simulator',  label: 'GPS Simulator', icon: Cpu },
  { to: '/admin',      label: 'Admin',         icon: Shield },
];

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-white/5 bg-navy-900/50 backdrop-blur-2xl">
      <div className="p-6 border-b border-white/5">
        <Logo size="md" />
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium',
                'transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-neon-cyan/15 to-neon-purple/10 text-white border border-white/10'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-glow"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b from-neon-cyan to-neon-purple"
                  />
                )}
                <item.icon className={cn('w-4.5 h-4.5', isActive && 'text-neon-cyan')} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center text-sm font-bold">
            {(user?.displayName || user?.email || 'G').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.displayName || 'Guest'}
            </p>
            <p className="text-xs text-white/40 truncate">{user?.email || 'demo mode'}</p>
          </div>
          <button
            onClick={() => logout()}
            className="p-2 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
