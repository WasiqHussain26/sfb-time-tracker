import { useState } from 'react';
import { motion } from 'framer-motion';

interface LoginProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('https://sfb-backend.vercel.app/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.user.status === 'DISABLED') {
          setError("Your account is inactive. Please contact your administrator.");
          setLoading(false);
          return;
        }

        const token = data.access_token || data.accessToken;
        onLoginSuccess(data.user, token);
      } else {
        if (res.status === 403 || (data.message && data.message.includes('Inactive'))) {
          setError('This account has been deactivated.');
        } else {
          setError(data.message || 'Invalid credentials');
        }
      }
    } catch (err) {
      setError('Cannot connect to server.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-blue-600 flex items-center justify-center overflow-hidden font-sans select-none">

      {/* Background Decor (Subtle Gradient) */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700 pointer-events-none" />

      {/* Animated Card Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[400px] bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-8 z-10 relative flex flex-col items-center text-center"
      >
        {/* Header - NO LOGO, JUST TEXT */}
        <div className="mb-10 flex flex-col items-center">

          <motion.h2
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-black text-white tracking-tighter drop-shadow-sm mb-2"
          >
            SFB
            <span className="text-blue-200 ml-2 font-light">Time Tracker</span>
          </motion.h2>

          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "40px" }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="h-1 bg-white/30 rounded-full mb-3"
          />
        </div>

        {/* Animated Error Box */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="w-full mb-4 p-3 self-stretch text-xs font-bold text-white bg-red-500/80 rounded-xl flex items-center justify-center gap-2 shadow-sm"
          >
            <span>⚠️ {error}</span>
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div className="space-y-1 text-left">
            <label className="text-[10px] font-bold text-blue-100 uppercase tracking-wider ml-1">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="name@company.com"
              className="w-full px-4 py-3 bg-blue-900/30 border border-blue-400/30 text-white placeholder-blue-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="text-[10px] font-bold text-blue-100 uppercase tracking-wider ml-1">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-blue-900/30 border border-blue-400/30 text-white placeholder-blue-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-1">
            <a
              href="https://sfbtimetracker.com/forgot-password"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold text-blue-200 hover:text-white transition-colors"
            >
              Forgot Password?
            </a>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 text-blue-700 font-black text-sm rounded-xl shadow-lg transition-all ${loading ? 'bg-white/50 cursor-not-allowed' : 'bg-white hover:bg-blue-50'
              }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></span>
                VERIFYING...
              </span>
            ) : 'ACCESS PORTAL'}
          </motion.button>
        </form>
      </motion.div>

      {/* Footer Version */}
      <div className="absolute bottom-4 text-blue-300/60 text-[10px] uppercase font-bold tracking-[3px]">
        v1.0.7 &bull; Secure Connection
      </div>
    </div>
  );
}