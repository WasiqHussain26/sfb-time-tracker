'use client';

interface TimelineBarProps {
  sessions: any[];
}

export default function TimelineBar({ sessions }: TimelineBarProps) {
  // Helper to convert time to percentage (0% to 100% of the day)
  const getPosition = (dateString: string) => {
    const date = new Date(dateString);
    const totalSeconds = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
    return (totalSeconds / 86400) * 100;
  };

  const getWidth = (start: string, end: string | null) => {
    if (!end) return 0.5; // If running, show a tiny blip
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const diffSeconds = (e - s) / 1000;
    return (diffSeconds / 86400) * 100;
  };

  return (
    <div className="relative w-full h-8 bg-gray-100 rounded border border-gray-300 overflow-hidden">
      {/* Background Grid Lines (00, 04, 08, 12, 16, 20) */}
      <div className="absolute inset-0 flex">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex-1 border-r border-gray-200 h-full relative">
            <span className="absolute bottom-0.5 right-1 text-[8px] text-gray-400">
              {(i + 1) * 4}:00
            </span>
          </div>
        ))}
      </div>
      <div className="absolute top-0 bottom-0 left-0 border-r border-gray-200 h-full">
         <span className="absolute bottom-0.5 left-1 text-[8px] text-gray-400">00:00</span>
      </div>

      {/* Session Blocks */}
      {sessions.map((session: any) => {
        const left = getPosition(session.startTime);
        const width = getWidth(session.startTime, session.endTime);
        
        return (
          <div
            key={session.id}
            className="absolute top-2 bottom-2 bg-green-600 rounded-sm hover:bg-green-500 cursor-pointer"
            style={{
              left: `${left}%`,
              width: `${Math.max(width, 0.2)}%`, // Minimum width so short tasks are visible
            }}
            title={`${new Date(session.startTime).toLocaleTimeString()} - ${session.endTime ? new Date(session.endTime).toLocaleTimeString() : 'Now'}`}
          />
        );
      })}
    </div>
  );
}