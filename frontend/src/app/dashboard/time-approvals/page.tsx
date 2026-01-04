'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// --- ICONS ---
const Icons = {
  Calendar: () => <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  Clock: () => <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  User: () => <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Project: () => <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  Save: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
};

export default function ManualEntryPage() {
  const router = useRouter();
  
  // --- STATE ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [reason, setReason] = useState('');

  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [manualEntries, setManualEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // --- INITIAL LOAD ---
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!userStr || !token) { router.push('/login'); return; }
    
    const u = JSON.parse(userStr);
    setCurrentUser(u);

    if (u.role !== 'EMPLOYER') return;

    // Parallel Fetch
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json())
    ]).then(([usersData, projectsData]) => {
      setUsers(usersData);
      setProjects(projectsData);
      if (usersData.length > 0) setSelectedUserId(usersData[0].id);
      if (projectsData.length > 0) setSelectedProject(projectsData[0].id);
      setIsDataLoaded(true);
    });
  }, []);

  // --- FETCH TASKS ---
  useEffect(() => {
    setSelectedTask('');
    setTasks([]);
    if (!selectedProject) return;
    const token = localStorage.getItem('token');
    
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${selectedProject}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        const all = data.tasks || [];
        // Filter tasks for selected user
        const valid = all.filter((t: any) => t.isOpenToAll || t.assignees?.some((u: any) => u.id === Number(selectedUserId)));
        setTasks(valid);
        if (valid.length > 0) setSelectedTask(valid[0].id);
      });
  }, [selectedProject, selectedUserId]);

  // --- FETCH ENTRIES ---
  useEffect(() => {
    if (!selectedUserId) return;
    fetchEntries();
  }, [selectedUserId, date]);

  const fetchEntries = async () => {
    const token = localStorage.getItem('token');
    try {
      // Note: Assuming endpoint supports filtering by date/user, or returns a list we can filter
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/timeline?userId=${selectedUserId}&date=${date}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setManualEntries(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  // --- SUBMIT ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return toast.error("Please select a task first.");
    if (startTime >= endTime) return toast.error("Start time must be before end time.");

    setLoading(true);
    const toastId = toast.loading('Adding time entry...');
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/time-tracking/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userId: Number(selectedUserId),
          taskId: Number(selectedTask),
          startTime: new Date(`${date}T${startTime}:00`).toISOString(),
          endTime: new Date(`${date}T${endTime}:00`).toISOString(),
          reason 
        })
      });

      if (res.ok) {
        toast.success("Entry added!", { id: toastId });
        fetchEntries(); 
        setReason('');
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to add.", { id: toastId });
      }
    } catch (error) { 
        toast.error("Network error.", { id: toastId });
    } finally {
        setLoading(false);
    }
  };

  const getDuration = (s: string, e: string) => {
    const diff = new Date(e).getTime() - new Date(s).getTime();
    if (diff <= 0) return "00:00";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  if (!currentUser || currentUser.role !== 'EMPLOYER') return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 font-sans text-slate-900">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Manual Time Entry</h1>
        <p className="text-slate-500 mt-1">Add retroactive time logs for your team members.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* LEFT: ENTRY FORM */}
        <div className="xl:col-span-4 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
          >
            <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"/>
                New Entry Details
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              {/* 1. EMPLOYEE & DATE */}
              <div className="space-y-4">
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                        <Icons.User /> Employee Name
                    </label>
                    <div className="relative">
                        <select 
                            className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 hover:bg-white"
                            value={selectedUserId} 
                            onChange={e => setSelectedUserId(e.target.value)}
                        >
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                    </div>
                 </div>

                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                        <Icons.Calendar /> Date of Entry
                    </label>
                    <input 
                        type="date" 
                        required 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-700" 
                        value={date} 
                        onChange={e => setDate(e.target.value)} 
                    />
                 </div>
              </div>

               <div className="h-px bg-slate-100 my-2" />

              {/* 2. TIME RANGE */}
              <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                      <Icons.Clock /> Time Duration
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                      <div>
                          <input 
                              type="time" 
                              required 
                              className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium text-slate-700 text-center" 
                              value={startTime} 
                              onChange={e => setStartTime(e.target.value)} 
                          />
                          <div className="text-[10px] text-center text-slate-400 mt-1 font-medium">Start Time</div>
                      </div>
                      <div>
                          <input 
                              type="time" 
                              required 
                              className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium text-slate-700 text-center" 
                              value={endTime} 
                              onChange={e => setEndTime(e.target.value)} 
                          />
                          <div className="text-[10px] text-center text-slate-400 mt-1 font-medium">End Time</div>
                      </div>
                  </div>
              </div>

              <div className="h-px bg-slate-100 my-2" />

              {/* 3. PROJECT & TASK */}
              <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                        <Icons.Project /> Project & Scope
                    </label>
                    <div className="relative mb-3">
                        <select 
                            className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium text-slate-700 hover:bg-white"
                            value={selectedProject} 
                            onChange={e => setSelectedProject(e.target.value)}
                        >
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                    </div>
                    
                    <div className="relative">
                        <select 
                            className={`w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium ${tasks.length === 0 ? 'text-slate-400 italic' : 'text-slate-700'} hover:bg-white`}
                            value={selectedTask} 
                            onChange={e => setSelectedTask(e.target.value)}
                            disabled={tasks.length === 0}
                        >
                            {tasks.length === 0 ? <option>No tasks available</option> : tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                    </div>
                  </div>

                  <textarea 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm min-h-[80px]" 
                    placeholder="Reason for manual entry (Optional)" 
                    value={reason} 
                    onChange={e => setReason(e.target.value)} 
                  />
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                disabled={loading || !selectedTask} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 transition-all mt-2"
              >
                {loading ? (
                    <span className="animate-pulse">Processing...</span>
                ) : (
                    <>
                        <Icons.Save /> Confirm Entry
                    </>
                )}
              </motion.button>
            </form>
          </motion.div>
        </div>

        {/* RIGHT: LIVE LOGS */}
        <div className="xl:col-span-8">
           <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
              <div className="bg-slate-50/80 px-8 py-6 border-b border-slate-100 flex items-center justify-between backdrop-blur-sm">
                  <div>
                      <h2 className="text-xl font-bold text-slate-800">Timeline Activity</h2>
                      <p className="text-sm text-slate-500">Showing logs for <span className="font-semibold text-slate-800">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span></p>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm font-bold text-slate-700">{users.find(u => u.id == selectedUserId)?.name || 'Loading...'}</span>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#FAFAFA]">
                 <AnimatePresence>
                     {manualEntries.length === 0 ? (
                         <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }}
                            className="h-64 flex flex-col items-center justify-center text-slate-400"
                         >
                             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <Icons.Clock />
                             </div>
                             <p className="font-medium">No activity recorded for this date.</p>
                         </motion.div>
                     ) : (
                         manualEntries.map((entry, index) => (
                             <motion.div 
                                key={entry.id || index}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`group p-5 rounded-xl border flex items-center justify-between transition-all hover:shadow-md ${
                                    entry.isManual 
                                    ? 'bg-amber-50/50 border-amber-100 hover:border-amber-200' 
                                    : 'bg-white border-slate-100 hover:border-blue-200'
                                }`}
                             >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shadow-sm ${
                                        entry.isManual ? 'bg-amber-100 text-amber-600' : 'bg-blue-50 text-blue-600'
                                    }`}>
                                        {entry.isManual ? '✏️' : '⏱️'}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-base">{entry.task?.name || 'Unknown Task'}</div>
                                        <div className="flex items-center gap-2 text-xs font-medium mt-0.5">
                                            <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">
                                                {entry.task?.project?.name || 'No Project'}
                                            </span>
                                            {entry.reason && (
                                                <span className="text-amber-600/80 italic flex items-center gap-1">
                                                    - "{entry.reason}"
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="font-mono font-bold text-slate-800 text-lg">
                                        {new Date(entry.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                        <span className="text-slate-300 mx-2">→</span>
                                        {entry.endTime ? new Date(entry.endTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : <span className="text-green-500 animate-pulse">Active</span>}
                                    </div>
                                    <div className={`text-xs font-bold mt-1 ${entry.isManual ? 'text-amber-600' : 'text-blue-600'}`}>
                                        {entry.endTime ? getDuration(entry.startTime, entry.endTime) : 'Running Now'}
                                    </div>
                                </div>
                             </motion.div>
                         ))
                     )}
                 </AnimatePresence>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}