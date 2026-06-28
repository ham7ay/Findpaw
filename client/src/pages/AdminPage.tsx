import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Radio, Shield, Search, MoreVertical, CheckCircle, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { DEMO_PETS, DEMO_DEVICES } from '@/services/demoData';
import { timeAgo } from '@/lib/utils';

const DEMO_USERS = [
  { id: 'u-001', name: 'Ali Raza', email: 'ali@findpaw.io', role: 'admin', status: 'active', joined: Date.now() - 86400000 * 90, pets: 3 },
  { id: 'u-002', name: 'Sara Khan', email: 'sara@findpaw.io', role: 'user', status: 'active', joined: Date.now() - 86400000 * 45, pets: 2 },
  { id: 'u-003', name: 'Hassan Ahmed', email: 'hassan@findpaw.io', role: 'user', status: 'active', joined: Date.now() - 86400000 * 20, pets: 1 },
  { id: 'u-004', name: 'Mariam Tariq', email: 'mariam@findpaw.io', role: 'user', status: 'suspended', joined: Date.now() - 86400000 * 60, pets: 0 },
  { id: 'u-005', name: 'Bilal Sheikh', email: 'bilal@findpaw.io', role: 'user', status: 'active', joined: Date.now() - 86400000 * 10, pets: 4 },
];

export default function AdminPage() {
  const [tab, setTab] = useState<'users' | 'devices'>('users');
  const [search, setSearch] = useState('');

  const filteredUsers = DEMO_USERS.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredDevices = DEMO_DEVICES.filter((d) =>
    d.serial.toLowerCase().includes(search.toLowerCase())
  );

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
        <StatBox icon={Users} label="Total users" value={DEMO_USERS.length} />
        <StatBox icon={Users} label="Active" value={DEMO_USERS.filter((u) => u.status === 'active').length} accent="green" />
        <StatBox icon={Radio} label="Devices" value={DEMO_DEVICES.length} />
        <StatBox icon={Radio} label="Online" value={DEMO_DEVICES.filter((d) => d.status === 'online').length} accent="cyan" />
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
                    <th className="pb-3 font-normal">Status</th>
                    <th className="pb-3 font-normal">Pets</th>
                    <th className="pb-3 font-normal">Joined</th>
                    <th className="pb-3 font-normal"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, i) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center text-xs font-bold">
                            {u.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <div>{u.name}</div>
                            <div className="text-xs text-white/40">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`badge ${u.role === 'admin' ? 'badge-purple' : 'badge-cyan'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3">
                        {u.status === 'active' ? (
                          <span className="flex items-center gap-1.5 text-neon-green">
                            <CheckCircle className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-white/50">
                            <XCircle className="w-3.5 h-3.5" /> Suspended
                          </span>
                        )}
                      </td>
                      <td className="py-3 font-mono">{u.pets}</td>
                      <td className="py-3 text-white/50">{timeAgo(u.joined)}</td>
                      <td className="py-3 text-right">
                        <button className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-white">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs text-white/50 uppercase tracking-wider">
                    <th className="pb-3 font-normal">Serial</th>
                    <th className="pb-3 font-normal">Pet</th>
                    <th className="pb-3 font-normal">Firmware</th>
                    <th className="pb-3 font-normal">Status</th>
                    <th className="pb-3 font-normal">Battery</th>
                    <th className="pb-3 font-normal">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDevices.map((d, i) => {
                    const pet = DEMO_PETS.find((p) => p.id === d.petId);
                    return (
                      <motion.tr
                        key={d.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-3 font-mono text-xs">{d.serial}</td>
                        <td className="py-3">
                          {pet ? (
                            <span className="flex items-center gap-2">
                              <span>{pet.species === 'dog' ? '🐕' : '🐈'}</span>
                              {pet.name}
                            </span>
                          ) : <span className="text-white/40">Unassigned</span>}
                        </td>
                        <td className="py-3 text-white/70">{d.firmware}</td>
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
                    );
                  })}
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
