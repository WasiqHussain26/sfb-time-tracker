import { useState, useEffect, useRef } from 'react';
import { uploadScreenshot } from './supabase';

const electron = window.require ? window.require('electron') : null;
const ipcRenderer = electron ? electron.ipcRenderer : null;

const API_URL = 'https://sfb-backend.vercel.app';

interface TrackerProps {
  user: any;
  token: string;
  onLogout: () => void;
}

export default function TrackerDashboard({ user, token, onLogout }: TrackerProps) {
  // CONFIG: Get limit from user DB settings (default to 5 mins)
  const AUTO_STOP_LIMIT_MINUTES = user.autoStopLimit || 5;

  // --- STATE ---
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  
  // Selection
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  
  // Timer & Stats
  const [elapsed, setElapsed] = useState(0);
  const [stats, setStats] = useState({ day: 0, week: 0 });
  const [isSystemIdle, setIsSystemIdle] = useState(false);
  
  // STOP NOTES MODAL STATE
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);
  const [stopNotes, setStopNotes] = useState('');
  const [stopLoading, setStopLoading] = useState(false);

  const [isBreakMode, setIsBreakMode] = useState(false);

  // --- REF TO TRACK SESSION WITHOUT RE-RENDERING ---
  const activeSessionRef = useRef(activeSession);
  useEffect(() => { activeSessionRef.current = activeSession; }, [activeSession]);

  // --- 1. INITIAL LOAD & LISTENERS ---
  useEffect(() => {
    fetchProjects();
    checkActiveSession();
    fetchStats();

    if (ipcRenderer) {
      // IDLE LISTENER
      ipcRenderer.on('system-idle-status', (_event: any, idleSeconds: number) => {
        const isIdle = idleSeconds >= 60; // Visual "Yellow" status
        setIsSystemIdle(isIdle);
        
        // --- AUTO-STOP LOGIC ---
        if (activeSessionRef.current) {
            // Check if idle time exceeds limit
            if (idleSeconds >= (AUTO_STOP_LIMIT_MINUTES * 60)) {
                console.log(`🛑 Auto-stopping due to inactivity.`);
                handleStopTimer(true); 
                new Notification("Timer Stopped", { 
                    body: `Timer stopped automatically due to inactivity (${AUTO_STOP_LIMIT_MINUTES}m limit).` 
                });
            }
        }
      });
      
      // TRIGGER TOGGLE (System Tray)
      ipcRenderer.on('trigger-timer-toggle', () => {
        if (activeSessionRef.current) handleStopTimer(false);
        else handleStartTimer();
      });

      // SECURITY: HEARTBEAT CHECK
      const heartbeatInterval = setInterval(async () => {
         try {
           const res = await fetch(`${API_URL}/users/${user.id}`, { 
             headers: { Authorization: `Bearer ${token}` }
           });
           
           // --- FIX: Commented out logout to prevent loops ---
           if (res.status === 401 || res.status === 403) { 
             console.error("❌ TOKEN REJECTED (Heartbeat) - Keeping session for debug");
             // onLogout(); // <--- DISABLED LOGOUT
             return; 
           }
           
           const data = await res.json();
           if (data.status === 'DISABLED') {
             console.error("⛔ Account is DISABLED. Logging out...");
             onLogout();
           }
         } catch (e) {
            console.warn("Heartbeat failed (Network issue?)");
         }
      }, 30000); 

      return () => {
        ipcRenderer.removeAllListeners('system-idle-status');
        ipcRenderer.removeAllListeners('trigger-timer-toggle');
        clearInterval(heartbeatInterval);
      };
    }
  }, []);

  // --- 2. WIDGET SYNC ---
  useEffect(() => {
    if (ipcRenderer) {
      const timeStr = activeSession ? formatTimerBig(elapsed) : '00h 00m';
      const taskName = activeSession?.task?.name || 'No Task';
      
      ipcRenderer.send('update-widget', {
        time: timeStr,
        task: taskName,
        isRunning: !!activeSession
      });
    }
  }, [elapsed, activeSession]);

  // --- 3. TIMER TICKER ---
  useEffect(() => {
    let interval: any;
    if (activeSession) {
      interval = setInterval(() => {
        const start = new Date(activeSession.startTime).getTime();
        const now = new Date().getTime();
        setElapsed(Math.floor((now - start) / 1000));
      }, 1000);
    } else { setElapsed(0); }
    return () => clearInterval(interval);
  }, [activeSession]);

  // --- 4. SCREENSHOT LOGIC (FIXED) ---
  useEffect(() => {
    // If no session ID, don't start the cycle
    if (!activeSession?.id) return;

    // FIX: Use 'any' to prevent TypeScript errors
    let screenshotTimeout: any;

    const scheduleNextScreenshot = () => {
      // Random interval between 5 and 10 minutes
      const min = 300000; 
      const max = 600000; 
      const randomTime = Math.floor(Math.random() * (max - min + 1) + min);
      
      console.log(`📸 Next screenshot cycle in ${Math.floor(randomTime / 60000)} minutes`);

      screenshotTimeout = setTimeout(async () => {
        // Use REF to safely check active state inside the timeout
        if (!activeSessionRef.current) return; 

        try {
          if (!ipcRenderer) return;
          
          // 1. Get ARRAY of images (Works for Single OR Dual screens)
          const images: string[] = await ipcRenderer.invoke('capture-screen');
          
          // 2. Loop through and upload EACH screen found
          // If user has 1 screen, this loop runs once.
          for (const [index, image] of images.entries()) {
              const url = await uploadScreenshot(image, user.id.toString());
              console.log(`✅ Screen ${index + 1} Uploaded:`, url);

              // 3. Save to Backend
              await fetch(`${API_URL}/reports/screenshot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  timeSessionId: activeSessionRef.current.id,
                  imageUrl: url,
                  capturedAt: new Date()
                })
              });
          }

        } catch (err) {
          console.error("❌ Screenshot Cycle Error", err);
        } finally {
           // 4. ALWAYS reschedule if session is still active
           if (activeSessionRef.current) {
              scheduleNextScreenshot();
           }
        }
      }, randomTime);
    };

    // Start the first cycle immediately
    scheduleNextScreenshot();

    // Cleanup: Only clear if the session ID changes (user stops timer)
    return () => clearTimeout(screenshotTimeout);
    
  }, [activeSession?.id]); 

  // --- 5. API CALLS ---
  const fetchProjects = async () => {
      try {
        const res = await fetch(`${API_URL}/projects`, { headers: { Authorization: `Bearer ${token}` } });
        
        // --- FIX: Commented out logout to prevent loops ---
        if (res.status === 401 || res.status === 403) { 
             console.error("❌ TOKEN REJECTED (FetchProjects) - Keeping session for debug");
             // onLogout(); // <--- DISABLED LOGOUT
             return; 
        }

        const data = await res.json();
        if (Array.isArray(data)) {
            setProjects(data);
            if (data.length > 0 && !selectedProjectId) handleProjectChange(data[0].id);
        }
      } catch (e) { console.error(e); }
  };
  
  const fetchTasksForProject = async (projId: string) => { 
      try {
        const res = await fetch(`${API_URL}/projects/${projId}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        const myTasks = (data.tasks || []).filter((t: any) => t.isOpenToAll || t.assignees?.some((u: any) => u.id === user.id));
        setTasks(myTasks);
        if (myTasks.length > 0 && !activeSession) setSelectedTaskId(myTasks[0].id);
      } catch (e) { console.error(e); }
  };

  const checkActiveSession = async () => { 
      try {
        const res = await fetch(`${API_URL}/time-tracking/active?userId=${user.id}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data && data.id) {
            setActiveSession(data);
            setSelectedProjectId(data.task.projectId);
            fetchTasksForProject(data.task.projectId); 
            setSelectedTaskId(data.taskId);
        }
      } catch (e) { console.error(e); }
  };
  
  const fetchStats = async () => { 
      try {
          const res = await fetch(`${API_URL}/reports/stats?userId=${user.id}`, { headers: { Authorization: `Bearer ${token}` } });
          const data = await res.json();
          if (data) setStats({ day: data.day, week: data.week });
      } catch (e) { console.error(e); }
  };

  // --- HANDLERS ---
  const handleProjectChange = (projId: string) => {
    setSelectedProjectId(projId);
    fetchTasksForProject(projId);
  };

  const handleStartTimer = async () => {
    if (!selectedTaskId) return alert("Please select a task first");
    try {
      const res = await fetch(`${API_URL}/time-tracking/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: user.id, taskId: Number(selectedTaskId) })
      });
      if (res.ok) {
        const session = await res.json();
        setActiveSession(session);
      }
    } catch (err) { console.error(err); }
  };

  const handleStopTimer = async (isAutoStop = false, isBreak = false) => {
    if (isAutoStop) {
        await executeStop(`Auto-stopped due to inactivity (${AUTO_STOP_LIMIT_MINUTES}m limit).`);
        return;
    }

    setStopNotes(''); 
    setIsBreakMode(isBreak); 
    setIsStopModalOpen(true);
  };

  const handleConfirmManualStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stopNotes.trim()) return alert("Notes are compulsory for documentation.");
    
    setStopLoading(true);
    const finalNote = isBreakMode ? `[BREAK] ${stopNotes}` : stopNotes;
    await executeStop(finalNote);
    
    setStopLoading(false);
    setIsStopModalOpen(false);
    if (isBreakMode) {
        new Notification("Break Started", { body: "Your session has been saved and timer paused." });
    }
  };

  const executeStop = async (notes: string) => {
      try {
        const res = await fetch(`${API_URL}/time-tracking/stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ 
                userId: user.id, 
                idleTime: 0, 
                notes: notes 
            }) 
        });
        if (res.ok) {
            setActiveSession(null);
            setElapsed(0);
            setIsSystemIdle(false);
            fetchStats();
        }
      } catch (err) { console.error(err); }
  };

  // Helpers
  const formatTimerBig = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`; 
  };
  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    return `${h}h ${m}m`;
  };

  return (
    <div className="h-screen flex flex-col bg-white text-gray-800 text-sm overflow-hidden select-none">
      
      {/* HEADER */}
      <div className="bg-white border-b border-gray-300 p-2 flex justify-between items-center shadow-sm h-12">
        <div className="flex items-center gap-2 text-blue-600 font-semibold cursor-pointer hover:underline" onClick={fetchStats}>
          <span className="text-lg">↻</span>
        </div>
        
        <div className="flex items-center gap-2 font-bold text-blue-600">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs">
            {user.name?.charAt(0)}
          </div>
          {user.name} <span className="text-xs text-red-500">(v1.0.4 FIX)</span>
        </div>

        <div className="flex gap-1">
          <button onClick={onLogout} className="bg-[#4285f4] hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium transition">⏻</button>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="p-4 space-y-4 border-b border-gray-200">
        <div className="flex items-center">
          <label className="w-20 text-right pr-3 text-gray-600 text-sm">Project</label>
          <select value={selectedProjectId} onChange={(e) => handleProjectChange(e.target.value)} disabled={!!activeSession} className="flex-1 border border-gray-300 rounded px-2 py-1.5 bg-white text-gray-800 focus:border-blue-500 outline-none shadow-sm">
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex items-center">
          <label className="w-20 text-right pr-3 text-gray-600 text-sm">Task</label>
          <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)} disabled={!!activeSession} className="flex-1 border border-gray-300 rounded px-2 py-1.5 bg-white text-gray-800 focus:border-blue-500 outline-none shadow-sm">
            {tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {!activeSession ? (
          <button onClick={handleStartTimer} className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold text-lg py-3 rounded shadow transition transform active:scale-[0.99] flex justify-center items-center gap-2">
            ▶ START TIMER
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={() => handleStopTimer(false, true)} 
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded shadow transition flex justify-center items-center gap-2"
            >
              ☕ BREAK
            </button>
            <button 
              onClick={() => handleStopTimer(false, false)} 
              className="flex-1 bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold py-3 rounded shadow transition flex justify-center items-center gap-2"
            >
              STOP
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 divide-x divide-gray-300 text-center py-2 bg-gray-50 border border-gray-200 rounded">
          <div>
            <div className="text-[10px] text-green-600 font-bold uppercase">Today</div>
            <div className="text-xs font-bold text-gray-800">{formatTime(stats.day + elapsed)}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-600 font-bold uppercase">Week Total</div>
            <div className="text-xs font-bold text-gray-800">{formatTime(stats.week + (stats.day + elapsed))}</div>
          </div>
        </div>
      </div>

      {/* RECENT TASKS */}
      <div className="flex-1 bg-[#f0f2f5] flex flex-col overflow-hidden">
         <div className="px-3 py-2 flex items-center justify-between text-blue-500 font-semibold bg-white border-b border-gray-200">
            <div className="flex items-center gap-1 cursor-pointer"><span>★</span> Recent Tasks</div>
            <div className="flex items-center gap-1 text-gray-600 font-normal">
              <span>Status:</span> 
              <span className={`font-bold ${isSystemIdle ? 'text-orange-500' : 'text-green-600'}`}>
                {isSystemIdle ? 'Away' : 'Online'}
              </span>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto bg-white">
            {tasks.map(t => (
                <div key={t.id} className="p-2 border-b border-gray-100 px-3 py-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition" onClick={() => {if(!activeSession) setSelectedTaskId(t.id)}}>
                    <div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                            {projects.find(p=>p.id===selectedProjectId)?.name} <span className="text-[8px]">▶</span>
                        </div>
                        <div className="text-sm font-semibold text-gray-800">{t.name}</div>
                    </div>
                </div>
            ))}
         </div>
      </div>

      {/* --- STOP TIMER NOTES MODAL --- */}
      {isStopModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-white p-5 rounded-lg w-[90%] max-w-sm shadow-2xl">
                <h3 className="text-lg font-bold text-gray-800 mb-2">{isBreakMode ? 'Take a Break' : 'Stop Session'}</h3>
                <p className="text-xs text-gray-500 mb-3">
                  {isBreakMode ? 'Notes are compulsory to start a break.' : 'Please describe what you worked on.'}
                </p>
                <form onSubmit={handleConfirmManualStop}>
                    <textarea 
                        className="w-full border border-gray-300 rounded p-2 text-sm focus:border-blue-500 outline-none h-24 resize-none bg-white text-gray-800"
                        placeholder={isBreakMode ? "e.g. Washroom, Phone call, Tea break..." : "e.g. Fixed navigation bug..."}
                        value={stopNotes}
                        onChange={(e) => setStopNotes(e.target.value)}
                        required
                        autoFocus
                    />
                    <div className="flex gap-2 mt-4 justify-end">
                        <button type="button" onClick={() => setIsStopModalOpen(false)} className="px-3 py-2 text-gray-500 hover:bg-gray-100 rounded text-xs font-bold">CANCEL</button>
                        <button type="submit" disabled={stopLoading} className={`px-4 py-2 rounded text-white text-xs font-bold ${isBreakMode ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}`}>
                            {stopLoading ? 'SAVING...' : (isBreakMode ? 'START BREAK' : 'STOP TIMER')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}