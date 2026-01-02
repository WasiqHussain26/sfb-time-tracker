'use client';
import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, addDays, addMonths, subMonths } from 'date-fns';

export default function UserReportPage() {
  // --- STATE ---
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  
  // Date Filters
  const [filterType, setFilterType] = useState<'CUSTOM' | 'MONTH' | 'WEEK_MF' | 'WEEK_SS'>('CUSTOM');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  
  // Data & Tabs
  const [activeTab, setActiveTab] = useState<'PROJECTS' | 'TASKS'>('PROJECTS');
  const [reportData, setReportData] = useState<{projects: any[], tasks: any[]} | null>(null);

  // --- INITIAL LOAD (User Permissions) ---
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    const currentUser = JSON.parse(userStr);

    if (currentUser.role === 'EMPLOYEE') {
      // Employee: Lock to themselves
      setUsers([currentUser]);
      setSelectedUser(currentUser.id.toString());
    } else {
      // Admin/Employer: Fetch All
      fetch('https://sfb-backend.vercel.app/users').then(res => res.json()).then(data => {
        if(Array.isArray(data) && data.length > 0) {
          setUsers(data);
          setSelectedUser(data[0].id.toString());
        }
      });
    }
  }, []);

  // --- FETCH REPORT DATA ---
  useEffect(() => {
    if(!selectedUser) return;

    const fetchReport = async () => {
      try {
        const res = await fetch(`https://sfb-backend.vercel.app/reports/user?userId=${selectedUser}&start=${startDate}&end=${endDate}`);
        const data = await res.json();
        setReportData(data);
      } catch (err) {
        console.error("Failed to load report", err);
      }
    };

    fetchReport();
  }, [selectedUser, startDate, endDate]);

  // --- DATE LOGIC HANDLERS ---
  const handleFilterChange = (type: 'CUSTOM' | 'MONTH' | 'WEEK_MF' | 'WEEK_SS') => {
    setFilterType(type);
    const today = new Date();

    if (type === 'MONTH') {
      setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
    } 
    else if (type === 'WEEK_MF') {
      const start = startOfWeek(today, { weekStartsOn: 1 });
      const end = addDays(start, 4);
      setStartDate(format(start, 'yyyy-MM-dd'));
      setEndDate(format(end, 'yyyy-MM-dd'));
    }
    else if (type === 'WEEK_SS') {
      const sat = startOfWeek(today, { weekStartsOn: 6 }); 
      const sun = addDays(sat, 1);
      setStartDate(format(sat, 'yyyy-MM-dd'));
      setEndDate(format(sun, 'yyyy-MM-dd'));
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
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">User Report</h2>

      {/* FILTERS BAR */}
      <div className="bg-white p-4 rounded shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center justify-between">
        
        {/* User Select */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-700">User:</label>
          <select 
            className="border rounded px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        {/* Date Filter Controls */}
        <div className="flex items-center gap-3 bg-gray-50 p-1 rounded border">
          {['CUSTOM', 'MONTH', 'WEEK_MF', 'WEEK_SS'].map((type: any) => (
             <button 
               key={type}
               onClick={() => handleFilterChange(type)}
               className={`px-3 py-1 text-sm rounded ${filterType === type ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
             >
               {type === 'WEEK_MF' ? 'Mon-Fri' : type === 'WEEK_SS' ? 'Sat-Sun' : type.charAt(0) + type.slice(1).toLowerCase()}
             </button>
          ))}
        </div>

        {/* Date Display */}
        <div className="flex items-center gap-2">
          {filterType !== 'CUSTOM' && <button onClick={() => shiftDate('PREV')} className="p-1 hover:bg-gray-100 rounded">◀</button>}
          <input type="date" className="border rounded px-2 py-1 text-sm" value={startDate} onChange={(e) => { setStartDate(e.target.value); setFilterType('CUSTOM'); }} />
          <span className="text-gray-400">to</span>
          <input type="date" className="border rounded px-2 py-1 text-sm" value={endDate} onChange={(e) => { setEndDate(e.target.value); setFilterType('CUSTOM'); }} />
          {filterType !== 'CUSTOM' && <button onClick={() => shiftDate('NEXT')} className="p-1 hover:bg-gray-100 rounded">▶</button>}
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button onClick={() => setActiveTab('PROJECTS')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'PROJECTS' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>PROJECT SUMMARY</button>
          <button onClick={() => setActiveTab('TASKS')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'TASKS' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>TASK SUMMARY</button>
        </nav>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">{activeTab === 'PROJECTS' ? 'Project Name' : 'Task Name'}</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-center">Tracked Time</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-center">Manual Time</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-center">Idle Time</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Total Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activeTab === 'PROJECTS' && reportData?.projects.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                <td className="px-6 py-4 text-center font-mono text-green-600">{formatTime(item.trackedSeconds)}</td>
                <td className="px-6 py-4 text-center font-mono text-yellow-600">{formatTime(item.manualSeconds)}</td>
                <td className="px-6 py-4 text-center font-mono text-red-500">{formatTime(item.idleSeconds)}</td>
                <td className="px-6 py-4 text-right font-mono text-blue-700 bg-blue-50 font-bold">{formatTime(item.totalSeconds)}</td>
              </tr>
            ))}
            {activeTab === 'TASKS' && reportData?.tasks.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                <td className="px-6 py-4 text-center font-mono text-green-600">{formatTime(item.trackedSeconds)}</td>
                <td className="px-6 py-4 text-center font-mono text-yellow-600">{formatTime(item.manualSeconds)}</td>
                <td className="px-6 py-4 text-center font-mono text-red-500">{formatTime(item.idleSeconds)}</td>
                <td className="px-6 py-4 text-right font-mono text-blue-700 bg-blue-50 font-bold">{formatTime(item.totalSeconds)}</td>
              </tr>
            ))}
             {((activeTab === 'PROJECTS' && reportData?.projects.length === 0) || 
               (activeTab === 'TASKS' && reportData?.tasks.length === 0)) && (
               <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">No data found for this time period.</td></tr>
             )}
          </tbody>
        </table>
      </div>
    </div>
  );
}