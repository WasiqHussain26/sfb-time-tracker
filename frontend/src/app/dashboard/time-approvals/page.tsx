'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast'; // Professional notifications

export default function ManualEntryPage() {
  const router = useRouter();
  
  // --- STATE ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [reason, setReason] = useState('');

  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [manualEntries, setManualEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- INITIAL LOAD ---
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!userStr || !token) { router.push('/login'); return; }
    
    const u = JSON.parse(userStr);
    setCurrentUser(u);

    // SECURITY: Only EMPLOYER can access
    if (u.role !== 'EMPLOYER') return;

    // Fetch Data
    fetch('http://localhost:3000/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json()).then(data => { setUsers(data); if (data.length > 0) setSelectedUserId(data[0].id); });

    fetch('http://localhost:3000/projects', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json()).then(data => { setProjects(data); if (data.length > 0) setSelectedProject(data[0].id); });
  }, []);

  // --- FETCH TASKS ---
  useEffect(() => {
    setSelectedTask(''); setTasks([]); if (!selectedProject) return;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:3000/projects/${selectedProject}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json()).then(data => {
        const all = data.tasks || [];
        // Filter tasks for selected user
        const valid = all.filter((t: any) => t.isOpenToAll || t.assignees?.some((u: any) => u.id === Number(selectedUserId)));
        setTasks(valid); if (valid.length > 0) setSelectedTask(valid[0].id);
      });
  }, [selectedProject, selectedUserId]);

  // --- FETCH ENTRIES (Read-Only Context) ---
  useEffect(() => { if (!selectedUserId) return; fetchEntries(); }, [selectedUserId, date]);

  const fetchEntries = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:3000/reports/timeline?userId=${selectedUserId}&date=${date}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setManualEntries(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  // --- SUBMIT HANDLER ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return toast.error("Please select a valid task.");
    if (startTime >= endTime) return toast.error("End time must be greater than start time.");

    setLoading(true);
    const toastId = toast.loading('Adding time entry...');
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch('http://localhost:3000/time-tracking/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userId: Number(selectedUserId),
          taskId: Number(selectedTask),
          startTime: new Date(`${date}T${startTime}:00`).toISOString(),
          endTime: new Date(`${date}T${endTime}:00`).toISOString(),
          reason 
        })
      });

      if (res.ok) {
        toast.success("Time Entry Added Successfully!", { id: toastId });
        fetchEntries(); 
        setReason('');
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to add entry", { id: toastId });
      }
    } catch (error) { 
        console.error(error); 
        toast.error("Network error.", { id: toastId });
    }
    setLoading(false);
  };

  const getDuration = (s: string, e: string) => {
    const diff = new Date(e).getTime() - new Date(s).getTime();
    if (diff <= 0) return "00:00 hrs";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} hrs`;
  };

  if (!currentUser || currentUser.role !== 'EMPLOYER') return <div className="p-10 text-center">Access Denied</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Manual Time Entry</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ADD FORM */}
        <div className="lg:col-span-1 bg-white p-6 rounded shadow border border-gray-200 h-fit">
          <h2 className="font-bold text-lg mb-4 text-blue-600">Add Log For Employee</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-50 p-3 rounded border border-blue-100">
                <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Select Employee</label>
                <select className="w-full border p-2 rounded text-sm bg-white" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
            </div>
            
            <input type="date" required className="w-full border p-2 rounded text-sm" value={date} onChange={e => setDate(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
                <input type="time" required className="w-full border p-2 rounded text-sm" value={startTime} onChange={e => setStartTime(e.target.value)} />
                <input type="time" required className="w-full border p-2 rounded text-sm" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
            
            <select className="w-full border p-2 rounded text-sm" value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            
            <select className="w-full border p-2 rounded text-sm" value={selectedTask} onChange={e => setSelectedTask(e.target.value)} disabled={tasks.length === 0}>
                {tasks.length === 0 ? <option>No assigned tasks</option> : tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>

            <textarea className="w-full border p-2 rounded text-sm" rows={2} placeholder="Reason..." value={reason} onChange={e => setReason(e.target.value)} />
            
            <button type="submit" disabled={loading || !selectedTask} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded shadow disabled:opacity-50">
              {loading ? 'Saving...' : 'Add Time Entry'}
            </button>
          </form>
        </div>

        {/* READ-ONLY LIST (For Context) */}
        <div className="lg:col-span-2">
           <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg text-gray-700">Logs for {date}</h2>
                <span className="text-sm bg-gray-100 px-3 py-1 rounded text-gray-600">User: <b>{users.find(u => u.id == selectedUserId)?.name}</b></span>
           </div>
           
           <div className="bg-white rounded shadow border border-gray-200 overflow-hidden divide-y divide-gray-100">
             {manualEntries.length === 0 && <div className="p-8 text-center text-gray-400 italic">No logs found for this date.</div>}
             
             {manualEntries.map((entry, index) => (
               <div key={entry.id || index} className="p-4 flex justify-between items-center hover:bg-gray-50">
                 <div>
                   <div className="font-bold text-sm text-gray-800">{entry.task?.name || 'Unknown'}</div>
                   <div className="text-xs text-gray-500 uppercase">{entry.task?.project?.name || 'No Project'}</div>
                   {entry.isManual && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1 rounded border border-yellow-200">MANUAL</span>}
                 </div>
                 <div className="text-right">
                    <div className="font-mono text-sm font-bold text-blue-600">
                      {new Date(entry.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - 
                      {entry.endTime ? new Date(entry.endTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ' Active'}
                    </div>
                    <div className="text-xs text-gray-400 font-semibold">{entry.endTime ? getDuration(entry.startTime, entry.endTime) : 'Running'}</div>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}