'use client';
import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, addDays, addMonths, subMonths } from 'date-fns';
import { motion } from 'framer-motion';

const Icons = {
    User: () => <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    Download: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
    Back: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
};

export default function TimesheetsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [timesheetData, setTimesheetData] = useState<any[]>([]);

  const [filterType, setFilterType] = useState<'CUSTOM' | 'MONTH' | 'WEEK_MF' | 'WEEK_SS'>('CUSTOM');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  useEffect(() => {
    const fetchUsers = async () => {
        const userStr = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (!userStr || !token) return;
        
        const currentUser = JSON.parse(userStr);
        if (currentUser.role === 'EMPLOYEE') {
            setUsers([currentUser]);
            setSelectedUser(currentUser);
        } else {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
                const data = await res.json();
                setUsers(Array.isArray(data) ? data : []);
            } catch (err) { console.error(err); }
        }
    };
    fetchUsers();
  }, []);

  const loadTimesheet = async (user: any) => {
    const targetUser = user || selectedUser;
    if (!targetUser) return;
    if (user) setSelectedUser(user);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/timesheet?userId=${targetUser.id}&start=${startDate}&end=${endDate}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setTimesheetData(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (selectedUser) loadTimesheet(null); }, [startDate, endDate, selectedUser]);

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

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  };

  const downloadCSV = () => {
    if (!timesheetData.length) return;
    let csvContent = "data:text/csv;charset=utf-8,Date,Punch In,Punch Out,Total Duration,Notes\n";
    timesheetData.forEach(row => {
      const duration = (row.duration / 3600).toFixed(2) + " hours";
      const cleanNotes = row.notes ? `"${row.notes.replace(/"/g, '""')}"` : "";
      csvContent += `${row.date},${format(new Date(row.in), 'HH:mm:ss')},${format(new Date(row.out), 'HH:mm:ss')},${duration},${cleanNotes}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedUser.name}_timesheet.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 font-sans">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Timesheets</h1>
        <p className="text-slate-500 mt-1">Exportable attendance and work hour records.</p>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-8 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
           {['MONTH', 'WEEK_MF', 'WEEK_SS', 'CUSTOM'].map((type: any) => (
             <button key={type} onClick={() => handleFilterChange(type)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === type ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{type === 'WEEK_MF' ? 'Mon-Fri' : type === 'WEEK_SS' ? 'Sat-Sun' : type === 'MONTH' ? 'Month' : 'Custom'}</button>
           ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
           <input type="date" className="border rounded px-2 py-1 text-sm outline-none" value={startDate} onChange={(e) => {setStartDate(e.target.value); setFilterType('CUSTOM');}} />
           <span className="text-slate-400">to</span>
           <input type="date" className="border rounded px-2 py-1 text-sm outline-none" value={endDate} onChange={(e) => {setEndDate(e.target.value); setFilterType('CUSTOM');}} />
        </div>
      </div>

      {!selectedUser ? (
        /* USER GRID */
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
           {users.map((user, i) => (
               <motion.button 
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => loadTimesheet(user)}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-200 transition-all text-left group"
               >
                   <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                       <span className="font-bold text-lg">{user.name.charAt(0)}</span>
                   </div>
                   <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-600">{user.name}</h3>
                   <p className="text-xs text-slate-500 uppercase font-bold mt-1">{user.role}</p>
                   <div className="mt-4 text-xs font-bold text-blue-500 flex items-center gap-1">View Timesheet →</div>
               </motion.button>
           ))}
        </div>
      ) : (
        /* DETAIL VIEW */
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
           <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div className="flex items-center gap-4">
                   {users.length > 1 && (
                       <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-white rounded-lg text-slate-500 transition shadow-sm border border-transparent hover:border-slate-200"><Icons.Back /></button>
                   )}
                   <div>
                       <h3 className="text-xl font-bold text-slate-800">{selectedUser.name}</h3>
                       <p className="text-xs text-slate-500 font-bold uppercase">{selectedUser.email}</p>
                   </div>
               </div>
               <button onClick={downloadCSV} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-green-200 transition-all flex items-center gap-2">
                   <Icons.Download /> Export CSV
               </button>
           </div>
           
           <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider font-bold">
                 <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Session Start</th>
                    <th className="px-6 py-4">Session End</th>
                    <th className="px-6 py-4 text-right">Duration</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                 {timesheetData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4 text-slate-700 font-medium">{format(new Date(row.date), 'EEE, MMM dd, yyyy')}</td>
                        <td className="px-6 py-4 text-slate-500 font-mono">{format(new Date(row.in), 'HH:mm:ss')}</td>
                        <td className="px-6 py-4 text-slate-500 font-mono">{format(new Date(row.out), 'HH:mm:ss')}</td>
                        <td className="px-6 py-4 text-right">
                            <span className="bg-blue-50 text-blue-700 font-mono font-bold px-3 py-1 rounded border border-blue-100">
                                {formatDuration(row.duration)}
                            </span>
                        </td>
                    </tr>
                 ))}
                 {timesheetData.length === 0 && (
                     <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No time logs found for this period.</td></tr>
                 )}
              </tbody>
           </table>
        </motion.div>
      )}
    </div>
  );
}