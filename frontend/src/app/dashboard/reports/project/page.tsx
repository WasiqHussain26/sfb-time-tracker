'use client';
import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, addDays, addMonths, subMonths } from 'date-fns';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const Icons = {
  Project: () => <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
  Calendar: () => <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  ArrowLeft: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>,
  ArrowRight: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
};

export default function ProjectReportPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  
  const [filterType, setFilterType] = useState<'CUSTOM' | 'MONTH' | 'WEEK_MF' | 'WEEK_SS'>('CUSTOM');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  
  const [activeTab, setActiveTab] = useState<'TASKS' | 'USERS'>('TASKS');
  const [reportData, setReportData] = useState<{tasks: any[], users: any[]} | null>({ tasks: [], users: [] });
  
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.status === 401 ? [] : res.json())
      .then(data => {
        if(Array.isArray(data) && data.length > 0) {
          setProjects(data);
          setSelectedProject(data[0].id); 
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if(!selectedProject) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/project?projectId=${selectedProject}&start=${startDate}&end=${endDate}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && (Array.isArray(data.tasks) || Array.isArray(data.users))) {
            setReportData({ tasks: data.tasks || [], users: data.users || [] });
        } else {
            setReportData({ tasks: [], users: [] });
        }
      })
      .catch(() => setReportData({ tasks: [], users: [] }));
  }, [selectedProject, startDate, endDate]);

  const handleFilterChange = (type: any) => {
    setFilterType(type);
    const today = new Date();
    if (type === 'MONTH') {
      setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
    } else if (type === 'WEEK_MF') {
      const start = startOfWeek(today, { weekStartsOn: 1 });
      setStartDate(format(start, 'yyyy-MM-dd'));
      setEndDate(format(addDays(start, 4), 'yyyy-MM-dd'));
    } else if (type === 'WEEK_SS') {
      const sat = startOfWeek(today, { weekStartsOn: 6 });
      setStartDate(format(sat, 'yyyy-MM-dd'));
      setEndDate(format(addDays(sat, 1), 'yyyy-MM-dd'));
    }
  };

  const shiftDate = (direction: 'PREV' | 'NEXT') => {
    const start = new Date(startDate);
    const days = direction === 'NEXT' ? (filterType === 'MONTH' ? 30 : 7) : (filterType === 'MONTH' ? -30 : -7);
    if(filterType === 'MONTH') {
        const newDate = direction === 'NEXT' ? addMonths(start, 1) : subMonths(start, 1);
        setStartDate(format(startOfMonth(newDate), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(newDate), 'yyyy-MM-dd'));
    } else {
        setStartDate(format(addDays(new Date(startDate), days), 'yyyy-MM-dd'));
        setEndDate(format(addDays(new Date(endDate), days), 'yyyy-MM-dd'));
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 font-sans">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Project Report</h1>
        <p className="text-slate-500 mt-1">Analyze time distribution across project tasks and team members.</p>
      </div>

      {/* CONTROLS */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-8 flex flex-wrap items-center gap-6">
         {/* Project Selector */}
         <div className="flex flex-col gap-1">
             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Icons.Project /> Select Project</label>
             <select 
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-medium min-w-[200px]"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
             >
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
             </select>
         </div>

         <div className="w-px h-10 bg-slate-100 hidden md:block" />

         {/* Filters */}
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

      {/* CONTENT */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
         {/* TABS */}
         <div className="flex border-b border-slate-100">
            <button 
                onClick={() => setActiveTab('TASKS')}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors border-b-2 ${
                    activeTab === 'TASKS' ? 'border-blue-600 text-blue-600 bg-blue-50/20' : 'border-transparent text-slate-400 hover:bg-slate-50'
                }`}
            >
                Tasks Overview
            </button>
            <button 
                onClick={() => setActiveTab('USERS')}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors border-b-2 ${
                    activeTab === 'USERS' ? 'border-purple-600 text-purple-600 bg-purple-50/20' : 'border-transparent text-slate-400 hover:bg-slate-50'
                }`}
            >
                Team Contributions
            </button>
         </div>

         <div className="p-0">
             <table className="w-full text-left">
               <thead className="bg-slate-50/80 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider font-bold">
                 <tr>
                   <th className="px-6 py-4">{activeTab === 'TASKS' ? 'Task Name' : 'Team Member'}</th>
                   <th className="px-6 py-4 text-right">Time Logged</th>
                   <th className="px-6 py-4 text-left w-1/3">Analysis</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 text-sm">
                 {(activeTab === 'TASKS' ? (reportData?.tasks || []) : (reportData?.users || [])).map((item, idx) => {
                    const max = Math.max(...(activeTab === 'TASKS' ? (reportData?.tasks || []) : (reportData?.users || [])).map((i: any) => i.seconds));
                    const percentage = max > 0 ? (item.seconds / max) * 100 : 0;
                    
                    return (
                        <motion.tr 
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="hover:bg-slate-50/50 transition-colors"
                        >
                            <td className="px-6 py-4 font-bold text-slate-700">{item.name}</td>
                            <td className="px-6 py-4 text-right">
                                <span className={`font-mono font-bold px-3 py-1.5 rounded-lg border ${
                                    activeTab === 'TASKS' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-purple-50 text-purple-700 border-purple-100'
                                }`}>
                                    {formatTime(item.seconds)}
                                </span>
                            </td>
                            <td className="px-6 py-4 align-middle">
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentage}%` }}
                                        className={`h-full rounded-full ${activeTab === 'TASKS' ? 'bg-blue-500' : 'bg-purple-500'}`}
                                    />
                                </div>
                            </td>
                        </motion.tr>
                    );
                 })}
                 {((activeTab === 'TASKS' && (!reportData?.tasks || reportData.tasks.length === 0)) || (activeTab === 'USERS' && (!reportData?.users || reportData.users.length === 0))) && (
                    <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">No data recorded for this period.</td></tr>
                 )}
               </tbody>
             </table>
         </div>
      </div>
    </div>
  );
}