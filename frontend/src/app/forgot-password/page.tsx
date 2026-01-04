'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (res.ok) {
        setStatus('success');
        setMessage('Reset link sent! Check your inbox.');
        setEmail(''); // Clear input on success
      } else {
        throw new Error('Failed to send link. Please try again.');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 overflow-hidden relative">
      
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/30 blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/30 blur-[100px] animate-pulse" />

      {/* GLASS CARD */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
        className="w-full max-w-md p-8 space-y-6 bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 relative z-10"
      >
        <div className="text-center space-y-2">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/10 border border-white/20 mb-2"
          >
            <span className="text-2xl">🔐</span>
          </motion.div>
          
          <h2 className="text-2xl font-black text-white tracking-tight">
            Reset Password
          </h2>
          <p className="text-sm text-blue-100/80 font-medium">
            Enter your email to receive recovery instructions
          </p>
        </div>

        {/* Status Messages (Replaces Alert) */}
        {status === 'success' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-3 text-sm text-green-900 bg-green-100/90 backdrop-blur-sm border border-green-200 rounded-lg flex items-center gap-2 shadow-sm font-semibold"
          >
            <span>✅</span> {message}
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-3 text-sm text-white bg-red-500/80 backdrop-blur-sm border border-red-400/50 rounded-lg flex items-center gap-2 shadow-sm"
          >
            <span>⚠️</span> {message}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-blue-100 uppercase tracking-widest ml-1">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="name@company.com"
              className="w-full px-4 py-3.5 bg-white/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/30 transition-all text-white placeholder-blue-100/50 hover:bg-white/25"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 1)" }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className={`w-full py-4 text-blue-900 font-extrabold text-lg rounded-xl shadow-xl transition-all ${
              loading ? 'bg-white/70 cursor-not-allowed' : 'bg-white hover:shadow-2xl hover:shadow-white/20'
            }`}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </motion.button>
        </form>

        <div className="text-center pt-2">
          <Link 
            href="/login" 
            className="text-sm font-bold text-blue-200 hover:text-white transition-colors flex items-center justify-center gap-1 group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Login
          </Link>
        </div>

      </motion.div>
    </div>
  );
}