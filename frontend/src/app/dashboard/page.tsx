'use client';
import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths, addWeeks, addDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

// --- TYPES ---
type ViewMode = 'CUSTOM' | 'MONTH' | 'MON-FRI' | 'SAT-SUN';
type Tab = 'EMPLOYEE' | 'PROJECT' | 'TASK';

export default function DashboardSummary() {
  // STATE
  const [activeTab, setActiveTab] = useState<Tab>('EMPLOYEE');
  const [viewMode, setViewMode] = useState<ViewMode>('MONTH');
  
  // Date State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // Data
  const [summaryData, setSummaryData] = useState<{ employees: any[], projects: any[], tasks: any[] }>({ 
    employees: [], projects: [], tasks: [] 
  });
  
  // User
  const [userRole, setUserRole] = useState('');
  const [userId, setUserId] = useState('');
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // --- INIT & LOGIC (Kept same as original for safety) ---
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!token || !userStr) { router.push('/login'); return; }
    const u = JSON.parse(userStr);
    setUserRole(u.role);
    setUserId(u.id);
    setIsUserLoaded(true);
  }, []);

  useEffect(() => {
    let s = new Date(); let e = new Date();
    if (viewMode === 'MONTH') { s = startOfMonth(currentDate); e = endOfMonth(currentDate); }
    else if (viewMode === 'MON-FRI') { s = startOfWeek(currentDate, { weekStartsOn: 1 }); e = addDays(s, 4); }
    else if (viewMode === 'SAT-SUN') { s = addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 5); e = addDays(s, 1); }
    else if (viewMode === 'CUSTOM') return;
    setStartDate(format(s, 'yyyy-MM-dd'));
    setEndDate(format(e, 'yyyy-MM-dd'));
  }, [viewMode, currentDate]);

  const handleNavigate = (direction: 'PREV' | 'NEXT') => {
    if (viewMode === 'CUSTOM') return;
    const modifier = direction === 'NEXT' ? 1 : -1;
    let newDate = new Date(currentDate);
    if (viewMode === 'MONTH') newDate = addMonths(currentDate, modifier);
    else newDate = addWeeks(currentDate, modifier);
    setCurrentDate(newDate);
  };

  useEffect(() => {
    if (!startDate || !endDate || !isUserLoaded) return;
    if (userRole === 'EMPLOYEE' && !userId) return;

    const fetchData = async () => {
        setIsLoading(true);
        const token = localStorage.getItem('token'); 
        const queryId = userRole === 'EMPLOYEE' ? `&userId=${userId}` : '';
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/summary?start=${startDate}&end=${endDate}${queryId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.status === 401) { router.push('/login'); return; }
            if (res.ok) {
                const data = await res.json();
                setSummaryData({
                    employees: Array.isArray(data.employees) ? data.employees : [],
                    projects: Array.isArray(data.projects) ? data.projects : [],
                    tasks: Array.isArray(data.tasks) ? data.tasks : []
                });
            } else { setSummaryData({ employees: [], projects: [], tasks: [] }); }
        } catch (e) { setSummaryData({ employees: [], projects: [], tasks: [] }); } 
        finally { setIsLoading(false); }
    };
    fetchData();
  }, [startDate, endDate, userRole, userId, isUserLoaded]);

  const fmtTime = (s: number) => {
    if (!s) return '00:00';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // --- RENDER ---
  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen space-y-8 font-sans text-slate-900">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard Overview</h1>
           <p className="text-slate-500 mt-1">Track performance, timelines, and hours.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
            {/* View Mode Pills */}
            <div className="flex bg-slate-100 rounded-lg p-1">
               {['MONTH', 'MON-FRI', 'SAT-SUN', 'CUSTOM'].map(mode => (
                   <button 
                     key={mode} 
                     onClick={() => setViewMode(mode as any)}
                     className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                         viewMode === mode 
                         ? 'bg-white text-blue-700 shadow-sm' 
                         : 'text-slate-500 hover:text-slate-700'
                     }`}
                   >
                     {mode}
                   </button>
               ))}
            </div>
            
            <div className="h-6 w-px bg-slate-200 mx-2" />

             {/* Date Nav */}
            <div className="flex items-center gap-2">
                <button onClick={() => handleNavigate('PREV')} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="flex items-center gap-2 px-2">
                   <div className="relative">
                     <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">📅</span>
                     <input type="date" value={startDate} onChange={(e) => { setViewMode('CUSTOM'); setStartDate(e.target.value); }} className="pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" />
                   </div>
                   <span className="text-slate-400 text-sm font-medium">to</span>
                   <div className="relative">
                     <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">📅</span>
                     <input type="date" value={endDate} onChange={(e) => { setViewMode('CUSTOM'); setEndDate(e.target.value); }} className="pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" />
                   </div>
                </div>
                <button onClick={() => handleNavigate('NEXT')} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
            
            <button onClick={() => window.location.reload()} className="ml-2 p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Refresh Data">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
        </div>
      </div>

      {/* TABS & CARD */}
      <div className="space-y-4">
        {/* Modern Tabs */}
        <div className="flex gap-1 bg-slate-200/50 p-1 rounded-xl w-fit">
           {['EMPLOYEE', 'PROJECT', 'TASK'].map((tab) => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab as Tab)}
               className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
                 activeTab === tab 
                 ? 'bg-white text-blue-700 shadow-md' 
                 : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
               }`}
             >
                <span>{tab === 'EMPLOYEE' ? '👥' : tab === 'PROJECT' ? '💼' : '📝'}</span>
                {tab.charAt(0) + tab.slice(1).toLowerCase()} Summary
             </button>
           ))}
        </div>

        {/* MAIN DATA CARD */}
        <motion.div 
            layout
            className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
        >
           {isLoading ? (
                <div className="p-20 text-center flex flex-col items-center justify-center">
                    <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <p className="text-slate-400 font-medium animate-pulse">Retrieving analytics...</p>
                </div>
           ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/80 border-b border-slate-100">
                            <tr>
                                <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider w-1/3">
                                    {activeTab === 'EMPLOYEE' ? 'Employee Name' : activeTab === 'PROJECT' ? 'Project Name' : 'Task Name'}
                                </th>
                                {activeTab === 'TASK' && <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Project Scope</th>}
                                <th className="p-5 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Tracker Time</th>
                                <th className="p-5 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Manual Entry</th>
                                <th className="p-5 text-right text-xs font-bold text-blue-600 uppercase tracking-wider">Total Hours</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {/* EMPLOYEES */}
                            {activeTab === 'EMPLOYEE' && summaryData.employees?.map(emp => (
                                <tr key={emp.id} className="group hover:bg-blue-50/30 transition-colors">
                                    <td className="p-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-200">
                                                {emp.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">{emp.name}</div>
                                                <div className="text-xs text-slate-400">{emp.email || 'Team Member'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-5 text-center">
                                        <div className="inline-block px-3 py-1 rounded-full bg-emerald-100/50 text-emerald-700 text-xs font-bold border border-emerald-100">
                                            {fmtTime(emp.totalSeconds)}
                                        </div>
                                    </td>
                                    <td className="p-5 text-center text-amber-600 font-medium text-sm">{fmtTime(emp.manualSeconds)}</td>
                                    <td className="p-5 text-right font-black text-slate-800 text-base">{fmtTime(emp.totalSeconds)}</td>
                                </tr>
                            ))}

                            {/* PROJECTS */}
                            {activeTab === 'PROJECT' && summaryData.projects?.map(proj => (
                                <tr key={proj.id} className="group hover:bg-blue-50/30 transition-colors">
                                    <td className="p-5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100/50 rounded-lg text-blue-600">
                                               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                            </div>
                                            <span className="font-bold text-slate-700 group-hover:text-blue-700">{proj.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-5 text-center"><span className="text-emerald-600 font-semibold text-sm">{fmtTime(proj.totalSeconds)}</span></td>
                                    <td className="p-5 text-center text-amber-600 font-medium text-sm">{fmtTime(proj.manualSeconds)}</td>
                                    <td className="p-5 text-right font-bold text-slate-800">{fmtTime(proj.totalSeconds)}</td>
                                </tr>
                            ))}

                            {/* TASKS */}
                            {activeTab === 'TASK' && summaryData.tasks?.map(task => (
                                <tr key={task.id} className="group hover:bg-blue-50/30 transition-colors">
                                    <td className="p-5 font-bold text-slate-700 group-hover:text-blue-700">{task.name}</td>
                                    <td className="p-5 text-sm text-slate-500 font-medium bg-slate-50/50">{task.projectName}</td>
                                    <td className="p-5 text-center text-emerald-600 font-medium">{fmtTime(task.totalSeconds)}</td>
                                    <td className="p-5 text-center text-amber-600 font-medium">{fmtTime(task.manualSeconds)}</td>
                                    <td className="p-5 text-right font-bold text-slate-800">{fmtTime(task.totalSeconds)}</td>
                                </tr>
                            ))}

                            {/* EMPTY STATES */}
                            {((activeTab === 'EMPLOYEE' && summaryData.employees?.length === 0) || 
                              (activeTab === 'PROJECT' && summaryData.projects?.length === 0) || 
                              (activeTab === 'TASK' && summaryData.tasks?.length === 0)) && (
                                <tr>
                                    <td colSpan={6} className="p-16 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-50">
                                            <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            <p className="text-slate-500 font-medium text-lg">No activity found for this period.</p>
                                            <p className="text-sm text-slate-400">Try adjusting the date range above.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
           )}
        </motion.div>
      </div>
    </div>
  );
}