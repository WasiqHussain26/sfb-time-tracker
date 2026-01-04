'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');

    if (!token) {
      setStatus('error');
      setMessage("Invalid or missing reset token.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setStatus('error');
      setMessage("Passwords do not match!");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        setStatus('success');
        setMessage("Password reset successful! Redirecting...");
        setTimeout(() => router.push('/login'), 2000);
      } else {
        const data = await res.json();
        throw new Error(data.message || "Failed to reset password.");
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || "Network error. Please try again.");
    } finally {
      if (status !== 'success') setLoading(false);
    }
  };

  // INVALID LINK STATE (Glassmorphism)
  if (!token) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-8 bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 text-center space-y-4"
      >
        <div className="text-4xl">⚠️</div>
        <h2 className="text-xl font-bold text-white">Invalid Link</h2>
        <p className="text-blue-100/80 text-sm">This reset link is broken or has expired.</p>
        <button 
          onClick={() => router.push('/login')} 
          className="text-white font-bold underline hover:text-blue-200 transition-colors"
        >
          Return to Login
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md p-8 space-y-6 bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 relative z-10"
    >
      <div className="flex flex-col items-center space-y-2">
         <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="p-3 bg-white/10 rounded-full border border-white/10 mb-2"
          >
            <Image 
              src="/logo.png" 
              alt="Logo" 
              width={50} 
              height={50} 
              className="object-contain brightness-0 invert"
            />
          </motion.div>
        <h2 className="text-2xl font-black text-white tracking-tight">Set New Password</h2>
        <p className="text-sm text-blue-100/80 font-medium text-center">
          Create a secure password for your account
        </p>
      </div>

       {/* Status Messages */}
       {status === 'success' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-3 text-sm text-green-900 bg-green-100/90 backdrop-blur-sm border border-green-200 rounded-lg flex items-center gap-2 shadow-sm font-bold"
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

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="block text-xs font-bold text-blue-100 uppercase tracking-widest ml-1">New Password</label>
          <input
            type="password"
            required
            placeholder="••••••••"
            className="w-full px-4 py-3.5 bg-white/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/30 transition-all text-white placeholder-blue-100/50"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-blue-100 uppercase tracking-widest ml-1">Confirm Password</label>
          <input
            type="password"
            required
            placeholder="••••••••"
            className="w-full px-4 py-3.5 bg-white/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/30 transition-all text-white placeholder-blue-100/50"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
           {loading ? 'Updating...' : 'Reset Password'}
        </motion.button>
      </form>
    </motion.div>
  );
}

// WRAPPER (Required for Next.js Suspense)
export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 overflow-hidden relative">
       {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/30 blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/30 blur-[100px] animate-pulse" />
      
      <Suspense fallback={<div className="text-white animate-pulse font-bold tracking-widest">LOADING SECURE GATEWAY...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}