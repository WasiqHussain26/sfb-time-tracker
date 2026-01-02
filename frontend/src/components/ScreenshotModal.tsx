'use client';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  timestamp: string;
}

export default function ScreenshotModal({ isOpen, onClose, imageUrl, timestamp }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-80 p-4" onClick={onClose}>
      <div className="bg-white p-2 rounded-lg max-w-4xl w-full relative shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-2 px-2 border-b pb-2">
          <h3 className="font-bold text-gray-700">
            📸 Captured at: {new Date(timestamp).toLocaleTimeString()}
          </h3>
          <button onClick={onClose} className="text-red-500 font-bold text-2xl hover:text-red-700">&times;</button>
        </div>
        <div className="flex justify-center bg-gray-100 p-2 rounded">
           <img src={imageUrl} alt="Screenshot" className="max-h-[80vh] w-auto rounded border border-gray-300" />
        </div>
      </div>
    </div>
  );
}