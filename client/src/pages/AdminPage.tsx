import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Radio, Shield, Search, Trash2, ShieldAlert, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { adminApi, ApiError } from '@/services/api';
import { timeAgo } from '@/lib/utils';
import type { Device } from '@shared/types';

interface AdminUser {
  uid: string;
  email: string;
  role: 'user' | 'admin';
  displayName: string;
  createdAt: number;
}

export default function AdminPage() {
  const [tab, setTab] = useState<'users' | 'devices'>('users');
  const [search, setSearch] = useState('');

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<{ users: number; pets: number; devices: number; alerts: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [u, d, s] = await Promise.all([adminApi.users(), adminApi.devices(), adminApi.stats()]);
        setUsers(u);
        setDevices(d);
        setStats(s);
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const removeUser = async (uid: string) => {
    if (!confirm('Delete this user account? This cannot be undone.')) return;
    const prev = users;
    setUsers(users.filter((u) => u.uid !== uid));
    try {
      await adminApi.deleteUser(uid);
    } catch (err: any) {
      setUsers(prev);
      alert(err.message ?? 'Could not delete user');
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredDevices = devices.filter((d) =>
    d.serial.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/50 text-sm py-20 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading admin console…
      </div>
    );
  }

  if (forbidden) {
    return (
      <Card variant="holo" className="p-10 text-center">
        <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <div className="text-white/70 font-display mb-2">Admin access required</div>
        <p className="text-white/50 text-sm max-w-md mx-auto">
          Your account doesn't have the <code className="text-neon-cyan">admin</code> role yet. Set it via
          Firebase custom claims (or ask an existing admin to promote you through <code className="text-neon-cyan">POST /api/auth/role</code>) to access this page.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-7 h-7 text-neon-purple" />
        <div>
          <h1 className="text-3xl font-display font-bold neon-text">Admin Console</h1>
          <p className="text-white/60 mt-1">System management for operators.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox icon={Users} label="Total users" value={stats?.users ?? users.length} />
        <StatBox icon={Users} label="Admins" value={users.filter((u) => u.role === 'admin').length} accent="green" />
        <StatBox icon={Radio} label="Devices" value={stats?.devices ?? devices.length} />
        <StatBox icon={Radio} label="Online" value={devices.filter((d) => d.status === 'online').length} accent="cyan" />
      </div>

      <Card variant="holo" className="p-0 overflow-hidden">
        <div className="flex border-b border-white/10">
          <TabButton active={tab === 'users'} onClick={() => setTab('users')} icon={Users}>Users</TabButton>
          <TabButton active={tab === 'devices'} onClick={() => setTab('devices')} icon={Radio}>Devices</TabButton>
        </div>

        <div className="p-5">
          <div className="mb-4">
            <Input
              icon={<Search className="w-4 h-4" />}
              placeholder={`Search ${tab}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {tab === 'users' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs text-white/50 uppercase tracking-wider">
                    <th className="pb-3 font-normal">User</th>
                    <th className="pb-3 font-normal">Role</th>
                    <th className="pb-3 font-normal">Joined</th>
                    <th className="pb-3 font-normal"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, i) => (
                    <motion.tr
                      key={u.uid}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center text-xs font-bold">
                            {(u.displayName || u.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div>{u.displayName || '—'}</div>
                            <div className="text-xs text-white/40">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`badge ${u.role === 'admin' ? 'badge-purple' : 'badge-cyan'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 text-white/50">{u.createdAt ? timeAgo(u.createdAt) : '—'}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => removeUser(u.uid)}
                          className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-neon-pink"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={4} className="py-8 text-center text-white/40">No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs text-white/50 uppercase tracking-wider">
                    <th className="pb-3 font-normal">Serial</th>
                    <th className="pb-3 font-normal">Pet ID</th>
                    <th className="pb-3 font-normal">Firmware</th>
                    <th className="pb-3 font-normal">Status</th>
                    <th className="pb-3 font-normal">Battery</th>
                    <th className="pb-3 font-normal">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDevices.map((d, i) => (
                    <motion.tr
                      key={d.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 font-mono text-xs">{d.serial}</td>
                      <td className="py-3 font-mono text-xs text-white/60">{d.petId ?? '—'}</td>
                      <td className="py-3 text-white/70">{d.firmware ?? '—'}</td>
                      <td className="py-3">
                        <span className={`badge ${d.status === 'online' ? 'badge-green' : 'badge-amber'}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={`h-full ${d.battery > 50 ? 'bg-neon-green' : d.battery > 20 ? 'bg-amber-400' : 'bg-neon-pink'}`}
                              style={{ width: `${d.battery}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs">{d.battery}%</span>
                        </div>
                      </td>
                      <td className="py-3 text-white/50">{timeAgo(d.lastSync)}</td>
                    </motion.tr>
                  ))}
                  {filteredDevices.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-white/40">No devices found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: any; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-3 text-sm border-b-2 transition-all ${
        active ? 'border-neon-cyan text-neon-cyan' : 'border-transparent text-white/60 hover:text-white'
      }`}
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  );
}

function StatBox({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: 'cyan' | 'green' | 'purple' }) {
  const color = accent === 'green' ? 'text-neon-green' : accent === 'cyan' ? 'text-neon-cyan' : 'text-neon-purple';
  return (
    <Card variant="holo" className="p-4">
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${color}`} />
        <div>
          <div className="text-xs text-white/50">{label}</div>
          <div className="font-display text-xl">{value}</div>
        </div>
      </div>
    </Card>
  );
}