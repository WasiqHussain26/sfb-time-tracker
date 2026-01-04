import { useState, useEffect } from 'react';

// Use optional chaining for safety
const electron = window.require ? window.require('electron') : null;
const ipcRenderer = electron ? electron.ipcRenderer : null;

export default function MiniWidget() {
  const [taskName, setTaskName] = useState('Ready to Track');
  const [time, setTime] = useState('00:00:00');
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.on('sync-widget-data', (_event: any, data: any) => {
        setIsRunning(data.isRunning);
        setTime(data.time || '00:00:00');

        // Smart Task Name Display
        if (data.isRunning) {
          setTaskName(data.task || 'No Active Task');
        } else {
          // STOPPED STATE
          if (data.task && data.task !== 'No Active Task') {
            setTaskName(`Resume: ${data.task}`);
          } else {
            setTaskName('Ready to Track');
          }
        }
      });
    }
  }, []);

  const handleToggle = () => { if (ipcRenderer) ipcRenderer.send('widget-toggle-timer'); };

  const handleBreak = () => {
    if (ipcRenderer) {
      ipcRenderer.send('widget-trigger-break');
    }
  };

  const handleExpand = () => { if (ipcRenderer) ipcRenderer.send('expand-main-window'); };
  const handleHide = () => { if (ipcRenderer) ipcRenderer.send('hide-widget'); };

  return (
    // MAIN CONTAINER: No Scroll, Fixed Size, "Capsule" look
    <div className="h-screen w-screen bg-slate-900 text-white flex items-center pr-2 pl-0 overflow-hidden select-none border border-slate-700 shadow-2xl">

      {/* 1. DRAG HANDLE (Left Stripe) */}
      <div
        className="h-full w-6 bg-slate-800 hover:bg-slate-700 cursor-move flex flex-col items-center justify-center gap-0.5 border-r border-slate-700 transition"
        style={{ WebkitAppRegion: 'drag' } as any}
        title="Drag to move"
      >
        <div className="w-0.5 h-0.5 bg-slate-500 rounded-full"></div>
        <div className="w-0.5 h-0.5 bg-slate-500 rounded-full"></div>
        <div className="w-0.5 h-0.5 bg-slate-500 rounded-full"></div>
        <div className="w-0.5 h-0.5 bg-slate-500 rounded-full"></div>
        <div className="w-0.5 h-0.5 bg-slate-500 rounded-full"></div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col justify-center px-3 min-w-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {/* Status & Name */}
        <div className="flex items-center gap-2 mb-0.5">
          <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">
            {isRunning ? 'Running' : 'Paused'}
          </span>
        </div>

        {/* Task Name (Truncated) */}
        <div
          className="text-xs font-semibold text-slate-200 truncate cursor-pointer hover:text-blue-400 transition"
          onClick={handleExpand}
          title={taskName}
        >
          {taskName}
        </div>
      </div>

      {/* 3. TIME DISPLAY (Monospace) */}
      <div
        className={`font-mono font-bold text-lg mr-4 tracking-tight ${isRunning ? 'text-white' : 'text-slate-500'}`}
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {time}
      </div>

      {/* 4. ACTION BUTTONS */}
      <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' } as any}>

        {/* Toggle Button */}
        <button
          onClick={handleToggle}
          className={`
            w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition transform active:scale-95
            ${isRunning
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }
          `}
          title={isRunning ? "Stop Timer" : "Start Timer"}
        >
          {isRunning ? (
            <span className="text-xs font-bold">■</span>
          ) : (
            <span className="text-xs font-bold ml-0.5">▶</span>
          )}
        </button>

        {/* Break Button (Only when running) */}
        {isRunning && (
          <button
            onClick={handleBreak}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-orange-600 text-slate-400 hover:text-white border border-slate-700 transition flex items-center justify-center"
            title="Take a Break"
          >
            <span className="text-sm">☕</span>
          </button>
        )}

        {/* Expand / Open App */}
        <button
          onClick={handleExpand}
          className="w-8 h-8 rounded-full bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white border border-slate-700 transition flex items-center justify-center"
          title="Open Main Window"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>

        {/* Close/Hide Widget */}
        <button
          onClick={handleHide}
          className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-300 transition ml-1"
          title="Hide Widget"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}