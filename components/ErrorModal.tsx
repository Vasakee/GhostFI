"use client";

interface Props {
  error: string;
  onClose: () => void;
}

export function ErrorModal({ error, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-red-700 rounded-2xl p-6 max-w-lg w-full space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-red-400 font-semibold">⚠ Error</p>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <pre className="text-xs text-gray-300 bg-gray-800 rounded-lg p-3 overflow-auto max-h-64 whitespace-pre-wrap break-all">
          {error}
        </pre>
        <button
          onClick={onClose}
          className="w-full bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  );
}
