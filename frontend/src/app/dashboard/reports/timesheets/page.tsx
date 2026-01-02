'use client';
import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, addDays, addMonths, subMonths } from 'date-fns';

export default function TimesheetsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [timesheetData, setTimesheetData] = useState<any[]>([]);

  // Filters
  const [filterType, setFilterType] = useState<'CUSTOM' | 'MONTH' | 'WEEK_MF' | 'WEEK_SS'>('CUSTOM');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // 1. Fetch Employees (Permission Aware & Auth Fixed)
  useEffect(() => {
    const fetchUsers = async () => {
        const userStr = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (!userStr || !token) return;
        
        const currentUser = JSON.parse(userStr);

        if (currentUser.role === 'EMPLOYEE') {
            // Employee Mode: Lock to self and auto-load
            setUsers([currentUser]);
            setSelectedUser(currentUser);
        } else {
            // Admin Mode: Fetch list
            try {
                const res = await fetch('https://sfb-backend.vercel.app/users', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                setUsers(Array.isArray(data) ? data : []);
            } catch (err) { console.error(err); }
        }
    };
    fetchUsers();
  }, []);

  // 2. Fetch Timesheet Data
  const loadTimesheet = async (user: any) => {
    const targetUser = user || selectedUser;
    if (!targetUser) return;
    if (user) setSelectedUser(user);

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`https://sfb-backend.vercel.app/reports/timesheet?userId=${targetUser.id}&start=${startDate}&end=${endDate}`, {
          headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTimesheetData(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (selectedUser) {
      loadTimesheet(null);
    }
  }, [startDate, endDate, selectedUser]); // Reload if dates or user changes

  // Date Logic
  const handleFilterChange = (type: 'CUSTOM' | 'MONTH' | 'WEEK_MF' | 'WEEK_SS') => {
    setFilterType(type);
    const today = new Date();
    if (type === 'MONTH') {
      setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
    } 
    else if (type === 'WEEK_MF') {
      const start = startOfWeek(today, { weekStartsOn: 1 });
      setStartDate(format(start, 'yyyy-MM-dd'));
      setEndDate(format(addDays(start, 4), 'yyyy-MM-dd'));
    }
    else if (type === 'WEEK_SS') {
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

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  };

  // UPDATED CSV DOWNLOAD (Includes Notes)
  const downloadCSV = () => {
    if (!timesheetData.length) return;
    
    // Updated Header
    let csvContent = "data:text/csv;charset=utf-8,Date,Punch In,Punch Out,Total Duration,Notes\n";
    
    timesheetData.forEach(row => {
      const duration = (row.duration / 3600).toFixed(2) + " hours";
      // Escape quotes in notes to prevent CSV breaking
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
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Employee Timesheets</h2>

      {/* FILTERS BAR */}
      <div className="bg-white p-4 rounded shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3 bg-gray-50 p-1 rounded border">
          {['CUSTOM', 'MONTH', 'WEEK_MF', 'WEEK_SS'].map((type: any) => (
             <button key={type} onClick={() => handleFilterChange(type)} className={`px-3 py-1 text-sm rounded ${filterType === type ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
               {type === 'WEEK_MF' ? 'Mon-Fri' : type === 'WEEK_SS' ? 'Sat-Sun' : type.charAt(0) + type.slice(1).toLowerCase()}
             </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
           {filterType !== 'CUSTOM' && <button onClick={() => shiftDate('PREV')} className="p-1 hover:bg-gray-100 rounded">◀</button>}
           <input type="date" className="border rounded px-2 py-1 text-sm" value={startDate} onChange={(e) => {setStartDate(e.target.value); setFilterType('CUSTOM');}} />
           <span className="text-gray-400">to</span>
           <input type="date" className="border rounded px-2 py-1 text-sm" value={endDate} onChange={(e) => {setEndDate(e.target.value); setFilterType('CUSTOM');}} />
           {filterType !== 'CUSTOM' && <button onClick={() => shiftDate('NEXT')} className="p-1 hover:bg-gray-100 rounded">▶</button>}
        </div>
      </div>

      {/* VIEW */}
      {!selectedUser ? (
        /* LIST VIEW (ADMIN ONLY) */
        <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr><th className="px-6 py-4 font-semibold text-gray-700">Name</th><th className="px-6 py-4 font-semibold text-gray-700">Role</th><th className="px-6 py-4 text-right">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{user.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{user.role}</td>
                  <td className="px-6 py-4 text-right"><button onClick={() => loadTimesheet(user)} className="text-blue-600 hover:text-blue-800 font-medium text-sm border border-blue-200 px-3 py-1 rounded">Show Timesheet</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* INDIVIDUAL SHEET (EMPLOYEE OR SELECTED ADMIN) */
        <div className="bg-white rounded shadow border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <div>
              {/* Only show Back button if there are multiple users (Admin mode) */}
              {users.length > 1 && <button onClick={() => setSelectedUser(null)} className="text-sm text-gray-500 hover:text-gray-800 mb-1">← Back to List</button>}
              <h3 className="text-xl font-bold text-gray-800">{selectedUser.name}'s Timesheet</h3>
            </div>
            <button onClick={downloadCSV} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2">⬇ CSV</button>
          </div>
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                  <th className="px-4 py-3 text-sm font-semibold">Date</th>
                  <th className="px-4 py-3 text-sm font-semibold">In</th>
                  <th className="px-4 py-3 text-sm font-semibold">Out</th>
                  <th className="px-4 py-3 text-sm font-semibold text-right">Duration</th>
                  
                  {/* NEW NOTES COLUMN */}
                  <th className="px-4 py-3 text-sm font-semibold text-left w-1/3">Notes</th> 
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {timesheetData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{format(new Date(row.date), 'MMM dd, yyyy')}</td>
                  <td className="px-4 py-3 text-sm font-medium">{format(new Date(row.in), 'HH:mm:ss')}</td>
                  <td className="px-4 py-3 text-sm font-medium">{format(new Date(row.out), 'HH:mm:ss')}</td>
                  <td className="px-4 py-3 text-sm font-mono text-right font-bold text-blue-600">{formatDuration(row.duration)}</td>
                  
                  {/* NEW NOTES DATA */}
                  <td className="px-4 py-3 text-sm text-gray-600 italic">
                    {row.notes ? (
                        <span title={row.notes} className="block truncate max-w-xs">{row.notes}</span>
                    ) : (
                        <span className="text-gray-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {timesheetData.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">No time logs found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}