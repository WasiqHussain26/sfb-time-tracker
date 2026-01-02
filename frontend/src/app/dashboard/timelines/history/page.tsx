'use client';
import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import TimelineBar from '@/components/TimelineBar'; // Ensure this component exists

export default function EmployeeHistoryPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [historyData, setHistoryData] = useState<any[]>([]);
  
  const [startDate, setStartDate] = useState(format(startOfWeek(new Date(), {weekStartsOn: 1}), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfWeek(new Date(), {weekStartsOn: 1}), 'yyyy-MM-dd'));

  // 1. LOAD USERS (With Auth & Safety)
  useEffect(() => {
    const fetchUsers = async () => {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');

      if (!userStr || !token) return;

      const currentUser = JSON.parse(userStr);

      // A. Employee Logic (No fetch needed, just load self)
      if (currentUser.role === 'EMPLOYEE') {
        setUsers([currentUser]);
        setSelectedUser(currentUser.id.toString());
        return;
      }

      // B. Admin/Employer Logic (Fetch all)
      try {
        const res = await fetch('http://localhost:3000/users', {
            headers: { Authorization: `Bearer ${token}` } // <--- ADDED AUTH
        });
        
        const data = await res.json();

        // SAFETY CHECK: Ensure data is an array
        if (Array.isArray(data)) {
            setUsers(data);
            if(data.length > 0) setSelectedUser(data[0].id.toString());
        } else {
            console.error("Failed to load users:", data);
            setUsers([]); 
        }
      } catch (err) {
        console.error(err);
        setUsers([]);
      }
    };

    fetchUsers();
  }, []);

  // 2. LOAD HISTORY DATA (With Auth)
  useEffect(() => {
    if (!selectedUser) return;

    const fetchHistory = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch(`http://localhost:3000/reports/employee-history?userId=${selectedUser}&start=${startDate}&end=${endDate}`, {
                headers: { Authorization: `Bearer ${token}` } // <--- ADDED AUTH
            });
            
            if (res.ok) {
                const data = await res.json();
                setHistoryData(Array.isArray(data) ? data : []);
            } else {
                console.error("Failed to fetch history");
                setHistoryData([]);
            }
        } catch (err) {
            console.error(err);
            setHistoryData([]);
        }
    };

    fetchHistory();
  }, [selectedUser, startDate, endDate]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Employee History</h2>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded shadow-sm border flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-700">Employee:</label>
          <select 
            className="border rounded px-2 py-1 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            {/* SAFE MAP: users is guaranteed to be an array */}
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-700">Range:</label>
          <input type="date" className="border rounded px-2 py-1 text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span className="text-gray-400">to</span>
          <input type="date" className="border rounded px-2 py-1 text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      {/* HISTORY LIST */}
      <div className="space-y-4">
        {historyData.map((day: any) => (
          <div key={day.date} className="bg-white p-4 rounded shadow-sm border">
            <div className="flex justify-between mb-2">
              <h3 className="font-semibold text-gray-800">{format(new Date(day.date), 'EEEE, MMM dd, yyyy')}</h3>
              <span className="text-sm font-bold text-green-700">{formatTime(day.totalSeconds)}</span>
            </div>
            <div className="h-12 relative">
               {/* Ensure TimelineBar handles empty/null sessions gracefully */}
               <TimelineBar sessions={day.sessions || []} />
            </div>
          </div>
        ))}
        {historyData.length === 0 && (
            <div className="text-center text-gray-500 py-10 border-2 border-dashed rounded bg-gray-50">
                No history found for this period.
            </div>
        )}
      </div>
    </div>
  );
}