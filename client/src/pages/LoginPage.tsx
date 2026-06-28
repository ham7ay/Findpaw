import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import Logo from '../components/ui/Logo';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { loginWithEmail, loginWithGoogle, resetPassword, firebaseConfigured } from '../lib/firebase';

export default function LoginPage() {
  const nav = useNavigate();
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
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      toast.success('Welcome back!');
      nav('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    if (!firebaseConfigured) return nav('/dashboard');
    try {
      await loginWithGoogle();
      nav('/dashboard');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const onForgot = async () => {
    if (!email) return toast.error('Enter your email first');
    try {
      await resetPassword(email);
      toast.success('Reset link sent');
    } catch (err: any) {
      toast.error(err.message);
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
        <div className="flex justify-center mb-6">
          <Logo size="lg" showText={false} />
        </div>
        <h1 className="font-display text-3xl font-bold text-center">Welcome back</h1>
        <p className="text-center text-white/50 text-sm mt-2">
          Sign in to track your pack
        </p>

        {!firebaseConfigured && (
          <div className="mt-6 p-3 rounded-lg bg-neon-amber/10 border border-neon-amber/30 text-xs text-neon-amber">
            Firebase isn't configured. Any credentials will enter demo mode.
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
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
            placeholder="••••••••"
            required
          />

          <div className="flex justify-end">
            <button type="button" onClick={onForgot} className="text-xs text-neon-cyan hover:underline">
              Forgot password?
            </button>
          </div>

          <Button type="submit" loading={loading} className="w-full">Sign in</Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-white/40">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <button onClick={onGoogle} className="btn-secondary w-full">
          <GoogleIcon /> Continue with Google
        </button>

        <p className="mt-8 text-center text-sm text-white/50">
          Don't have an account?{' '}
          <Link to="/signup" className="text-neon-cyan hover:underline">Create one</Link>
        </p>
      </motion.div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-4 h-4">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.7 4.7-6.2 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6L31.7 33c-2.2 1.5-4.8 2.4-7.7 2.4-5.1 0-9.4-3.3-11.1-7.9l-6.5 5C9.6 39.7 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.6 5.6C41.6 36.1 44 30.6 44 24c0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  );
}
