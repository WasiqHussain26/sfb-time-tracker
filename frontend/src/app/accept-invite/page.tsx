'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return toast.error("Invalid or missing invitation token.");

    if (password.length < 6) return toast.error("Password must be at least 6 characters.");

    setLoading(true);
    const toastId = toast.loading("Setting up your account...");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/accept-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        toast.success("Welcome aboard! Redirecting...", { id: toastId });
        setTimeout(() => router.push('/login'), 1500);
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to set password. Link may be expired.", { id: toastId });
        setLoading(false);
      }
    } catch (err) {
      toast.error("Network error. Please try again.", { id: toastId });
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 font-medium">
        Invalid or missing invitation link.
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 p-4 font-sans">
      <Toaster position="top-center" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden"
      >
        {/* Decor */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10" />

        <div className="text-center mb-8 relative z-10">
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome to the Team</h1>
          <p className="text-blue-200 text-sm">Create your password to activate your account</p>
        </div>

        <form onSubmit={handleAccept} className="space-y-6 relative z-10">
          <div>
            <label className="block text-xs font-bold text-blue-200 uppercase mb-2 ml-1">New Password</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-blue-300/50 outline-none focus:bg-white/20 focus:border-blue-400 transition-all shadow-inner"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-blue-600 py-3.5 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg shadow-black/10 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : "Set Password & Login"}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-blue-300/60 font-medium">
          SFB Time Tracker • Enterprise Access
        </div>
      </motion.div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-blue-900 flex items-center justify-center text-white">Loading...</div>
    }>
      <AcceptInviteForm />
    </Suspense>
  );
}