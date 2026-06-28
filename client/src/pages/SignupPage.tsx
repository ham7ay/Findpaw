import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import Logo from '../components/ui/Logo';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { signupWithEmail, loginWithGoogle, firebaseConfigured } from '../lib/firebase';

export default function SignupPage() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!firebaseConfigured) {
      toast.success('Demo mode — entering dashboard');
      nav('/dashboard');
      return;
    }
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await signupWithEmail(email, password, name);
      toast.success('Account created');
      nav('/dashboard');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Link to="/" className="absolute top-6 left-6 btn-ghost text-white/60">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md holo-card p-8 lg:p-10"
      >
        <div className="flex justify-center mb-6"><Logo size="lg" showText={false} /></div>
        <h1 className="font-display text-3xl font-bold text-center">Create your account</h1>
        <p className="text-center text-white/50 text-sm mt-2">
          Start tracking in under 5 minutes
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <Input
            type="text"
            label="Full name"
            name="name"
            icon={<User className="w-4 h-4" />}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Lovelace"
            required
          />
          <Input
            type="email"
            label="Email"
            name="email"
            icon={<Mail className="w-4 h-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <Input
            type="password"
            label="Password"
            name="password"
            icon={<Lock className="w-4 h-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            required
          />
          <Button type="submit" loading={loading} className="w-full">Create account</Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-white/40">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <button onClick={() => loginWithGoogle().then(() => nav('/dashboard'))} className="btn-secondary w-full">
          Continue with Google
        </button>

        <p className="mt-8 text-center text-sm text-white/50">
          Already have an account?{' '}
          <Link to="/login" className="text-neon-cyan hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
