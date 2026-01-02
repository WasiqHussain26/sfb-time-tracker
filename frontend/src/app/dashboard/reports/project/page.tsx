'use client';
import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, startOfWeek, addDays } from 'date-fns';

export default function ProjectReportPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  
  // Date Filters
  const [filterType, setFilterType] = useState<'CUSTOM' | 'MONTH' | 'WEEK_MF' | 'WEEK_SS'>('CUSTOM');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  
  // Data & Tabs
  const [activeTab, setActiveTab] = useState<'TASKS' | 'USERS'>('TASKS');
  const [reportData, setReportData] = useState<{tasks: any[], users: any[]} | null>(null);

  // 1. Load Projects List
  useEffect(() => {
    fetch('https://sfb-backend.vercel.app/projects').then(res => res.json()).then(data => {
      if(Array.isArray(data) && data.length > 0) {
        setProjects(data);
        setSelectedProject(data[0].id); // Default to first project
      }
    });
  }, []);

  // 2. Load Report Data
  useEffect(() => {
    if(!selectedProject) return;
    const fetchReport = async () => {
      try {
        const res = await fetch(`https://sfb-backend.vercel.app/reports/project?projectId=${selectedProject}&start=${startDate}&end=${endDate}`);
        const data = await res.json();
        setReportData(data);
      } catch (err) { console.error(err); }
    };
    fetchReport();
  }, [selectedProject, startDate, endDate]);

  // Date Logic (Same as User Report)
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

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Project Report</h2>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-700">Project:</label>
          <select 
            className="border rounded px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3 bg-gray-50 p-1 rounded border">
          {['CUSTOM', 'MONTH', 'WEEK_MF', 'WEEK_SS'].map((type: any) => (
            <button 
              key={type}
              onClick={() => handleFilterChange(type)}
              className={`px-3 py-1 text-sm rounded ${filterType === type ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input type="date" className="border rounded px-2 py-1 text-sm" value={startDate} onChange={(e) => {setStartDate(e.target.value); setFilterType('CUSTOM');}} />
          <span className="text-gray-400">to</span>
          <input type="date" className="border rounded px-2 py-1 text-sm" value={endDate} onChange={(e) => {setEndDate(e.target.value); setFilterType('CUSTOM');}} />
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button onClick={() => setActiveTab('TASKS')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'TASKS' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
            TASK REPORT (Hours)
          </button>
          <button onClick={() => setActiveTab('USERS')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'USERS' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
            USER REPORT (Hours)
          </button>
        </nav>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">
                {activeTab === 'TASKS' ? 'Task Name' : 'User Name'}
              </th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Time Spent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activeTab === 'TASKS' && reportData?.tasks.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                <td className="px-6 py-4 text-right font-mono text-blue-600 bg-blue-50 w-32 rounded">{formatTime(item.seconds)}</td>
              </tr>
            ))}
            {activeTab === 'USERS' && reportData?.users.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                <td className="px-6 py-4 text-right font-mono text-purple-600 bg-purple-50 w-32 rounded">{formatTime(item.seconds)}</td>
              </tr>
            ))}
             {((activeTab === 'TASKS' && reportData?.tasks.length === 0) || 
               (activeTab === 'USERS' && reportData?.users.length === 0)) && (
              <tr><td colSpan={2} className="px-6 py-8 text-center text-gray-400 italic">No activity recorded for this period.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}