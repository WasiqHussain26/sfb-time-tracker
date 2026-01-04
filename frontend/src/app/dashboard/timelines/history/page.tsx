'use client';
import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import TimelineBar from '@/components/TimelineBar';
import { motion } from 'framer-motion';

const Icons = {
  Filter: () => <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>,
  User: () => <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Calendar: () => <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
};

export default function EmployeeHistoryPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [historyData, setHistoryData] = useState<any[]>([]);
  
  const [startDate, setStartDate] = useState(format(startOfWeek(new Date(), {weekStartsOn: 1}), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfWeek(new Date(), {weekStartsOn: 1}), 'yyyy-MM-dd'));

  useEffect(() => {
    const fetchUsers = async () => {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (!userStr || !token) return;
      const currentUser = JSON.parse(userStr);

      if (currentUser.role === 'EMPLOYEE') {
        setUsers([currentUser]);
        setSelectedUser(currentUser.id.toString());
      } else {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (Array.isArray(data)) {
                setUsers(data);
                if(data.length > 0) setSelectedUser(data[0].id.toString());
            }
        } catch (err) { console.error(err); }
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    const fetchHistory = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/employee-history?userId=${selectedUser}&start=${startDate}&end=${endDate}`, {
                headers: { Authorization: `Bearer ${token}` } 
            });
            if (res.ok) {
                const data = await res.json();
                setHistoryData(Array.isArray(data) ? data : []);
            }
        } catch (err) { console.error(err); }
    };
    fetchHistory();
  }, [selectedUser, startDate, endDate]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 font-sans">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Employee History</h1>
        <p className="text-slate-500 mt-1">Review performance over time.</p>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center gap-6 mb-8">
        
        {/* User Select */}
        <div className="flex flex-col gap-1">
             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                 <Icons.User /> Employee
             </label>
             <select 
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-medium min-w-[200px]"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
             >
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
             </select>
        </div>

        <div className="w-px h-10 bg-slate-100 mx-2 hidden md:block" />
        
        {/* Date Range */}
        <div className="flex flex-col gap-1">
             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                 <Icons.Calendar /> Date Range
             </label>
             <div className="flex items-center gap-3">
                 <input type="date" className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-medium" value={startDate} onChange={e => setStartDate(e.target.value)} />
                 <span className="text-slate-300 font-bold">→</span>
                 <input type="date" className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-medium" value={endDate} onChange={e => setEndDate(e.target.value)} />
             </div>
        </div>

        <div className="ml-auto">
             <div className="text-right">
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Days</div>
                 <div className="font-bold text-slate-800 text-lg">{historyData.length} Days</div>
             </div>
        </div>
      </div>

      {/* HISTORY FEED */}
      <div className="space-y-4">
        {historyData.map((day: any, i) => (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            key={day.date} 
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:border-blue-200 transition-colors"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-sm">
                      {format(new Date(day.date), 'dd')}
                  </div>
                  <div>
                      <h3 className="font-bold text-slate-800 text-lg">{format(new Date(day.date), 'EEEE')}</h3>
                      <p className="text-xs text-slate-400 font-medium uppercase">{format(new Date(day.date), 'MMMM yyyy')}</p>
                  </div>
              </div>
              <div className="text-right">
                   <div className="font-mono font-bold text-slate-800 text-xl">{formatTime(day.totalSeconds)}</div>
                   <div className="text-[10px] font-bold text-green-600 uppercase tracking-wider bg-green-50 px-2 py-0.5 rounded-full border border-green-100 inline-block">Verified Hours</div>
              </div>
            </div>
            
            <div className="h-14 relative bg-slate-50/50 rounded-xl border border-dashed border-slate-200 overflow-hidden">
               <TimelineBar sessions={day.sessions || []} />
            </div>
          </motion.div>
        ))}
        {historyData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                    <Icons.Calendar />
                </div>
                <h3 className="text-slate-400 font-bold text-lg">No history found</h3>
                <p className="text-slate-400 text-sm">Try adjusting the filter range.</p>
            </div>
        )}
      </div>
    </div>
  );
}