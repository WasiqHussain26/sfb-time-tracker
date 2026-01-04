'use client';
import { useState, useEffect } from 'react';
import ScreenshotModal from '@/components/ScreenshotModal';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// --- ICONS ---
const Icons = {
  User: () => <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Calendar: () => <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  Time: () => <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Trash: () => <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
};

// --- HELPERS ---
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

// --- DELETE DIALOG ---
const DeleteConfirmation = ({ onConfirm, onCancel }: any) => (
  <div className="flex flex-col gap-3 min-w-[200px]">
    <p className="font-bold text-slate-800 text-sm">Delete this entry?</p>
    <div className="flex gap-2 justify-end">
      <button onClick={onCancel} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition">Cancel</button>
      <button onClick={onConfirm} className="px-3 py-1.5 text-xs font-bold bg-red-500 text-white rounded-lg hover:bg-red-600 transition shadow-sm">Delete</button>
    </div>
  </div>
);

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

  useEffect(() => {
    const fetchUsers = async () => {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (!userStr || !token) return;
      const u = JSON.parse(userStr);

      if (u.role === 'EMPLOYEE') {
        setUsers([u]);
        setSelectedUserId(u.id);
      } else {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
          const data = await res.json();
          if (Array.isArray(data)) {
            setUsers(data);
            if (data.length > 0 && !selectedUserId) setSelectedUserId(data[0].id);
          }
        } catch (e) { console.error(e); }
      }
    };
    fetchUsers();
  }, []);

  const fetchSessions = async () => {
    if (!selectedUserId) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/timeline?userId=${selectedUserId}&date=${selectedDate}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchSessions(); }, [selectedUserId, selectedDate]);

  const handleDeleteClick = (sessionId: number) => {
    toast.custom((t) => (
      <DeleteConfirmation onCancel={() => toast.dismiss(t.id)} onConfirm={() => { toast.dismiss(t.id); proceedDelete(sessionId); }} />
    ), { duration: Infinity });
  };

  const proceedDelete = async (sessionId: number) => {
    const toastId = toast.loading("Deleting...");
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/time-tracking/${sessionId}?userId=${currentUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Deleted!", { id: toastId });
        fetchSessions();
      } else {
        toast.error("Failed", { id: toastId });
      }
    } catch (e) { toast.error("Error", { id: toastId }); }
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 font-sans">

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">User Timeline</h1>
        <p className="text-slate-500 mt-1">Detailed visual breakdown of daily activity.</p>
      </div>

      {/* CONTROLS */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-8 flex flex-wrap items-center gap-6">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Icons.User /> Select User</label>
          <select
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-medium min-w-[200px]"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            disabled={currentUser?.role === 'EMPLOYEE'}
          >
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="w-px h-10 bg-slate-100 hidden md:block" />
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Icons.Calendar /> Date</label>
          <input type="date" className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-medium" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>
      </div>

      {/* VISUALIZATION (Sticky) */}
      <div className="sticky top-4 z-30 bg-white p-6 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">24-Hour Visualization</h2>
          <div className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
            Total Events: {sessions.length}
          </div>
        </div>
        <div className="relative w-full h-16 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mt-2">
          {[...Array(25)].map((_, i) => (
            <div key={`hour-${i}`} className="absolute top-0 bottom-0 border-r border-slate-200 text-[9px] text-slate-400 pt-1 pl-1 transition-opacity hover:opacity-100" style={{ left: `${(i / 24) * 100}%` }}>{i}</div>
          ))}
          {sessions.map((session, index) => {
            const startPct = getLeftPercentage(session.startTime);
            const widthPct = getWidthPercentage(session.startTime, session.endTime);
            const isBreak = session.notes?.startsWith('[BREAK]');
            return (
              <div key={`bar-${session.id}-${index}`}
                className={`absolute h-8 top-6 rounded-sm opacity-90 border-l border-r hover:opacity-100 cursor-help transition-all shadow-sm ${isBreak ? 'bg-amber-400 border-amber-600' : 'bg-blue-500 border-blue-600'}`}
                style={{ left: `${startPct}%`, width: `${widthPct}%`, minWidth: '4px' }}
                title={`${isBreak ? 'BREAK: ' : ''}${session.task?.name || 'No Task'} (${formatDurationText((new Date(session.endTime || new Date()).getTime() - new Date(session.startTime).getTime()) / 1000)})`}
              />
            );
          })}
        </div>
      </div>

      {/* SESSION CARDS */}
      <div className="space-y-4">
        <AnimatePresence>
          {sessions.map((session, index) => {
            const startTime = new Date(session.startTime);
            const endTime = session.endTime ? new Date(session.endTime) : new Date();
            const durationSec = (endTime.getTime() - startTime.getTime()) / 1000;
            const isBreak = session.notes?.startsWith('[BREAK]');
            const isOwner = session.userId === currentUser?.id;
            const canDelete = isOwner || currentUser?.role === 'EMPLOYER';

            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={`list-${session.id}`}
                className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${isBreak ? 'border-amber-100' : 'border-slate-100'}`}
              >
                <div className={`px-6 py-4 flex justify-between items-center ${isBreak ? 'bg-amber-50/50' : 'bg-slate-50/50'} border-b ${isBreak ? 'border-amber-100' : 'border-slate-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`text-sm font-bold font-mono ${isBreak ? 'text-amber-700' : 'text-slate-700'}`}>
                      {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {session.endTime ? endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                    </div>
                    <span className="text-xs font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-100 shadow-sm">{formatDurationText(durationSec)}</span>
                    {isBreak && <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Break</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${session.endTime ? 'bg-slate-300' : 'bg-green-500 animate-pulse ring-2 ring-green-200'}`} />
                    {session.endTime && canDelete && (
                      <button onClick={() => handleDeleteClick(session.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Icons.Trash /></button>
                    )}
                  </div>
                </div>

                <div className="p-6 flex flex-col gap-6">
                  {/* Task Details */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-50 p-3 rounded-xl text-blue-600 shadow-sm border border-blue-100"><Icons.Time /></div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-lg leading-tight">{session.task?.name || 'Untitled Task'}</h4>
                        <p className="text-sm text-slate-500 font-medium mt-1">{session.task?.project?.name || 'No Project'}</p>
                      </div>
                    </div>
                    {session.notes && !isBreak && (
                      <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-600 italic">
                        "{session.notes}"
                      </div>
                    )}
                    {session.isManual && <span className="mt-4 inline-block text-[10px] bg-amber-50 text-amber-600 px-2 py-1 rounded border border-amber-100 font-bold uppercase">Manual Entry</span>}
                  </div>

                  {/* Screenshots - Full Width Filmstrip */}
                  {session.screenshots && session.screenshots.length > 0 && (
                    <div className="w-full border-t border-slate-50 pt-4">
                      <h5 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                        <span>Screenshots</span>
                        <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px]">{session.screenshots.length}</span>
                      </h5>
                      <div className="flex gap-3 overflow-x-auto pb-4 pt-1 px-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        {session.screenshots.map((shot: any, sIdx: number) => (
                          <div
                            key={sIdx}
                            className="relative group cursor-pointer flex-shrink-0"
                            onClick={() => { setSelectedImage(shot.imageUrl); setSelectedTime(shot.capturedAt); }}
                          >
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg z-10" />
                            <img
                              src={shot.imageUrl}
                              className="h-24 w-auto rounded-lg border border-slate-200 shadow-sm transition-transform group-hover:scale-[1.02]"
                              loading="lazy"
                            />
                            <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-20">
                              {new Date(shot.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!session.screenshots || session.screenshots.length === 0) && !isBreak && (
                    <div className="border-t border-slate-50 pt-2">
                      <p className="text-xs text-slate-300 italic">No screenshots captured.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 text-slate-300"><Icons.Calendar /></div>
            <p className="text-slate-400 font-medium">No activity found for this date.</p>
          </div>
        )}
      </div>
      <ScreenshotModal isOpen={!!selectedImage} onClose={() => setSelectedImage(null)} imageUrl={selectedImage || ''} timestamp={selectedTime} />
    </div>
  );
}