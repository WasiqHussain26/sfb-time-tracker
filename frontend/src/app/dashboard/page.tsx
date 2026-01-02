'use client';
import { useState, useEffect } from 'react';
import { 
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  addMonths, addWeeks, addDays
} from 'date-fns';

type ViewMode = 'CUSTOM' | 'MONTH' | 'MON-FRI' | 'SAT-SUN';
type Tab = 'EMPLOYEE' | 'PROJECT' | 'TASK';

export default function DashboardSummary() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<Tab>('EMPLOYEE');
  const [viewMode, setViewMode] = useState<ViewMode>('MONTH');
  
  // Date State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // DATA STATE - initialized with safe defaults
  const [summaryData, setSummaryData] = useState<{ employees: any[], projects: any[], tasks: any[] }>({ 
    employees: [], 
    projects: [], 
    tasks: [] 
  });
  
  // USER STATE
  const [userRole, setUserRole] = useState('');
  const [userId, setUserId] = useState('');
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- INIT USER ---
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const u = JSON.parse(userStr);
      setUserRole(u.role);
      setUserId(u.id);
    }
    setIsUserLoaded(true);
  }, []);

  // --- DATE LOGIC ---
  useEffect(() => {
    let s = new Date();
    let e = new Date();

    if (viewMode === 'MONTH') {
      s = startOfMonth(currentDate);
      e = endOfMonth(currentDate);
    } else if (viewMode === 'MON-FRI') {
      s = startOfWeek(currentDate, { weekStartsOn: 1 });
      e = addDays(s, 4); 
    } else if (viewMode === 'SAT-SUN') {
      s = addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 5); 
      e = addDays(s, 1);
    } else if (viewMode === 'CUSTOM') {
       return; // Don't overwrite custom selections
    }

    setStartDate(format(s, 'yyyy-MM-dd'));
    setEndDate(format(e, 'yyyy-MM-dd'));
  }, [viewMode, currentDate]);

  // --- NAVIGATION HANDLERS ---
  const handleNavigate = (direction: 'PREV' | 'NEXT') => {
    if (viewMode === 'CUSTOM') return;
    const modifier = direction === 'NEXT' ? 1 : -1;
    let newDate = new Date(currentDate);

    if (viewMode === 'MONTH') {
      newDate = addMonths(currentDate, modifier);
    } else if (viewMode === 'MON-FRI' || viewMode === 'SAT-SUN') {
      newDate = addWeeks(currentDate, modifier);
    }
    setCurrentDate(newDate);
  };

  // --- FETCH DATA ---
  useEffect(() => {
    if (!startDate || !endDate || !isUserLoaded) return;

    // Safety: If employee but no ID, wait
    if (userRole === 'EMPLOYEE' && !userId) return;

    const fetchData = async () => {
        setIsLoading(true);
        const token = localStorage.getItem('token'); // Get Token
        const queryId = userRole === 'EMPLOYEE' ? `&userId=${userId}` : '';

        try {
            const res = await fetch(`http://localhost:3000/reports/summary?start=${startDate}&end=${endDate}${queryId}`, {
                headers: { Authorization: `Bearer ${token}` } // Add Auth Header
            });
            
            if (res.ok) {
                const data = await res.json();
                // SAFE SETTER: Ensure arrays exist
                setSummaryData({
                    employees: Array.isArray(data.employees) ? data.employees : [],
                    projects: Array.isArray(data.projects) ? data.projects : [],
                    tasks: Array.isArray(data.tasks) ? data.tasks : []
                });
            } else {
                // If error (e.g. 401), set empty to avoid crash
                setSummaryData({ employees: [], projects: [], tasks: [] });
            }
        } catch (e) {
            console.error(e);
            setSummaryData({ employees: [], projects: [], tasks: [] });
        } finally {
            setIsLoading(false);
        }
    };

    fetchData();
  }, [startDate, endDate, userRole, userId, isUserLoaded]);

  // Helper
  const fmtTime = (seconds: number) => {
    if (!seconds) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // --- RENDER ---
  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      
      {/* HEADER & FILTERS */}
      <div className="bg-white p-2 rounded shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-800 px-2">Dashboard Overview</h2>
        
        <div className="flex bg-white border border-gray-300 rounded overflow-hidden divide-x divide-gray-300">
          <button onClick={() => setViewMode('CUSTOM')} className={`px-4 py-2 text-sm font-medium hover:bg-gray-50 ${viewMode === 'CUSTOM' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-600'}`}>Custom</button>
          <button onClick={() => setViewMode('MONTH')} className={`px-4 py-2 text-sm font-medium hover:bg-gray-50 ${viewMode === 'MONTH' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-600'}`}>Month</button>
          <button onClick={() => setViewMode('MON-FRI')} className={`px-4 py-2 text-sm font-medium hover:bg-gray-50 ${viewMode === 'MON-FRI' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-600'}`}>Mon-Fri</button>
          <button onClick={() => setViewMode('SAT-SUN')} className={`px-4 py-2 text-sm font-medium hover:bg-gray-50 ${viewMode === 'SAT-SUN' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-600'}`}>Sat-Sun</button>
        </div>

        <div className="flex items-center gap-2 bg-white border border-gray-300 rounded px-2 py-1">
          <button onClick={() => handleNavigate('PREV')} className="p-1 hover:text-blue-600 text-gray-500">◀</button>
          <input type="date" value={startDate} onChange={(e) => { setViewMode('CUSTOM'); setStartDate(e.target.value); }} className="text-sm font-semibold text-gray-700 outline-none w-32 text-center" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={endDate} onChange={(e) => { setViewMode('CUSTOM'); setEndDate(e.target.value); }} className="text-sm font-semibold text-gray-700 outline-none w-32 text-center" />
          <button onClick={() => handleNavigate('NEXT')} className="p-1 hover:text-blue-600 text-gray-500">▶</button>
        </div>

        <button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded">Refresh</button>
      </div>

      {/* TABS */}
      <div className="flex gap-8 border-b border-gray-200">
        <button onClick={() => setActiveTab('EMPLOYEE')} className={`pb-3 text-sm font-bold uppercase tracking-wide flex items-center gap-2 transition ${activeTab === 'EMPLOYEE' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>👥 Employee Summary</button>
        <button onClick={() => setActiveTab('PROJECT')} className={`pb-3 text-sm font-bold uppercase tracking-wide flex items-center gap-2 transition ${activeTab === 'PROJECT' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>📅 Project Summary</button>
        <button onClick={() => setActiveTab('TASK')} className={`pb-3 text-sm font-bold uppercase tracking-wide flex items-center gap-2 transition ${activeTab === 'TASK' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>📝 Task Summary</button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
            <div className="p-12 text-center text-gray-500 font-medium">Loading summary data...</div>
        ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-blue-50/50 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">
                <tr>
                    <th className="p-4 w-1/3">{activeTab === 'EMPLOYEE' ? 'Employee' : activeTab === 'PROJECT' ? 'Project' : 'Task'}</th>
                    {activeTab === 'TASK' && <th className="p-4">Project</th>}
                    <th className="p-4 text-center">Total Time</th>
                    <th className="p-4 text-center">Manual Entry</th>
                    <th className="p-4 text-right text-blue-600">Total (Inc. Idle)</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                {/* SAFE MAPPING: Check array existence before mapping */}
                {activeTab === 'EMPLOYEE' && summaryData.employees?.map(emp => (
                    <tr key={emp.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-semibold text-gray-800 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{emp.name?.charAt(0)}</div>
                        {emp.name}
                    </td>
                    <td className="p-4 text-center"><span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold text-xs">{fmtTime(emp.totalSeconds)}</span></td>
                    <td className="p-4 text-center text-yellow-600 font-medium text-sm">{fmtTime(emp.manualSeconds)}</td>
                    <td className="p-4 text-right font-bold text-blue-600">{fmtTime(emp.totalSeconds)}</td>
                    </tr>
                ))}

                {activeTab === 'PROJECT' && summaryData.projects?.map(proj => (
                    <tr key={proj.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-semibold text-gray-800">{proj.name}</td>
                    <td className="p-4 text-center"><span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold text-xs">{fmtTime(proj.totalSeconds)}</span></td>
                    <td className="p-4 text-center text-yellow-600 font-medium text-sm">{fmtTime(proj.manualSeconds)}</td>
                    <td className="p-4 text-right font-bold text-blue-600">{fmtTime(proj.totalSeconds)}</td>
                    </tr>
                ))}

                {activeTab === 'TASK' && summaryData.tasks?.map(task => (
                    <tr key={task.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-semibold text-gray-800">{task.name}</td>
                    <td className="p-4 text-sm text-gray-500">{task.projectName}</td>
                    <td className="p-4 text-center"><span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold text-xs">{fmtTime(task.totalSeconds)}</span></td>
                    <td className="p-4 text-center text-yellow-600 font-medium text-sm">{fmtTime(task.manualSeconds)}</td>
                    <td className="p-4 text-right font-bold text-blue-600">{fmtTime(task.totalSeconds)}</td>
                    </tr>
                ))}

                {/* EMPTY STATE */}
                {((activeTab === 'EMPLOYEE' && (!summaryData.employees || summaryData.employees.length === 0)) || 
                  (activeTab === 'PROJECT' && (!summaryData.projects || summaryData.projects.length === 0)) || 
                  (activeTab === 'TASK' && (!summaryData.tasks || summaryData.tasks.length === 0))) && (
                    <tr><td colSpan={6} className="p-12 text-center text-gray-400 italic">No activity found for this period.</td></tr>
                )}
                </tbody>
            </table>
            </div>
        )}
      </div>
    </div>
  );
}