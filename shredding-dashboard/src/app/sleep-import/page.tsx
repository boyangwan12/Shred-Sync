'use client';

import Link from 'next/link';
import { useState } from 'react';

interface ImportResult {
  updated: number;
  unchanged: number;
  skipped: Array<{ date: string | null; reason: string }>;
}

export default function SleepImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSkipped, setShowSkipped] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const body = new FormData();
      body.set('file', file);
      const res = await fetch('/api/sleep/import', { method: 'POST', body });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || `Upload failed (${res.status})`);
      } else {
        setResult(json);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Import AutoSleep CSV</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Upload an AutoSleep export (.csv). Data is matched to existing daily logs by date (morning-after).
        </p>
      </header>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-[var(--muted)]">Choose CSV file</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-[var(--foreground)] file:bg-[var(--surface-hover)] file:border-0 file:text-[var(--foreground)] file:rounded file:px-3 file:py-1.5 file:mr-3 file:cursor-pointer"
          />
        </label>
        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || busy}
          className="self-start px-4 py-2 rounded bg-[var(--teal)] text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--red)] bg-[color-mix(in_srgb,var(--red)_10%,transparent)] px-4 py-3 text-sm text-[var(--red)]">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">Result</h2>
          <div className="flex flex-col gap-1 text-sm text-[var(--foreground)]">
            <div><span className="tabular-nums font-semibold">{result.updated}</span> updated</div>
            <div><span className="tabular-nums font-semibold">{result.unchanged}</span> unchanged</div>
            <div><span className="tabular-nums font-semibold">{result.skipped.length}</span> skipped</div>
          </div>
          {result.skipped.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowSkipped(v => !v)}
                className="text-xs text-[var(--teal)] hover:underline"
              >
                {showSkipped ? 'Hide' : 'Show'} skipped rows
              </button>
              {showSkipped && (
                <ul className="mt-2 flex flex-col gap-1 text-xs text-[var(--muted)]">
                  {result.skipped.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="tabular-nums">{s.date ?? '—'}</span>
                      <span>{s.reason}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <div>
        <Link href="/cortisol" className="text-sm text-[var(--teal)] hover:underline">
          → Go to Cortisol page
        </Link>
      </div>
    </div>
  );
}
