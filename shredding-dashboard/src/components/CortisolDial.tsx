'use client';

import type { BandBoundaries } from '@/lib/cortisol';

interface Props {
  score: number;
  bandBoundaries: BandBoundaries;
}

/**
 * 180° arc gauge. Needle rotates 0..180° over score 0..10.
 * Segment split at 3.0 and 6.0 (half-open intervals per AC-S14).
 * Color tokens from globals.css: --teal (low), --amber (mid), --red (high).
 */
export default function CortisolDial({ score, bandBoundaries }: Props) {
  // With 4 counted signals score caps empirically near 8; dial still maps 0-10.
  const clamped = Math.max(0, Math.min(10, score));
  const angle = (clamped / 10) * 180 - 90; // -90 at 0, +90 at 10
  const [teal0, teal1] = bandBoundaries.teal;
  const [amber0, amber1] = bandBoundaries.amber;
  const [red0, red1] = bandBoundaries.red;

  // Polar→cartesian helper (r=80, cx=100, cy=100). 0° points up (-y).
  // angle in degrees measured clockwise from -90 (leftmost).
  function arcPath(startScore: number, endScore: number): string {
    const toRad = (s: number) => ((s / 10) * 180 - 90) * (Math.PI / 180);
    const r = 80;
    const cx = 100, cy = 100;
    const a0 = toRad(startScore);
    const a1 = toRad(endScore);
    const x0 = cx + r * Math.sin(a0);
    const y0 = cy - r * Math.cos(a0);
    const x1 = cx + r * Math.sin(a1);
    const y1 = cy - r * Math.cos(a1);
    const large = endScore - startScore > 5 ? 1 : 0;
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }

  // Band color for current score
  let currentColor = 'var(--teal)';
  if (score >= red0) currentColor = 'var(--red)';
  else if (score >= amber0) currentColor = 'var(--amber)';

  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 200 120" className="w-full max-w-xs">
        {/* teal segment [0, 3) */}
        <path d={arcPath(teal0, teal1)} stroke="var(--teal)" strokeWidth="14" fill="none" strokeLinecap="butt" opacity="0.85" />
        {/* amber segment [3, 6) */}
        <path d={arcPath(amber0, amber1)} stroke="var(--amber)" strokeWidth="14" fill="none" strokeLinecap="butt" opacity="0.85" />
        {/* red segment [6, 10] */}
        <path d={arcPath(red0, red1)} stroke="var(--red)" strokeWidth="14" fill="none" strokeLinecap="butt" opacity="0.85" />

        {/* Needle */}
        <g transform={`rotate(${angle} 100 100)`}>
          <line x1="100" y1="100" x2="100" y2="30" stroke="var(--foreground)" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="100" cy="100" r="5" fill="var(--foreground)" />
        </g>

        {/* Score text */}
        <text x="100" y="115" textAnchor="middle" fontSize="22" fontWeight="700" fill={currentColor}>
          {score.toFixed(1)}
        </text>
        {/* Scale labels */}
        <text x="18" y="105" textAnchor="middle" fontSize="9" fill="var(--muted)">0</text>
        <text x="182" y="105" textAnchor="middle" fontSize="9" fill="var(--muted)">10</text>
      </svg>
      <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">Cortisol load (0–10)</p>
    </div>
  );
}
