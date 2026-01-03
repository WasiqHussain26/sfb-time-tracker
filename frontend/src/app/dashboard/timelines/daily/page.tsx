'use client';
import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import TimelineBar from '@/components/TimelineBar'; 
import { useRouter } from 'next/navigation';

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
    const token = localStorage.getItem('token'); // <--- GET TOKEN

    if (!token) { router.push('/login'); return; }

    const currentUser = userStr ? JSON.parse(userStr) : null;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/daily-timeline?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` } // <--- ADDED HEADER
    })
      .then(res => {
         if (res.status === 401) { router.push('/login'); return []; }
         return res.json();
      })
      .then(res => {
        if (!Array.isArray(res)) {
            console.error("API Error or Invalid Format:", res);
            setData([]); 
            return;
        }

        if (currentUser && currentUser.role === 'EMPLOYEE') {
          const myData = res.filter((item: any) => item.user.id === Number(currentUser.id));
          setData(myData);
        } else {
          setData(res);
        }
      })
      .catch(err => {
          console.error("Fetch Error:", err);
          setData([]); 
      });
  }, [date]);

  const shiftDate = (d: number) => setDate(format(addDays(new Date(date), d), 'yyyy-MM-dd'));

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      <div className="flex justify-between items-center">
         <h2 className="text-2xl font-bold text-gray-800">Daily Overview</h2>
      </div>

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

      <div className="space-y-6">
        {Array.isArray(data) && data.map((item: any) => (
          <div key={item.user.id} className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <h3 className="font-bold text-lg text-gray-800">{item.user.name}</h3>
              </div>
              <div className="flex gap-6 text-center text-sm">
                <div>
                  <div className="font-bold text-green-600 text-lg">{formatTime(item.totalSeconds)}</div>
                  <div className="text-xs text-gray-400 uppercase font-semibold">Worked</div>
                </div>
                <div>
                  <div className="font-bold text-yellow-600 text-lg">{formatTime(item.manualSeconds || 0)}</div>
                  <div className="text-xs text-gray-400 uppercase font-semibold">Manual</div>
                </div>
                <div className="border-l pl-6">
                    <div className="font-bold text-gray-800 text-lg">{formatTime(item.totalSeconds)}</div>
                    <div className="text-xs text-gray-400 uppercase font-semibold">Total</div>
                </div>
              </div>
            </div>

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
        {(!data || data.length === 0) && (
          <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded">
            No data found for this date.
          </div>
        )}
      </div>
    </div>
  );
}