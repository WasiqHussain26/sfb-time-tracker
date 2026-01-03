'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast.error("Invalid or expired reset link.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        toast.success("Password reset successfully! Redirecting to login...");
        setTimeout(() => router.push('/login'), 2000);
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to reset password.");
        setLoading(false);
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center p-10 bg-white rounded-xl shadow-md">
        <h2 className="text-red-500 font-bold">Invalid Link</h2>
        <p className="text-gray-500 text-sm">This reset link is broken or has expired.</p>
        <button onClick={() => router.push('/login')} className="mt-4 text-blue-600 underline">Back to Login</button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl border border-gray-100"
    >
      <div className="flex flex-col items-center space-y-2">
        <Image src="/logo.png" alt="Logo" width={60} height={60} />
        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Set New Password</h2>
        <p className="text-sm text-gray-500 text-center">
          Please enter your new secure password below.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1">
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">New Password</label>
          <input
            type="password"
            required
            placeholder="••••••••"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Confirm New Password</label>
          <input
            type="password"
            required
            placeholder="••••••••"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading}
          className={`w-full py-4 text-white font-bold rounded-xl shadow-lg transition-all ${
            loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'Updating...' : 'Reset Password'}
        </motion.button>
      </form>
    </motion.div>
  );
}

// Next.js requires Suspense for useSearchParams()
export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] p-4">
      <Suspense fallback={<div className="text-blue-600 animate-pulse font-bold">Loading Security Gateway...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}