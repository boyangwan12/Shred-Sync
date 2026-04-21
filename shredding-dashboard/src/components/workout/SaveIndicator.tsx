'use client';

import { useEffect, useState } from 'react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function SaveIndicator({ status }: { status: SaveStatus }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status === 'saving' || status === 'error') {
      setVisible(true);
    } else if (status === 'saved') {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [status]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {status === 'saving' && (
        <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--muted)] shadow-lg">
          <svg
            className="animate-spin h-4 w-4 text-[var(--teal)]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Saving...
        </div>
      )}
      {status === 'saved' && (
        <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--teal)] rounded-lg px-3 py-2 text-sm text-[var(--teal)] shadow-lg">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Saved
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--red)] rounded-lg px-3 py-2 text-sm text-[var(--red)] shadow-lg">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Save failed
        </div>
      )}
    </div>
  );
}
