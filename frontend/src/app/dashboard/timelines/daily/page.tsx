'use client';
import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import TimelineBar from '@/components/TimelineBar'; 
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

// Icons
const Icons = {
  Calendar: () => <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  Clock: () => <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  ChevronLeft: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>,
  ChevronRight: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
};

export default function DailyOverviewPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState<any[]>([]);
  const router = useRouter();

  const formatTime = (s: number) => {
    if (!s || s === 0) return '0h 0m';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    const currentUser = userStr ? JSON.parse(userStr) : null;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/daily-timeline?date=${date}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.status === 401 ? [] : res.json())
      .then(res => {
        if (!Array.isArray(res)) { setData([]); return; }
        if (currentUser && currentUser.role === 'EMPLOYEE') {
          setData(res.filter((item: any) => item.user.id === Number(currentUser.id)));
        } else {
          setData(res);
        }
      })
      .catch(() => setData([]));
  }, [date]);

  const shiftDate = (d: number) => setDate(format(addDays(new Date(date), d), 'yyyy-MM-dd'));

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 font-sans">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-4">
         <div>
            <h1 className="text-3xl font-bold text-slate-900">Daily Overview</h1>
            <p className="text-slate-500 mt-1">Track comprehensive team activity for specific days.</p>
         </div>
         
         {/* DATE NAVIGATOR */}
         <div className="flex items-center bg-white rounded-xl shadow-sm border border-slate-200 p-1">
             <button onClick={() => shiftDate(-1)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition"><Icons.ChevronLeft /></button>
             <div className="px-4 border-l border-r border-slate-100 flex items-center gap-2">
                 <Icons.Calendar />
                 <input 
                    type="date" 
                    className="bg-transparent font-bold text-slate-700 outline-none text-sm uppercase tracking-wide cursor-pointer" 
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                 />
             </div>
             <button onClick={() => shiftDate(1)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition"><Icons.ChevronRight /></button>
         </div>
      </div>

      {/* TIMELINE GRID */}
      <div className="space-y-6">
        {Array.isArray(data) && data.length > 0 ? data.map((item: any, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            key={item.user.id} 
            className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
          >
            {/* CARD HEADER */}
            <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg shadow-blue-200 shadow-lg">
                    {item.user.name.charAt(0)}
                </div>
                <div>
                    <h3 className="font-bold text-lg text-slate-800">{item.user.name}</h3>
                    <p className="text-xs text-slate-500 font-medium bg-white px-2 py-0.5 rounded border border-slate-100 w-fit mt-1">
                        {item.user.email}
                    </p>
                </div>
              </div>

              {/* STATS PILLS */}
              <div className="flex gap-4">
                 <div className="bg-white px-5 py-2 rounded-xl border border-slate-100 shadow-sm text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tracker</div>
                    <div className="font-mono font-bold text-green-600 text-lg">{formatTime(item.totalSeconds)}</div>
                 </div>
                 <div className="bg-white px-5 py-2 rounded-xl border border-slate-100 shadow-sm text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Manual</div>
                    <div className="font-mono font-bold text-amber-500 text-lg">{formatTime(item.manualSeconds || 0)}</div>
                 </div>
                 <div className="bg-slate-800 px-5 py-2 rounded-xl border border-slate-700 shadow-sm text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total</div>
                    <div className="font-mono font-bold text-white text-lg">{formatTime(item.totalSeconds + (item.manualSeconds || 0))}</div>
                 </div>
              </div>
            </div>

            {/* TIMELINE AREA */}
            <div className="p-6">
               <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-green-500" /> Active Session
                  </span>
                  <div className="text-xs text-slate-500">
                     Last Activity: <span className="font-bold text-slate-700">{item.lastTaskName || 'None'}</span>
                  </div>
               </div>
               
               <div className="h-16 w-full relative bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                 <TimelineBar sessions={item.sessions} />
               </div>
            </div>
          </motion.div>
        )) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Icons.Clock />
                </div>
                <h3 className="text-slate-400 font-medium">No activity recorded for this date.</h3>
            </div>
        )}
      </div>
    </div>
  );
}