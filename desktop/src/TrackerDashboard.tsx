
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
  // CONFIG (Dynamic State)
  const [autoStopLimit, setAutoStopLimit] = useState(user.autoStopLimit || 5);
  const autoStopLimitRef = useRef(autoStopLimit);
  useEffect(() => { autoStopLimitRef.current = autoStopLimit; }, [autoStopLimit]);

  // --- STATE ---
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);

  // UPDATE STATE
  const [isUpdateReady, setIsUpdateReady] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

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

  // --- REF ---
  const activeSessionRef = useRef(activeSession);
  const isStoppingRef = useRef(false); // <--- LOCK to prevent loops
  useEffect(() => { activeSessionRef.current = activeSession; }, [activeSession]);

  // --- 1. INITIAL LOAD & LISTENERS ---
  useEffect(() => {
    handleRefresh(); // Load everything on mount

    if (ipcRenderer) {
      // IDLE LISTENER
      ipcRenderer.on('system-idle-status', (_event: any, idleSeconds: number) => {
        const isIdle = idleSeconds >= 60;
        setIsSystemIdle(isIdle);

        // CHECK AUTO-STOP
        if (activeSessionRef.current && !isStoppingRef.current) {
          const limitSeconds = (autoStopLimitRef.current || 5) * 60;

          if (idleSeconds >= limitSeconds) {
            console.log(`🛑 Auto-stopping triggered (Idle: ${idleSeconds}s, Limit: ${limitSeconds}s)`);

            // LOCK immediately preventing further triggers
            isStoppingRef.current = true;

            // Trigger Stop
            handleStopTimer(true).catch(err => {
              console.error("Auto-stop failed:", err);
              isStoppingRef.current = false; // Unlock if it actually failed hard
            });

            new Notification("Timer Stopped", {
              body: `Timer stopped automatically due to inactivity (${autoStopLimitRef.current}m limit).`
            });
          }
        }
      });

      // UPDATE LISTENER
      ipcRenderer.on('update_downloaded', () => {
        console.log("✨ Update Downloaded and Ready!");
        setIsUpdateReady(true);
      });

      // TRIGGER TOGGLE (System Tray)
      ipcRenderer.on('trigger-timer-toggle', () => {
        if (activeSessionRef.current) handleStopTimer(false);
        else handleStartTimer();
      });

      // HEARTBEAT
      const heartbeatInterval = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/users/${user.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (res.status === 401 || res.status === 403) return;

          const data = await res.json();
          if (data.status === 'DISABLED') {
            onLogout();
          }
          // Also sync limit in background
          if (data.autoStopLimit && data.autoStopLimit !== autoStopLimitRef.current) {
            setAutoStopLimit(data.autoStopLimit);
          }
        } catch (e) {
          console.warn("Heartbeat failed");
        }
      }, 30000);

      return () => {
        ipcRenderer.removeAllListeners('system-idle-status');
        ipcRenderer.removeAllListeners('update_downloaded');
        ipcRenderer.removeAllListeners('trigger-timer-toggle');
        clearInterval(heartbeatInterval);
      };
    }
  }, []);

  // --- 2. WIDGET SYNC ---
  useEffect(() => {
    if (ipcRenderer) {
      const timeStr = activeSession ? formatTimerBig(elapsed) : '00:00:00';
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

  // --- 4. SCREENSHOT LOGIC ---
  useEffect(() => {
    if (!activeSession?.id) return;
    let screenshotTimeout: any;

    const scheduleNextScreenshot = () => {
      const min = 300000;
      const max = 600000;
      const randomTime = Math.floor(Math.random() * (max - min + 1) + min);

      screenshotTimeout = setTimeout(async () => {
        if (!activeSessionRef.current) return;

        try {
          if (!ipcRenderer) return;
          const images: string[] = await ipcRenderer.invoke('capture-screen');

          for (const image of images) {
            const url = await uploadScreenshot(image, user.id.toString());
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
          console.error("Screenshot Error", err);
        } finally {
          if (activeSessionRef.current) {
            scheduleNextScreenshot();
          }
        }
      }, randomTime);
    };

    scheduleNextScreenshot();
    return () => clearTimeout(screenshotTimeout);
  }, [activeSession?.id]);

  // --- 5. API CALLS (Data Fetching) ---
  const handleRefresh = async () => {
    fetchProjects();
    checkActiveSession();
    fetchStats();

    // FETCH LATEST SETTINGS (Fix for Inactivity Update)
    try {
      const res = await fetch(`${API_URL}/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.autoStopLimit) {
          setAutoStopLimit(data.autoStopLimit);
          console.log("Updated Auto-Stop Limit to:", data.autoStopLimit);
        }
      }
    } catch (e) { console.error("Failed to refresh user settings", e); }

    // CRITICAL FIX: Reload tasks for current project if selected
    if (selectedProjectId) {
      fetchTasksForProject(selectedProjectId);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/projects`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401 || res.status === 403) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjects(data);
        // Only auto-select if nothing selected
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
      // If we are refreshing and the current selected task is still in the list, keep it. 
      // Otherwise default to first or empty.
      // Logic handled by react state preservation usually, but good to be safe.
      if (myTasks.length > 0 && !activeSession && !selectedTaskId) setSelectedTaskId(myTasks[0].id);
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
      const limit = autoStopLimitRef.current || 5;
      await executeStop(`Auto-stopped due to inactivity (${limit}m limit).`);
      return;
    }
    setStopNotes('');
    setIsBreakMode(isBreak);
    setIsStopModalOpen(true);
  };

  const handleInstallUpdate = async () => {
    setIsUpdating(true);
    if (activeSession) {
      await executeStop("System Auto-Update: Timer stopped to apply updates.");
    }
    if (ipcRenderer) {
      ipcRenderer.send('install-update');
    }
  };

  const handleConfirmManualStop = async (e: React.FormEvent) => {
    e.preventDefault();

    // VALIDATION: Notes mandatory only if NOT break mode
    if (!isBreakMode && !stopNotes.trim()) {
      return alert("Notes are compulsory for documentation.");
    }

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
        isStoppingRef.current = false; // <--- UNLOCK
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
    // THEME: BRAND BLUE (bg-blue-600)
    <div className="h-screen w-full flex flex-col bg-blue-600 text-white font-sans select-none overflow-hidden">

      {/* 1.5 SUB-HEADER (User Info & Refresh) - TOP SPACING INCREASED */}
      <div className="px-3 pt-3 pb-2 flex justify-between items-center shrink-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-white text-blue-600 rounded-full flex items-center justify-center font-bold text-sm shadow-md border-2 border-blue-500/30">
            {user.name?.charAt(0)}
          </div>
          <div>
            <h2 className="text-xs font-bold text-white leading-tight mb-0.5">{user.name}</h2>

            {/* MOVED STATUS INDICATOR HERE */}
            <div className="flex items-center gap-1.5">
              <div className={`flex items-center gap-1 pl-0 pr-1.5 py-0 rounded-full`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isSystemIdle ? 'bg-orange-400' : 'bg-green-400'} shadow-[0_0_5px_rgba(255,255,255,0.6)]`} />
                <span className={`text-[9px] font-bold uppercase tracking-wider ${isSystemIdle ? 'text-orange-200' : 'text-green-200'}`}>
                  {isSystemIdle ? 'Idle' : 'Live'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isUpdateReady && (
            <button
              onClick={handleInstallUpdate}
              disabled={isUpdating}
              className="bg-white text-blue-600 px-2 py-1 rounded-full text-[10px] font-bold animate-pulse shadow-sm transition flex items-center gap-1 mr-1"
            >
              <span>✨ Update</span>
            </button>
          )}
          <button onClick={handleRefresh} className="w-8 h-8 flex items-center justify-center text-blue-100 hover:text-white hover:bg-white/10 rounded-full transition" title="Refresh">
            <span className="text-lg pb-0.5">↻</span>
          </button>
          <button onClick={onLogout} className="w-8 h-8 flex items-center justify-center text-blue-100 hover:text-white hover:bg-white/10 rounded-full transition" title="Logout">
            <span className="text-lg pb-0.5">⏻</span>
          </button>
        </div>
      </div>

      {/* 2. FIXED CONTROLS AREA (NO SCROLL) */}
      <div className="p-3 space-y-3 shrink-0 z-10 relative">

        {/* TIMER DISPLAY CARD - WHITE */}
        <div className="bg-white rounded-xl p-3 shadow-xl relative overflow-hidden group">
          {/* Gradient Line */}
          {activeSession && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 animate-gradient-x"></div>}

          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Total Time</p>
              <h1 className={`text-3xl font-mono font-bold tracking-tight ${activeSession ? 'text-blue-600' : 'text-slate-800'}`}>
                {activeSession ? formatTimerBig(elapsed) : '00:00:00'}
              </h1>
            </div>
            {activeSession && (
              <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-600 text-[9px] font-bold rounded-full uppercase animate-pulse">
                REC
              </span>
            )}
          </div>

          {!activeSession ? (
            <button
              onClick={handleStartTimer}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg shadow-md font-bold text-xs tracking-wide transition active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>▶</span> START TIMER
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => handleStopTimer(false, true)}
                className="flex-1 bg-orange-100 hover:bg-orange-200 text-orange-600 py-2.5 rounded-lg font-bold text-xs tracking-wide transition"
              >
                ☕ BREAK
              </button>
              <button
                onClick={() => handleStopTimer(false, false)}
                className="flex-1 bg-red-100 hover:bg-red-200 text-red-600 py-2.5 rounded-lg font-bold text-xs tracking-wide transition"
              >
                ■ STOP
              </button>
            </div>
          )}
        </div>

        {/* SELECTORS ROW */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-blue-100 uppercase mb-1 ml-1">Project</label>
            <div className="relative">
              <select
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                disabled={!!activeSession}
                className="w-full appearance-none bg-white text-slate-800 border-none text-xs rounded-lg pl-3 pr-6 py-2.5 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-md transition"
              >
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-blue-100 uppercase mb-1 ml-1">Task</label>
            <div className="relative">
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                disabled={!!activeSession}
                className="w-full appearance-none bg-white text-slate-800 border-none text-xs rounded-lg pl-3 pr-6 py-2.5 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-md transition"
              >
                {tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* STATS STRIP - WHITE */}
        <div className="flex divide-x divide-slate-100 bg-white rounded-lg shadow-md">
          <div className="flex-1 py-2 text-center">
            <div className="text-[9px] uppercase font-bold text-slate-400">Today</div>
            <div className="text-xs font-bold text-slate-800">{formatTime(stats.day + elapsed)}</div>
          </div>
          <div className="flex-1 py-2 text-center">
            <div className="text-[9px] uppercase font-bold text-slate-400">Week</div>
            <div className="text-xs font-bold text-slate-800">{formatTime(stats.week + (stats.day + elapsed))}</div>
          </div>
        </div>
      </div>

      {/* 3. SCROLLABLE RECENT TASKS */}
      <div className="flex-1 flex flex-col bg-white rounded-t-2xl min-h-0 shadow-[0_-4px_20px_rgba(0,0,0,0.2)] mx-2 mb-0 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 shrink-0">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <span className="text-blue-500">★</span> Recent Tasks
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden p-1">
          {tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
              <p>No recent tasks</p>
            </div>
          )}
          {tasks.map(t => (
            <div
              key={t.id}
              onClick={() => { if (!activeSession) setSelectedTaskId(t.id) }}
              className={`px-3 py-2.5 mb-1 rounded-lg cursor-pointer transition flex justify-between items-center group
                        ${selectedTaskId === t.id.toString() ? 'bg-blue-50 ring-1 ring-blue-100' : 'hover:bg-slate-50'}
                    `}
            >
              <div className="min-w-0">
                <div className="text-[9px] font-bold text-slate-400 mb-0.5 truncate group-hover:text-slate-500 transition-colors">
                  {projects.find(p => p.id === selectedProjectId)?.name}
                </div>
                <div className={`text-xs font-medium truncate ${selectedTaskId === t.id.toString() ? 'text-blue-600' : 'text-slate-700'}`}>
                  {t.name}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. MODAL OVERLAY */}
      {isStopModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-sm" />
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[280px] relative z-10 overflow-hidden animate-scale-in">

            <div className={`p-3 ${isBreakMode ? 'bg-orange-50' : 'bg-red-50'} border-b ${isBreakMode ? 'border-orange-100' : 'border-red-100'}`}>
              <h3 className={`text-sm font-bold ${isBreakMode ? 'text-orange-800' : 'text-red-800'}`}>
                {isBreakMode ? 'Take a Break' : 'Stop Session'}
              </h3>
            </div>

            <div className="p-3">
              <form onSubmit={handleConfirmManualStop}>
                <textarea
                  className="w-full border border-slate-200 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none h-20 resize-none bg-slate-50 text-slate-800 placeholder-slate-400"
                  placeholder={isBreakMode ? "Notes (Optional)" : "What did you work on? (Compulsory)"}
                  value={stopNotes}
                  onChange={(e) => setStopNotes(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2 mt-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsStopModalOpen(false)}
                    className="px-3 py-2 text-slate-500 hover:bg-slate-100 rounded text-[10px] font-bold transition"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={stopLoading}
                    className={`px-4 py-2 rounded text-white text-[10px] font-bold shadow-sm transition active:scale-95 ${isBreakMode ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-600 hover:bg-red-700'}`}
                  >
                    {stopLoading ? '...' : (isBreakMode ? 'BREAK' : 'STOP')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}