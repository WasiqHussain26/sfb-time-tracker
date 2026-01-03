'use client';
import { useState, useEffect } from 'react';
import ScreenshotModal from '@/components/ScreenshotModal';
import toast from 'react-hot-toast';

// --- HELPER FUNCTIONS ---
const getWidthPercentage = (start: string, end: string | null) => {
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : new Date().getTime();
  return ((e - s) / (24 * 60 * 60 * 1000)) * 100;
};
const getLeftPercentage = (start: string) => {
  const s = new Date(start);
  const mins = s.getHours() * 60 + s.getMinutes();
  return (mins / (24 * 60)) * 100;
};
const formatDurationText = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
};

// --- DELETE CONFIRMATION ---
const DeleteConfirmation = ({ onConfirm, onCancel }: any) => (
  <div className="flex flex-col gap-2">
    <p className="font-medium text-gray-800">Delete this entry?</p>
    <div className="flex gap-2 justify-end">
      <button onClick={onCancel} className="px-3 py-1 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-50">Cancel</button>
      <button onClick={onConfirm} className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
    </div>
  </div>
);

// --- MAIN COMPONENT ---
export default function TimelinePage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<any>('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isClient, setIsClient] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null); 

  useEffect(() => { 
      setIsClient(true);
      const userStr = localStorage.getItem('user');
      if (userStr) setCurrentUser(JSON.parse(userStr));
  }, []);

  // 1. FETCH USERS (With Auth & Safety)
  useEffect(() => {
    const fetchUsers = async () => {
        const userStr = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        // If no token, we can't fetch. Just return.
        if (!userStr || !token) return;

        const u = JSON.parse(userStr);

        if (u.role === 'EMPLOYEE') {
            setUsers([u]);
            setSelectedUserId(u.id);
        } else {
            try {
                const res = await fetch('https://sfb-backend.vercel.app/users', { 
                    headers: { Authorization: `Bearer ${token}` } 
                });
                const data = await res.json();
                
                // SAFETY CHECK: Ensure data is an array before setting
                if (Array.isArray(data)) {
                    setUsers(data);
                    if (data.length > 0 && !selectedUserId) setSelectedUserId(data[0].id);
                } else {
                    console.error("Failed to load users (Unauthorized or Error):", data);
                    setUsers([]); // Fallback to empty array to prevent map error
                }
            } catch (e) { 
                console.error(e); 
                setUsers([]);
            }
        }
    };
    fetchUsers();
  }, []); // Run once on mount

  // 2. FETCH SESSIONS
  const fetchSessions = async () => {
    if (!selectedUserId) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch(`https://sfb-backend.vercel.app/reports/timeline?userId=${selectedUserId}&date=${selectedDate}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchSessions();
  }, [selectedUserId, selectedDate]);

  // --- DELETE LOGIC ---
  const handleDeleteClick = (sessionId: number) => {
    toast.custom((t) => (
      <DeleteConfirmation 
        onCancel={() => toast.dismiss(t.id)}
        onConfirm={() => { toast.dismiss(t.id); proceedDelete(sessionId); }}
      />
    ), { duration: Infinity });
  };

  const proceedDelete = async (sessionId: number) => {
    const toastId = toast.loading("Deleting...");
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`https://sfb-backend.vercel.app/time-tracking/${sessionId}?userId=${currentUser.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            toast.success("Deleted successfully", { id: toastId });
            fetchSessions();
        } else {
            const err = await res.json();
            toast.error(`Error: ${err.message}`, { id: toastId });
        }
    } catch (e) { toast.error("Network error", { id: toastId }); }
  };

  if (!isClient) return null;

  return (
    <div className="p-6 bg-gray-50 min-h-screen text-gray-800">
      <div className="flex justify-between items-center mb-6">
         <h1 className="text-2xl font-bold text-slate-800">User Timeline</h1>
      </div>

      <div className="flex gap-4 mb-8 bg-white p-4 rounded shadow-sm border border-gray-200">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select User</label>
          <select 
            className="border p-2 rounded w-64 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            disabled={currentUser?.role === 'EMPLOYEE'} 
          >
            {/* SAFE MAP: users is guaranteed to be an array now */}
            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Date</label>
          <input 
            type="date" 
            className="border p-2 rounded bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
          />
        </div>
      </div>

      {/* TIMELINE VISUALIZATION */}
      <div className="bg-white p-6 rounded shadow-sm border border-gray-200 mb-6">
        <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Activity Visualization</h2>
        <div className="relative w-full h-16 bg-gray-100 border border-gray-300 rounded overflow-hidden">
          {[...Array(25)].map((_, i) => (
            <div key={`hour-${i}`} className="absolute top-0 bottom-0 border-r border-gray-200 text-[9px] text-gray-400 pt-1 pl-1" style={{ left: `${(i / 24) * 100}%` }}>{i}</div>
          ))}
          {sessions.map((session, index) => {
             const startPct = getLeftPercentage(session.startTime);
             const widthPct = getWidthPercentage(session.startTime, session.endTime);
             const isBreak = session.notes?.startsWith('[BREAK]');
             
             return (
               <div key={`bar-${session.id}-${index}`} 
                className={`absolute h-8 top-6 rounded-sm opacity-90 border-l border-r ${isBreak ? 'bg-orange-400 border-orange-600' : 'bg-green-500 border-green-600'}`}
                style={{ left: `${startPct}%`, width: `${widthPct}%`, minWidth: '3px' }} 
                title={`${isBreak ? 'BREAK: ' : ''}${session.task?.name}`} 
               />
             );
          })}
        </div>
      </div>

      {/* LOGS LIST */}
      <div className="space-y-4">
        {sessions.length === 0 && <div className="p-8 text-center bg-white border rounded text-gray-400 italic">No activity recorded.</div>}

        {sessions.map((session, index) => {
          const startTime = new Date(session.startTime);
          const endTime = session.endTime ? new Date(session.endTime) : new Date();
          const durationSec = (endTime.getTime() - startTime.getTime()) / 1000;
          const isBreak = session.notes?.startsWith('[BREAK]');
          
          const isOwner = session.userId === currentUser?.id;
          const isEmployer = currentUser?.role === 'EMPLOYER';
          const canDelete = isOwner || isEmployer;

          return (
            <div key={`list-${session.id}-${index}`} className={`bg-white border rounded shadow-sm overflow-hidden hover:shadow-md transition ${isBreak ? 'border-orange-200' : 'border-gray-200'}`}>
              <div className={`${isBreak ? 'bg-orange-50' : 'bg-green-50'} px-4 py-2 border-b flex justify-between items-center`}>
                 <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${isBreak ? 'text-orange-800' : 'text-green-800'}`}>
                      {startTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {session.endTime ? endTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Active'}
                    </span>
                    <span className="text-xs font-medium opacity-70">({formatDurationText(durationSec)})</span>
                    {isBreak && <span className="ml-2 text-[10px] bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded font-bold">BREAK SESSION</span>}
                 </div>
                 <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${session.endTime ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} title="Status"></div>
                    {session.endTime && canDelete && (
                        <button onClick={() => handleDeleteClick(session.id)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded" title="Delete">🗑️</button>
                    )}
                 </div>
              </div>
              <div className="px-4 py-3">
                 <div className="text-sm text-gray-700">
                    <span className="text-gray-500">Project:</span> <span className="font-semibold text-gray-900 mr-4">{session.task?.project?.name || 'No Project'}</span>
                    <span className="text-gray-500">Task:</span> <span className="font-semibold text-gray-900">{session.task?.name}</span>
                 </div>
                 {session.isManual && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1 rounded border border-yellow-200">MANUAL ENTRY</span>}
                 {session.notes && (
                    <div className="mt-2 p-2 bg-gray-50 border-l-4 border-blue-400 rounded text-sm italic text-gray-700">
                        " {session.notes.replace('[BREAK] ', '')} "
                    </div>
                 )}
              </div>
              <div className="px-4 pb-3">
                 {session.screenshots && session.screenshots.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {session.screenshots.map((shot: any, sIdx: number) => (
                        <img key={`img-${sIdx}`} src={shot.imageUrl} className="h-16 w-auto rounded border cursor-pointer hover:border-blue-500" onClick={() => { setSelectedImage(shot.imageUrl); setSelectedTime(shot.capturedAt); }} />
                      ))}
                    </div>
                 ) : <div className="text-xs text-gray-400 italic border-t border-gray-50 pt-2 mt-1">No screenshots.</div>}
              </div>
            </div>
          );
        })}
      </div>
      <ScreenshotModal isOpen={!!selectedImage} onClose={() => setSelectedImage(null)} imageUrl={selectedImage || ''} timestamp={selectedTime} />
    </div>
  );
}