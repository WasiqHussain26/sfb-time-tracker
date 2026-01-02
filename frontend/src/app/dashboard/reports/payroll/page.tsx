'use client';
import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, addDays, addMonths, subMonths } from 'date-fns';

export default function PayrollPage() {
  // State
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<'CUSTOM' | 'MONTH' | 'WEEK_MF' | 'WEEK_SS'>('CUSTOM');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // 1. Init User ID
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const u = JSON.parse(userStr);
      setCurrentUserId(Number(u.id));
    }
  }, []);

  // 2. Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://sfb-backend.vercel.app/reports/payroll?start=${startDate}&end=${endDate}`);
        const data = await res.json();
        
        let formatted = data.map((u: any) => ({
          ...u,
          currentRate: u.hourlyRate, 
          currency: 'USD'            
        }));

        if (currentUserId) {
          formatted = formatted.filter((u: any) => u.id !== currentUserId);
        }
        
        setPayrollData(formatted);
      } catch (err) { console.error(err); }
      setLoading(false);
    };

    if (currentUserId) { 
        fetchData();
    }
  }, [startDate, endDate, currentUserId]);

  const handleRateChange = (id: number, newRate: string) => {
    setPayrollData(prev => prev.map(u => u.id === id ? { ...u, currentRate: newRate } : u));
  };

  const handleCurrencyChange = (id: number, newCurrency: string) => {
    setPayrollData(prev => prev.map(u => u.id === id ? { ...u, currency: newCurrency } : u));
  };

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
    const method = filterType === 'MONTH' ? (direction === 'NEXT' ? addMonths : subMonths) : addDays;
    const amount = filterType === 'MONTH' ? 1 : (direction === 'NEXT' ? 7 : -7);
    
    if(filterType === 'MONTH') {
      const newDate = method(start, 1);
      setStartDate(format(startOfMonth(newDate), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(newDate), 'yyyy-MM-dd'));
    } else {
      setStartDate(format(addDays(new Date(startDate), amount), 'yyyy-MM-dd'));
      setEndDate(format(addDays(new Date(endDate), amount), 'yyyy-MM-dd'));
    }
  };

  const downloadCSV = () => {
    let csv = "Name,Role,Total Time (Hours),Total Time (Format),Hourly Rate,Currency,Total Pay,Email\n";

    payrollData.forEach(user => {
      const hoursDecimal = (user.totalSeconds / 3600).toFixed(2);
      const hoursFormat = formatDuration(user.totalSeconds);
      const totalPay = ((user.totalSeconds / 3600) * user.currentRate).toFixed(2);

      csv += `${user.name},${user.role},${hoursDecimal},${hoursFormat},${user.currentRate},${user.currency},${totalPay},${user.email}\n`;
    });

    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payroll_report_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Generate Payroll</h2>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3 bg-gray-50 p-1 rounded border">
          {['CUSTOM', 'MONTH', 'WEEK_MF', 'WEEK_SS'].map((type: any) => (
            <button key={type} onClick={() => handleFilterChange(type)} className={`px-3 py-1 text-sm rounded ${filterType === type ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500'}`}>
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          {filterType !== 'CUSTOM' && <button onClick={() => shiftDate('PREV')} className="p-1 hover:text-blue-600">◀</button>}
          <input type="date" className="border rounded px-2 py-1 text-sm" value={startDate} onChange={(e) => {setStartDate(e.target.value); setFilterType('CUSTOM');}} />
          <span className="text-gray-400">to</span>
          <input type="date" className="border rounded px-2 py-1 text-sm" value={endDate} onChange={(e) => {setEndDate(e.target.value); setFilterType('CUSTOM');}} />
          {filterType !== 'CUSTOM' && <button onClick={() => shiftDate('NEXT')} className="p-1 hover:text-blue-600">▶</button>}
        </div>
      </div>

      {/* DOWNLOAD */}
      <div className="flex justify-start">
        <button onClick={downloadCSV} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <span>⬇</span> Download Payroll
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              {/* FIXED: Removed the comment that was causing the whitespace error */}
              <th className="px-6 py-4 font-semibold text-gray-700 text-sm">Name</th>
              <th className="px-6 py-4 font-semibold text-gray-700 text-sm">Role</th>
              <th className="px-6 py-4 font-semibold text-gray-700 text-sm">Total Time</th>
              <th className="px-6 py-4 font-semibold text-gray-700 text-sm">Hourly Rate</th>
              <th className="px-6 py-4 font-semibold text-gray-700 text-sm">Currency</th>
              <th className="px-6 py-4 font-semibold text-gray-700 text-sm text-right">Total Pay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payrollData.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                <td className="px-6 py-4 text-xs">
                   <span className={`px-2 py-1 rounded font-bold ${
                      user.role === 'ADMIN' ? 'bg-red-100 text-red-700' :
                      user.role === 'EMPLOYER' ? 'bg-purple-100 text-purple-700' :
                      'bg-green-100 text-green-700'
                   }`}>{user.role}</span>
                </td>
                <td className="px-6 py-4 font-mono text-gray-600">
                  {formatDuration(user.totalSeconds)}
                </td>
                
                <td className="px-6 py-4">
                  <input 
                    type="number" 
                    value={user.currentRate}
                    onChange={(e) => handleRateChange(user.id, e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 w-24 text-right focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </td>

                <td className="px-6 py-4">
                  <select 
                    value={user.currency}
                    onChange={(e) => handleCurrencyChange(user.id, e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="PKR">PKR</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </td>

                <td className="px-6 py-4 text-right font-bold text-gray-800">
                  {user.currency} {((user.totalSeconds / 3600) * user.currentRate).toFixed(2)}
                </td>
              </tr>
            ))}
            {payrollData.length === 0 && !loading && (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">No employees found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}