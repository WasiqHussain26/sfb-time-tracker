'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// --- ICONS ---
const Icons = {
  Dashboard: () => <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  Timelines: () => <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  Entry: () => <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  Projects: () => <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  Team: () => <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  Reports: () => <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  ChevronDown: () => <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>,
  Logout: () => <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  Download: () => <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
};

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({ reports: false, timelines: false });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const toggle = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const role = user?.role;
  const isEmployer = role === 'EMPLOYER';
  const isAdmin = role === 'ADMIN';
  const isManager = isEmployer || isAdmin;

  if (!user) return null;

  const NavItem = ({ href, icon: Icon, label, active }: any) => {
    const isActive = active !== undefined ? active : pathname === href;
    return (
      <Link href={href}>
        <motion.div 
          whileHover={{ x: 5 }}
          className={`flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg transition-all duration-200 cursor-pointer ${
            isActive 
              ? 'bg-blue-600/90 text-white font-semibold' 
              : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
          }`}
        >
          <Icon />
          <span className="truncate text-sm">{label}</span>
        </motion.div>
      </Link>
    );
  };

  const NavGroup = ({ label, icon: Icon, id, children }: any) => {
    const isOpen = expanded[id];
    return (
      <div className="mx-2 mb-1">
        <button 
          onClick={() => toggle(id)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 ${
            isOpen ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/30 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3 truncate">
            <Icon />
            <span className="font-medium text-sm">{label}</span>
          </div>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} className="flex-shrink-0">
            <Icons.ChevronDown />
          </motion.div>
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden ml-4 pl-3 border-l border-slate-700 space-y-1 mt-1"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const SubItem = ({ href, label }: any) => (
    <Link href={href} className="block px-3 py-1.5 text-xs text-slate-500 hover:text-blue-400 hover:bg-slate-800/30 rounded-md transition-colors truncate">
      {label}
    </Link>
  );

  return (
    // FIX: Added 'fixed left-0 top-0 h-screen' to lock sidebar
    <div className="fixed left-0 top-0 h-screen w-64 bg-slate-950 text-slate-200 flex flex-col shadow-2xl z-50 font-sans border-r border-slate-900">
      
      {/* 1. HEADER (Adjusted: Taller h-20 & Larger Logo w-32) */}
      <div className="h-20 flex items-center justify-center border-b border-slate-900 bg-slate-950 flex-shrink-0">
        <img 
          src="/logo.png" 
          alt="SFB Logo" 
          className="w-32 h-auto object-contain brightness-0 invert opacity-90" 
        />
      </div>

      {/* 2. SCROLL AREA */}
      <div className="flex-1 overflow-y-auto py-3 custom-scrollbar">
        {/* ADD USER */}
        {isEmployer && (
          <div className="px-4 mb-3">
            <Link href="/dashboard/team">
              <button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2">
                <span>+</span> Add User
              </button>
            </Link>
          </div>
        )}

        {/* MENUS */}
        <NavItem href="/dashboard" icon={Icons.Dashboard} label="Dashboard" />

        <div className="px-5 mt-3 mb-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Tracking</div>
        <NavGroup id="timelines" label="Timelines" icon={Icons.Timelines}>
          <SubItem href="/dashboard/timelines/daily" label="Daily Overview" />
          <SubItem href="/dashboard/timelines/history" label="Employee History" />
        </NavGroup>

        {isEmployer && (
           <NavItem href="/dashboard/time-approvals" icon={Icons.Entry} label="Manual Entry" />
        )}

        {isManager && (
          <>
            <div className="px-5 mt-3 mb-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Manage</div>
            <NavItem href="/dashboard/projects" icon={Icons.Projects} label="Projects" />
            <NavItem href="/dashboard/team" icon={Icons.Team} label="Team Members" />
          </>
        )}

        <div className="px-5 mt-3 mb-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Analysis</div>
        <NavGroup id="reports" label="Reports" icon={Icons.Reports}>
           <SubItem href="/dashboard/reports/user" label="User Report" />
           <SubItem href="/dashboard/reports/timesheets" label="Timesheets" />
           <SubItem href="/dashboard/reports/timeline" label="User Timeline" />
           {isManager && <SubItem href="/dashboard/reports/project" label="Project Report" />}
           {isEmployer && <SubItem href="/dashboard/reports/payroll" label="Payroll" />}
        </NavGroup>
      </div>

      {/* 3. FOOTER */}
      <div className="p-3 bg-slate-950 border-t border-slate-900 flex-shrink-0">
        <a 
            href="https://github.com/WasiqHussain26/sfb-time-tracker/releases/latest/download/SFB-Time-Tracker-Setup.exe"
            download 
            className="flex items-center justify-center gap-2 w-full py-2 mb-2 text-xs font-semibold text-blue-400 bg-blue-900/10 border border-blue-900/30 rounded-lg hover:bg-blue-900/20 transition-colors"
        >
            <Icons.Download /> Get Desktop App
        </a>

        <button 
          onClick={handleLogout} 
          className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-red-400 transition-colors py-2 text-xs font-bold uppercase tracking-wider"
        >
          <Icons.Logout /> Sign Out
        </button>
      </div>
    </div>
  );
}