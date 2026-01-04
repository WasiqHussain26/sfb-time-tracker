'use client';
import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, addDays, addMonths, subMonths } from 'date-fns';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// --- ICONS ---
const Icons = {
  User: () => <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Calendar: () => <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  ArrowLeft: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>,
  ArrowRight: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>,
  Briefcase: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  List: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
};

export default function UserReportPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  
  const [filterType, setFilterType] = useState<'CUSTOM' | 'MONTH' | 'WEEK_MF' | 'WEEK_SS'>('CUSTOM');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  
  const [activeTab, setActiveTab] = useState<'PROJECTS' | 'TASKS'>('PROJECTS');
  const [reportData, setReportData] = useState<{projects: any[], tasks: any[]} | null>(null);
  
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!userStr || !token) { router.push('/login'); return; }

    const currentUser = JSON.parse(userStr);
    if (currentUser.role === 'EMPLOYEE') {
      setUsers([currentUser]);
      setSelectedUser(currentUser.id.toString());
    } else {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.status === 401 ? [] : res.json())
        .then(data => {
            if(Array.isArray(data) && data.length > 0) {
              setUsers(data);
              setSelectedUser(data[0].id.toString());
            }
        });
    }
  }, []);

  useEffect(() => {
    if(!selectedUser) return;
    const token = localStorage.getItem('token');
    
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/user?userId=${selectedUser}&start=${startDate}&end=${endDate}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : null)
      .then(setReportData)
      .catch(console.error);
  }, [selectedUser, startDate, endDate]);

  const handleFilterChange = (type: 'CUSTOM' | 'MONTH' | 'WEEK_MF' | 'WEEK_SS') => {
    setFilterType(type);
    const today = new Date();

    if (type === 'MONTH') {
      setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
    } 
    else if (type === 'WEEK_MF') {
      const start = startOfWeek(today, { weekStartsOn: 1 });
      setStartDate(format(start, 'yyyy-MM-dd'));
      setEndDate(format(addDays(start, 4), 'yyyy-MM-dd'));
    }
    else if (type === 'WEEK_SS') {
      const sat = startOfWeek(today, { weekStartsOn: 6 }); 
      setStartDate(format(sat, 'yyyy-MM-dd'));
      setEndDate(format(addDays(sat, 1), 'yyyy-MM-dd'));
    }
  };

  const shiftDate = (direction: 'PREV' | 'NEXT') => {
    const start = new Date(startDate);
    if (filterType === 'MONTH') {
      const newDate = direction === 'NEXT' ? addMonths(start, 1) : subMonths(start, 1);
      setStartDate(format(startOfMonth(newDate), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(newDate), 'yyyy-MM-dd'));
    }
    else if (filterType === 'WEEK_MF' || filterType === 'WEEK_SS') {
      const days = direction === 'NEXT' ? 7 : -7;
      setStartDate(format(addDays(new Date(startDate), days), 'yyyy-MM-dd'));
      setEndDate(format(addDays(new Date(endDate), days), 'yyyy-MM-dd'));
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return '0h 0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 font-sans text-slate-900">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">User Report</h1>
        <p className="text-slate-500 mt-1">Detailed breakdown of time distribution.</p>
      </div>

      {/* CONTROLS CARD */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-8 flex flex-wrap items-center gap-6">
         
         {/* User */}
         <div className="flex flex-col gap-1">
             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Icons.User /> Select User</label>
             <select 
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-medium min-w-[200px]"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
             >
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
             </select>
         </div>

         <div className="w-px h-10 bg-slate-100 hidden md:block" />

         {/* Quick Filters */}
         <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
             {['MONTH', 'WEEK_MF', 'WEEK_SS', 'CUSTOM'].map((type: any) => (
                 <button 
                    key={type}
                    onClick={() => handleFilterChange(type)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        filterType === type 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                 >
                    {type === 'WEEK_MF' ? 'Mon-Fri' : type === 'WEEK_SS' ? 'Sat-Sun' : type === 'MONTH' ? 'Month' : 'Custom'}
                 </button>
             ))}
         </div>

         {/* Date Range */}
         <div className="flex items-center gap-2 ml-auto">
             {filterType !== 'CUSTOM' && (
                 <button onClick={() => shiftDate('PREV')} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-blue-600 transition"><Icons.ArrowLeft /></button>
             )}
             <div className="flex items-center border border-slate-200 rounded-lg bg-white px-3 py-2 shadow-sm gap-2">
                 <Icons.Calendar />
                 <input type="date" className="text-sm font-medium text-slate-700 outline-none w-32" value={startDate} onChange={(e) => { setStartDate(e.target.value); setFilterType('CUSTOM'); }} />
                 <span className="text-slate-300">→</span>
                 <input type="date" className="text-sm font-medium text-slate-700 outline-none w-32" value={endDate} onChange={(e) => { setEndDate(e.target.value); setFilterType('CUSTOM'); }} />
             </div>
             {filterType !== 'CUSTOM' && (
                 <button onClick={() => shiftDate('NEXT')} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-blue-600 transition"><Icons.ArrowRight /></button>
             )}
         </div>
      </div>

      {/* MAIN CONTENT Area */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        
        {/* TABS HEADER */}
        <div className="flex border-b border-slate-100">
            <button 
                onClick={() => setActiveTab('PROJECTS')}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                    activeTab === 'PROJECTS' 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
            >
                <Icons.Briefcase /> Project Summary
            </button>
            <button 
                onClick={() => setActiveTab('TASKS')}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                    activeTab === 'TASKS' 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
            >
                <Icons.List /> Task Summary
            </button>
        </div>

        {/* DATA TABLE */}
        <div className="overflow-x-auto">
           <table className="w-full text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider font-bold">
                 <tr>
                    <th className="px-6 py-4">{activeTab === 'PROJECTS' ? 'Project Name' : 'Task Name'}</th>
                    <th className="px-6 py-4 text-center">Tracked Time</th>
                    <th className="px-6 py-4 text-center">Manual Time</th>
                    <th className="px-6 py-4 text-right">Total Time</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                 <AnimatePresence mode='wait'>
                    {((activeTab === 'PROJECTS' ? reportData?.projects : reportData?.tasks) || []).map((item: any, i) => (
                        <motion.tr 
                            key={i}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="hover:bg-blue-50/30 transition-colors group"
                        >
                            <td className="px-6 py-4 font-bold text-slate-700 group-hover:text-blue-700 transition-colors">
                                {item.name}
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className="bg-green-50 text-green-700 font-mono font-bold px-2 py-1 rounded border border-green-100">
                                    {formatTime(item.trackedSeconds)}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className="bg-amber-50 text-amber-700 font-mono font-bold px-2 py-1 rounded border border-amber-100">
                                    {formatTime(item.manualSeconds)}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <span className="bg-slate-100 text-slate-800 font-mono font-bold px-3 py-1.5 rounded-lg border border-slate-200">
                                    {formatTime(item.totalSeconds)}
                                </span>
                            </td>
                        </motion.tr>
                    ))}
                 </AnimatePresence>
                 
                 {(!reportData || (activeTab === 'PROJECTS' ? !reportData.projects?.length : !reportData.tasks?.length)) && (
                     <tr>
                         <td colSpan={4} className="px-6 py-12 text-center">
                             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                                 <Icons.List />
                             </div>
                             <p className="text-slate-400 italic">No data found based on current filters.</p>
                         </td>
                     </tr>
                 )}
              </tbody>
           </table>
        </div>
        
        {/* FOOTER TOTALS */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-6">
            <div className="text-right">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Grand Total</div>
                <div className="text-2xl font-bold text-slate-800 font-mono">
                    {formatTime((reportData?.projects || []).reduce((acc: number, curr: any) => acc + curr.totalSeconds, 0))}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}