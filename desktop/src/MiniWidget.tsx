import { useState, useEffect } from 'react';

// Use optional chaining for safety
const electron = window.require ? window.require('electron') : null;
const ipcRenderer = electron ? electron.ipcRenderer : null;

export default function MiniWidget() {
  const [taskName, setTaskName] = useState('Default Task');
  const [time, setTime] = useState('00h 00m');
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.on('sync-widget-data', (_event: any, data: any) => {
        setTaskName(data.task || 'No Active Task');
        setTime(data.time || '00h 00m');
        setIsRunning(data.isRunning);
      });
    }
  }, []);

  const handleToggle = () => { if (ipcRenderer) ipcRenderer.send('widget-toggle-timer'); };
  const handleExpand = () => { if (ipcRenderer) ipcRenderer.send('expand-main-window'); };
  const handleHide = () => { if (ipcRenderer) ipcRenderer.send('hide-widget'); };

  return (
    <div className="h-screen w-screen bg-[#f3f4f6] flex items-center justify-between px-3 border border-gray-400 select-none overflow-hidden">
      <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'drag' } as any}>
        <div className="cursor-move text-gray-500">
           <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M19 9l3 3-3 3M15 19l-3 3-3-3M2 12h20M12 2v20"/></svg>
        </div>
        <div className="w-8 h-8 bg-black rounded flex items-center justify-center cursor-pointer hover:opacity-80 transition" onClick={handleExpand} style={{ WebkitAppRegion: 'no-drag' } as any}>
          <span className="text-blue-500 font-bold text-sm">SF</span>
        </div>
      </div>

      <div className="flex-1 px-4 flex flex-col justify-center overflow-hidden">
         <div className="flex items-center gap-2">
            <span className={`text-xs font-bold uppercase ${isRunning ? 'text-green-600' : 'text-red-500'}`}>
              {isRunning ? 'Active' : 'On Break'}
            </span>
         </div>
         <div 
            className="text-sm font-semibold text-gray-800 truncate cursor-pointer hover:underline decoration-blue-500"
            onClick={handleExpand}
            title={taskName}
         >
            {taskName}
         </div>
      </div>

      <div className="font-mono font-bold text-gray-900 text-lg mr-4">
        {time}
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={handleToggle}
          className={`px-4 py-1.5 rounded text-white font-bold text-xs shadow transition ${isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
        >
          {isRunning ? 'Stop' : 'Start'}
        </button>

        <button onClick={handleHide} className="text-yellow-600 hover:text-yellow-700 text-xs font-bold px-2">
          Hide
        </button>
      </div>
    </div>
  );
}