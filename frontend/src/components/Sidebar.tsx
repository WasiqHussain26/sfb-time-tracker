'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Sidebar() {
  const router = useRouter();
  const [showReports, setShowReports] = useState(false);
  const [showTimelines, setShowTimelines] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const role = user?.role;
  const isEmployer = role === 'EMPLOYER';
  const isAdmin = role === 'ADMIN';
  const isManager = isEmployer || isAdmin; 

  if (!user) return null;

  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen flex flex-col shadow-xl z-50">
      {/* Brand */}
      <div className="p-6 border-b border-slate-800 flex justify-center items-center">
        {/* Adjusted: w-40 makes it wide, h-auto maintains aspect ratio */}
        <img 
          src="/logo.png" 
          alt="SF Business Solutions" 
          className="w-36 h-auto object-contain" 
        />
      </div>

      {/* Add User Button */}
      {isEmployer && (
        <div className="px-4 py-6">
          <Link href="/dashboard/team">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition flex items-center justify-center gap-2">
              <span>+</span> Add User
            </button>
          </Link>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto mt-4">
        
        {/* 1. SUMMARY */}
        <Link href="/dashboard" className="flex items-center px-4 py-3 rounded text-slate-300 hover:bg-slate-800 hover:text-white transition">
          <span className="mr-3">📊</span> Summary
        </Link>

        {/* 2. TIMELINES DROPDOWN */}
        <div>
          <button 
            onClick={() => setShowTimelines(!showTimelines)}
            className="w-full flex items-center justify-between px-4 py-3 rounded text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            <div className="flex items-center"><span className="mr-3">📅</span> Timelines</div>
            <span className="text-xs">{showTimelines ? '▲' : '▼'}</span>
          </button>
          {showTimelines && (
            <div className="pl-12 pr-2 space-y-1 py-1 bg-slate-900">
              <Link href="/dashboard/timelines/daily" className="block py-2 text-sm text-slate-400 hover:text-white">Daily Overview</Link>
              <Link href="/dashboard/timelines/history" className="block py-2 text-sm text-slate-400 hover:text-white">Employee History</Link>
            </div>
          )}
        </div>

        {/* 3. MANUAL ENTRY (Top Level) */}
        {/* Linking to time-approvals as per your instruction that the code is there */}
        {isEmployer && (
           <Link href="/dashboard/time-approvals" className="flex items-center px-4 py-3 rounded text-slate-300 hover:bg-slate-800 hover:text-white transition">
             <span className="mr-3">✏️</span> Manual Entry
           </Link>
        )}

        {/* 4. MANAGEMENT (Projects/Team) */}
        {isManager && (
          <>
            <Link href="/dashboard/projects" className="flex items-center px-4 py-3 rounded text-slate-300 hover:bg-slate-800 hover:text-white transition">
              <span className="mr-3">💼</span> Projects
            </Link>
            <Link href="/dashboard/team" className="flex items-center px-4 py-3 rounded text-slate-300 hover:bg-slate-800 hover:text-white transition">
              <span className="mr-3">👥</span> Team Members
            </Link>
          </>
        )}

        {/* 5. REPORTS DROPDOWN */}
        <div>
          <button 
            onClick={() => setShowReports(!showReports)}
            className="w-full flex items-center justify-between px-4 py-3 rounded text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            <div className="flex items-center"><span className="mr-3">📑</span> Reports</div>
            <span className="text-xs">{showReports ? '▲' : '▼'}</span>
          </button>
          {showReports && (
            <div className="pl-12 pr-2 space-y-1 py-1 bg-slate-900">
              <Link href="/dashboard/reports/user" className="block py-2 text-sm text-slate-400 hover:text-white">User Report</Link>
              <Link href="/dashboard/reports/timesheets" className="block py-2 text-sm text-slate-400 hover:text-white">Timesheets</Link>
              <Link href="/dashboard/reports/timeline" className="block py-2 text-sm text-slate-400 hover:text-white">User Timeline</Link>
              {isManager && (
                <Link href="/dashboard/reports/project" className="block py-2 text-sm text-slate-400 hover:text-white">Project Report</Link>
              )}
              {isEmployer && (
                <Link href="/dashboard/reports/payroll" className="block py-2 text-sm text-slate-400 hover:text-white">Payroll</Link>
              )}
            </div>
          )}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800 rounded-lg p-4 text-center">
          <p className="text-xs text-slate-400 mb-3">Get the Desktop App</p>
          <a 
            // OPTION A: If hosted in public/downloads folder
            href="/downloads/SF Time Tracker Setup 1.0.0.exe" 
            
            // OPTION B: If hosted on GitHub Releases (Recommended)
            // href="https://github.com/YOUR_USERNAME/REPO/releases/download/v1.0.0/setup.exe"
            
            download // This forces the browser to download instead of open
            className="block w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2 rounded transition shadow-lg flex items-center justify-center gap-2"
          >
            <span>⬇</span> Download Windows
          </a>
        </div>
      </div>

      <div className="p-4 border-t border-slate-800">
        <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300 flex items-center gap-2">
          <span>🚪</span> Logout
        </button>
      </div>
    </div>
  );
}