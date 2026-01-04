'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      router.push('/dashboard');

    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    // BRAND BLUE GRADIENT BACKGROUND
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 overflow-hidden relative">

      {/* Background Decor (Orbs) */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/30 blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/30 blur-[100px] animate-pulse" />

      {/* GLASSMORPHIC CARD */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
        className="w-full max-w-md p-8 space-y-8 bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 relative z-10"
      >
        {/* Logo & Branding */}
        <div className="flex flex-col items-center space-y-4">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="p-3 bg-white/10 rounded-full shadow-inner border border-white/10"
          >
            <Image
              src="/logo.png"
              alt="SFB Logo"
              width={80}
              height={80}
              className="object-contain brightness-0 invert drop-shadow-md"
            />
          </motion.div>
          <div className="text-center">
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-black text-white tracking-tight drop-shadow-sm"
            >
              SFB Time Tracker
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm text-blue-100/80 font-medium mt-1"
            >
              Secure Enterprise Portal
            </motion.p>
          </div>
        </div>

        {/* Error Box */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-3 text-sm text-white bg-red-500/80 backdrop-blur-sm border border-red-400/50 rounded-lg flex items-center gap-2 shadow-sm"
          >
            <span className="text-lg">⚠️</span> {error}
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-blue-100 uppercase tracking-widest ml-1">
              Email Address
            </label>
            <div className="relative group">
              <input
                type="email"
                name="email"
                id="email"
                autoComplete="email"
                required
                placeholder="name@company.com"
                className="w-full px-4 py-3.5 bg-white/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/30 transition-all text-white placeholder-blue-100/50 group-hover:bg-white/25"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-blue-100 uppercase tracking-widest ml-1">
              Password
            </label>
            <div className="relative group">
              <input
                type="password"
                name="password"
                id="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full px-4 py-3.5 bg-white/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/30 transition-all text-white placeholder-blue-100/50 group-hover:bg-white/25"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="text-right pr-1">
              <Link href="/forgot-password" className="text-xs font-medium text-blue-200 hover:text-white transition-colors underline-offset-4 hover:underline">
                Forgot Password?
              </Link>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 1)" }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className={`w-full py-4 text-blue-900 font-extrabold text-lg rounded-xl shadow-xl transition-all ${loading ? 'bg-white/70 cursor-not-allowed' : 'bg-white hover:shadow-2xl hover:shadow-white/20'
              }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </span>
            ) : 'Access Portal'}
          </motion.button>
        </form>

        <div className="text-center pt-2">
          <p className="text-[10px] text-blue-200/60 font-medium uppercase tracking-[3px]">
            Secure Connection • v1.0
          </p>
        </div>
      </motion.div>
    </div>
  );
}