import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, PawPrint } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="inline-block mb-6"
        >
          <PawPrint className="w-24 h-24 text-neon-cyan" />
        </motion.div>
        <div className="text-8xl font-display font-bold neon-text mb-2">404</div>
        <div className="text-white/70 text-lg mb-6">This trail has gone cold.</div>
        <Link to="/">
          <Button variant="primary">
            <Home className="w-4 h-4 mr-1.5" />
            Take me home
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
