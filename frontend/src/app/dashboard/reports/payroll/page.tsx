'use client';
import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, addDays, addMonths, subMonths } from 'date-fns';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const Icons = {
  Cash: () => <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  ArrowLeft: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>,
  ArrowRight: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>,
  Download: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
};

export default function PayrollPage() {
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const router = useRouter();

  const [filterType, setFilterType] = useState<'CUSTOM' | 'MONTH' | 'WEEK_MF' | 'WEEK_SS'>('CUSTOM');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) setCurrentUserId(Number(JSON.parse(userStr).id));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) { router.push('/login'); return; }

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/payroll?start=${startDate}&end=${endDate}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.status === 401) { router.push('/login'); return; }

        const data = await res.json();
        if (!Array.isArray(data)) { setPayrollData([]); return; }
        
        let formatted = data.map((u: any) => ({ ...u, currentRate: u.hourlyRate, currency: 'USD' }));
        if (currentUserId) formatted = formatted.filter((u: any) => u.id !== currentUserId);
        
        setPayrollData(formatted);
      } catch (err) { console.error(err); setPayrollData([]); }
    };
    if (currentUserId) fetchData();
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

  const downloadCSV = () => {
    let csv = "Name,Role,Total Time (Hours),Total Time (Format),Hourly Rate,Currency,Total Pay,Email\n";
    payrollData.forEach(user => {
      const totalPay = ((user.totalSeconds / 3600) * user.currentRate).toFixed(2);
      csv += `${user.name},${user.role},${(user.totalSeconds / 3600).toFixed(2)},${formatDuration(user.totalSeconds)},${user.currentRate},${user.currency},${totalPay},${user.email}\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8," + csv));
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
    <div className="min-h-screen bg-[#F8FAFC] p-8 font-sans">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Payroll Calculation</h1>
        <p className="text-slate-500 mt-1">Calculate and export team payments based on tracked hours.</p>
      </div>

      {/* CONTROLS */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-8 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
           {['MONTH', 'WEEK_MF', 'WEEK_SS', 'CUSTOM'].map((type: any) => (
             <button key={type} onClick={() => handleFilterChange(type)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === type ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                {type === 'WEEK_MF' ? 'Mon-Fri' : type === 'WEEK_SS' ? 'Sat-Sun' : type === 'MONTH' ? 'Month' : 'Custom'}
             </button>
           ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
           {filterType !== 'CUSTOM' && <button onClick={() => shiftDate('PREV')} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-blue-600 transition"><Icons.ArrowLeft /></button>}
           <div className="flex items-center border border-slate-200 rounded-lg bg-white px-3 py-2 shadow-sm gap-2">
                 <span className="text-xs font-bold text-slate-400 uppercase">Range:</span>
                 <input type="date" className="text-sm font-medium text-slate-700 outline-none w-32" value={startDate} onChange={(e) => { setStartDate(e.target.value); setFilterType('CUSTOM'); }} />
                 <span className="text-slate-300">→</span>
                 <input type="date" className="text-sm font-medium text-slate-700 outline-none w-32" value={endDate} onChange={(e) => { setEndDate(e.target.value); setFilterType('CUSTOM'); }} />
           </div>
           {filterType !== 'CUSTOM' && <button onClick={() => shiftDate('NEXT')} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-blue-600 transition"><Icons.ArrowRight /></button>}
        </div>
        <div className="w-full h-px bg-slate-100 md:hidden" />
        <button onClick={downloadCSV} className="ml-auto md:ml-0 bg-slate-900 text-white px-6 py-2.5 rounded-xl hover:bg-slate-800 font-bold shadow-lg shadow-slate-200 transition-all flex items-center gap-2">
           <Icons.Download /> Export CSV
        </button>
      </div>

      {/* PAYROLL GRID */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/80 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider font-bold">
            <tr>
              <th className="px-6 py-4">Employee</th>
              <th className="px-6 py-4">Total Time</th>
              <th className="px-6 py-4">Configured Rate</th>
              <th className="px-6 py-4 text-right">Calculated Pay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-sm">
            {payrollData.length > 0 ? payrollData.map((user, i) => (
              <motion.tr 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={user.id} 
                className="hover:bg-blue-50/30 transition-colors"
              >
                <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                            user.role === 'ADMIN' ? 'bg-purple-500' : 'bg-blue-500'
                        }`}>
                            {user.name.charAt(0)}
                        </div>
                        <div>
                            <div className="font-bold text-slate-700">{user.name}</div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold">{user.role}</div>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4">
                    <div className="font-mono font-bold text-slate-700">{formatDuration(user.totalSeconds)}</div>
                    <div className="text-xs text-slate-400">{(user.totalSeconds / 3600).toFixed(2)} hrs</div>
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <select 
                            value={user.currency}
                            onChange={(e) => handleCurrencyChange(user.id, e.target.value)}
                            className="bg-slate-100 border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-600 outline-none cursor-pointer"
                        >
                            <option value="USD">USD</option>
                            <option value="PKR">PKR</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                        </select>
                        <input 
                            type="number" 
                            value={user.currentRate}
                            onChange={(e) => handleRateChange(user.id, e.target.value)}
                            className="w-20 bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 outline-none focus:border-blue-500 font-mono text-sm"
                        />
                    </div>
                </td>
                <td className="px-6 py-4 text-right">
                    <span className="bg-green-50 text-green-700 font-mono font-bold px-3 py-1.5 rounded-lg border border-green-100 shadow-sm block w-fit ml-auto">
                        {user.currency} {((user.totalSeconds / 3600) * user.currentRate).toFixed(2)}
                    </span>
                </td>
              </motion.tr>
            )) : (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No payroll data available for this criteria.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}