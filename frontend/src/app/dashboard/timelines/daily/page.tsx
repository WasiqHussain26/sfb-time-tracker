'use client';
import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import TimelineBar from '@/components/TimelineBar'; 

export default function DailyOverviewPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState<any[]>([]);

  // --- HELPER FUNCTION DEFINED INSIDE COMPONENT ---
  const formatTime = (s: number) => {
    if (!s || s === 0) return '0h 0m';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  };

  useEffect(() => {
    // 1. Get Current User for Permissions
    const userStr = localStorage.getItem('user');
    const currentUser = userStr ? JSON.parse(userStr) : null;

    fetch(`http://localhost:3000/reports/daily-timeline?date=${date}`)
      .then(res => res.json())
      .then(res => {
        // 2. Filter Logic: Employees only see themselves
        if (currentUser && currentUser.role === 'EMPLOYEE') {
          const myData = res.filter((item: any) => item.user.id === Number(currentUser.id));
          setData(myData);
        } else {
          // Admin/Manager sees everyone
          setData(res);
        }
      })
      .catch(console.error);
  }, [date]);

  const shiftDate = (d: number) => setDate(format(addDays(new Date(date), d), 'yyyy-MM-dd'));

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      <div className="flex justify-between items-center">
         <h2 className="text-2xl font-bold text-gray-800">Daily Overview</h2>
      </div>

      {/* DATE FILTER */}
      <div className="bg-white p-3 rounded shadow-sm border border-gray-200 flex items-center gap-4 w-fit">
        <label className="text-sm font-bold text-gray-500 uppercase">Date:</label>
        <div className="flex items-center bg-gray-100 rounded border px-2 py-1">
          <button onClick={() => shiftDate(-1)} className="px-2 text-gray-500 hover:text-blue-600">◀</button>
          <input 
            type="date" 
            className="bg-transparent text-sm font-medium text-gray-700 outline-none" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
          />
          <button onClick={() => shiftDate(1)} className="px-2 text-gray-500 hover:text-blue-600">▶</button>
        </div>
      </div>

      {/* USER LIST */}
      <div className="space-y-6">
        {data.map((item: any) => (
          <div key={item.user.id} className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
            
            {/* HEADER ROW (Name + Stats) */}
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* Left: Name */}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <h3 className="font-bold text-lg text-gray-800">{item.user.name}</h3>
              </div>

              {/* Right: Stats Grid */}
              <div className="flex gap-6 text-center text-sm">
                <div>
                  <div className="font-bold text-green-600 text-lg">{formatTime(item.totalSeconds)}</div>
                  <div className="text-xs text-gray-400 uppercase font-semibold">Worked</div>
                </div>
                <div>
                  <div className="font-bold text-yellow-600 text-lg">{formatTime(item.manualSeconds || 0)}</div>
                  <div className="text-xs text-gray-400 uppercase font-semibold">Manual</div>
                </div>
                <div>
                  <div className="font-bold text-red-400 text-lg">0h 0m</div>
                  <div className="text-xs text-gray-400 uppercase font-semibold">Idle</div>
                </div>
                <div className="border-l pl-6">
                   <div className="font-bold text-gray-800 text-lg">{formatTime(item.totalSeconds)}</div>
                   <div className="text-xs text-gray-400 uppercase font-semibold">Total</div>
                </div>
              </div>
            </div>

            {/* BODY: Last Task + Timeline */}
            <div className="p-4 bg-gray-50/50">
               <div className="mb-2 text-xs text-gray-500">
                  Last Task: <span className="text-gray-700 font-medium">{item.lastTaskName}</span>
               </div>
               
               <div className="h-12 w-full relative">
                 <TimelineBar sessions={item.sessions} />
               </div>
            </div>
          </div>
        ))}

        {data.length === 0 && (
          <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded">
            No data found for this date.
          </div>
        )}
      </div>
    </div>
  );
}