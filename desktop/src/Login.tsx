import { useState } from 'react';

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
      const res = await fetch('http://127.0.0.1:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Double Check Status just in case
        if (data.user.status === 'DISABLED') {
            setError("Your account is inactive. Please contact your administrator.");
            setLoading(false);
            return;
        }

        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLoginSuccess(data.user, data.access_token);
      } else {
        // Handle Inactive Account Error specifically
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
    <div className="h-screen w-screen bg-[#f0f2f5] flex items-center justify-center p-4">
      {/* Main Card */}
      <div className="bg-white w-full h-full max-h-[500px] shadow-lg rounded-lg flex flex-col overflow-hidden border border-gray-200">
        
        {/* Blue Header Bar */}
        <div className="bg-[#2563eb] p-4 text-center shadow-sm">
          <h1 className="text-white font-bold text-lg tracking-wide">SF Business Solutions</h1>
          <p className="text-blue-100 text-xs mt-1">Time Tracker</p>
        </div>

        {/* Form Container */}
        <div className="flex-1 p-6 flex flex-col justify-center gap-5">
          
          <div className="text-center mb-2">
            <h2 className="text-gray-800 font-semibold text-lg">Welcome Back</h2>
            <p className="text-gray-400 text-xs">Please sign in to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Email</label>
              <input 
                type="email" 
                required
                className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="name@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Password</label>
              <input 
                type="password" 
                required
                className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-xs p-2.5 rounded border border-red-100 text-center font-medium">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-3 rounded shadow-md hover:shadow-lg transition-all transform active:scale-95 text-sm mt-2"
            >
              {loading ? 'Connecting...' : 'LOGIN'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-3 text-center border-t border-gray-100">
          <p className="text-[10px] text-gray-400">Secure Client v1.0.0</p>
        </div>
      </div>
    </div>
  );
}