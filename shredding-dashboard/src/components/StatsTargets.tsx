'use client';

import { useState } from 'react';

const ROWS = [
  { type: 'Rest (Low)', color: '#EF9F27', tdee: '~1,990', target: '1,600', protein: '153g', carbs: '75g', fat: '76g' },
  { type: 'Push (Low)', color: '#E24B4A', tdee: '~2,485', target: '2,100', protein: '153g', carbs: '100g', fat: '121g' },
  { type: 'Pull (Low)', color: '#378ADD', tdee: '~2,520', target: '2,100', protein: '153g', carbs: '100g', fat: '121g' },
  { type: 'Leg (High)', color: '#1D9E75', tdee: '~2,620', target: '2,200', protein: '153g', carbs: '250g', fat: '65g' },
];

export default function StatsTargets() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-[var(--surface)] rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 text-left cursor-pointer"
      >
        <span className="text-sm font-semibold text-[var(--foreground)]">
          Stats & Targets
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-[var(--muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          <p className="text-xs text-[var(--foreground)]">
            <span className="font-semibold">Baseline</span>
            <span className="text-[var(--muted)]"> — 153.3 lbs · 14.3% BF · LBM 131.4 lbs · BMR 1,657 cal</span>
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left text-[10px] uppercase tracking-wider text-[#737373] px-2 py-2 font-medium">Day Type</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-[#737373] px-2 py-2 font-medium">TDEE</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-[#737373] px-2 py-2 font-medium">Target (-400)</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-[#737373] px-2 py-2 font-medium">Protein</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-[#737373] px-2 py-2 font-medium">Carbs</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-[#737373] px-2 py-2 font-medium">Fat</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.type} className="border-b border-[var(--border)] border-opacity-30">
                    <td className="px-2 py-2.5 flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                        style={{ backgroundColor: row.color }}
                      />
                      <span className="text-xs text-[var(--foreground)] whitespace-nowrap">{row.type}</span>
                    </td>
                    <td className="px-2 py-2.5 text-xs text-[var(--muted)]">{row.tdee}</td>
                    <td className="px-2 py-2.5 text-xs text-[var(--foreground)] font-semibold">{row.target}</td>
                    <td className="px-2 py-2.5 text-xs text-[var(--foreground)]">{row.protein}</td>
                    <td className="px-2 py-2.5 text-xs text-[var(--foreground)]">{row.carbs}</td>
                    <td className="px-2 py-2.5 text-xs text-[var(--foreground)]">{row.fat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-[var(--muted)]">
            <span className="font-semibold text-[var(--foreground)]">Deficit:</span> ~400 cal/day → ~0.8 lb/week → 7.3 lbs to lose in ~9 weeks
          </p>

          <details className="group">
            <summary className="text-[11px] font-medium text-[var(--teal)] cursor-pointer hover:underline list-none flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-open:rotate-90"><polyline points="9 6 15 12 9 18"/></svg>
              How the cycle works
            </summary>
            <div className="mt-4 space-y-4">
              {/* Flow diagram */}
              <div className="flex items-stretch gap-0 overflow-x-auto">
                {/* Rest */}
                <div className="flex-1 min-w-[130px]">
                  <div className="rounded-l-lg border border-[var(--border)] p-3 h-full" style={{ borderLeft: '3px solid #EF9F27' }}>
                    <div className="text-[11px] font-bold mb-1.5" style={{ color: '#EF9F27' }}>Day 1 — Rest</div>
                    <div className="space-y-0.5 text-[10px] text-[var(--muted)]">
                      <p>75g carbs · 1,600 cal</p>
                      <p>No exercise drain</p>
                      <p className="text-[var(--foreground)]">Dietary restriction begins depletion</p>
                    </div>
                  </div>
                </div>
                {/* Arrow */}
                <div className="flex flex-col items-center justify-center px-1 shrink-0">
                  <span className="text-[9px] text-[var(--muted)]">depleting</span>
                  <span className="text-[var(--muted)]">→</span>
                </div>
                {/* Push */}
                <div className="flex-1 min-w-[130px]">
                  <div className="border border-[var(--border)] p-3 h-full" style={{ borderLeft: '3px solid #E24B4A' }}>
                    <div className="text-[11px] font-bold mb-1.5" style={{ color: '#E24B4A' }}>Day 2 — Push</div>
                    <div className="space-y-0.5 text-[10px] text-[var(--muted)]">
                      <p>100g carbs · 2,100 cal</p>
                      <p>Chest/shoulders/triceps</p>
                      <p className="text-[var(--foreground)]">Exercise + low carbs = faster drain</p>
                    </div>
                  </div>
                </div>
                {/* Arrow */}
                <div className="flex flex-col items-center justify-center px-1 shrink-0">
                  <span className="text-[9px] text-[var(--muted)]">deeper</span>
                  <span className="text-[var(--muted)]">→</span>
                </div>
                {/* Pull */}
                <div className="flex-1 min-w-[130px]">
                  <div className="border border-[var(--border)] p-3 h-full" style={{ borderLeft: '3px solid #378ADD' }}>
                    <div className="text-[11px] font-bold mb-1.5" style={{ color: '#378ADD' }}>Day 3 — Pull</div>
                    <div className="space-y-0.5 text-[10px] text-[var(--muted)]">
                      <p>100g carbs · 2,100 cal</p>
                      <p>Back/biceps/rear delts</p>
                      <p className="text-[var(--foreground)]">Max depletion → peak fat burning</p>
                    </div>
                  </div>
                </div>
                {/* Arrow */}
                <div className="flex flex-col items-center justify-center px-1 shrink-0">
                  <span className="text-[9px] text-[#1D9E75]">refeed</span>
                  <span className="text-[#1D9E75] font-bold">→</span>
                </div>
                {/* Legs */}
                <div className="flex-1 min-w-[130px]">
                  <div className="rounded-r-lg border border-[var(--border)] p-3 h-full" style={{ borderLeft: '3px solid #1D9E75' }}>
                    <div className="text-[11px] font-bold mb-1.5" style={{ color: '#1D9E75' }}>Day 4 — Legs</div>
                    <div className="space-y-0.5 text-[10px] text-[var(--muted)]">
                      <p>250g carbs · 2,200 cal</p>
                      <p>Squats/leg press/extensions</p>
                      <p className="text-[var(--foreground)]">Glycogen restored, leptin reset</p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-[var(--muted)] text-center">
                Three low days deplete glycogen to maximize fat burning, then one high day restores it before the cycle repeats.
              </p>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded border border-[var(--border)] p-2.5 text-center" style={{ borderTop: '2px solid #E24B4A' }}>
                  <div className="text-sm font-bold" style={{ color: '#E24B4A' }}>-600 cal</div>
                  <div className="text-[10px] text-[var(--muted)] mt-1">Too aggressive</div>
                  <div className="text-[10px] text-[var(--muted)]">Lose muscle, feel terrible</div>
                </div>
                <div className="rounded border-2 p-2.5 text-center" style={{ borderColor: '#1D9E75', backgroundColor: 'rgba(29, 158, 117, 0.08)' }}>
                  <div className="text-sm font-bold" style={{ color: '#1D9E75' }}>-400 cal</div>
                  <div className="text-[10px] text-[var(--foreground)] font-medium mt-1">Sweet spot</div>
                  <div className="text-[10px] text-[var(--muted)]">0.8 lb/week, preserve muscle</div>
                </div>
                <div className="rounded border border-[var(--border)] p-2.5 text-center" style={{ borderTop: '2px solid #EF9F27' }}>
                  <div className="text-sm font-bold" style={{ color: '#EF9F27' }}>-200 cal</div>
                  <div className="text-[10px] text-[var(--muted)] mt-1">Too slow</div>
                  <div className="text-[10px] text-[var(--muted)]">5 months instead of 9 weeks</div>
                </div>
              </div>
              <p className="text-[10px] text-[var(--muted)] text-center">
                At 153 lbs, max safe rate is ~1.5 lb/week. 0.8 lb/week keeps all loss from fat.
              </p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
