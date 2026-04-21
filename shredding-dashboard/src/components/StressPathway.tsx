'use client';

import { useState } from 'react';
import type { CortisolSignal, Flag } from '@/lib/cortisol';

interface Props {
  signals: CortisolSignal[];
}

function opacityForFlag(flag: Flag): number {
  switch (flag) {
    case 'ok': return 0.2;
    case 'yellow': return 0.6;
    case 'red': return 1.0;
    case 'unknown': return 0.1;
  }
}

// Inbound nodes — 3 drivers mapped to counted signals
// Sleep maps to BOTH TST and HRV (take max-severity); Workload → RHR; Deficit → EA
const INBOUND_NODES = [
  {
    id: 'sleep',
    label: 'Sleep',
    x: 30,
    y: 50,
    signals: ['tst', 'hrv'] as const,
    explainer: 'Short or fragmented sleep raises evening cortisol ~37% (Spiegel 1997). HRV dip confirms autonomic strain.',
  },
  {
    id: 'workload',
    label: 'Workload',
    x: 30,
    y: 150,
    signals: ['rhr'] as const,
    explainer: 'Elevated resting HR vs baseline indicates sympathetic dominance from training load (Meeusen 2013).',
  },
  {
    id: 'deficit',
    label: 'Deficit',
    x: 30,
    y: 250,
    signals: ['ea'] as const,
    explainer: 'Low energy availability (<30 kcal/kg FFM) pushes cortisol up and muscle protein synthesis down (PMC10388605).',
  },
];

const OUTBOUND_NODES = [
  {
    id: 'muscle',
    label: 'Muscle ↓',
    x: 370,
    y: 50,
    explainer: 'High cortisol + low EA drives muscle catabolism — proteins broken down for gluconeogenesis.',
  },
  {
    id: 'belly',
    label: 'Belly ↑',
    x: 370,
    y: 150,
    explainer: 'Cortisol promotes visceral fat deposition via lipoprotein lipase upregulation.',
  },
  {
    id: 'water',
    label: 'Water ↑',
    x: 370,
    y: 250,
    explainer: 'Aldosterone co-secretion drives sodium retention — overnight water weight spike.',
  },
];

// Worst flag among the signal set (red > yellow > ok > unknown).
// unknown is treated as absent (lowest priority).
function worstFlag(signals: CortisolSignal[], targetNames: readonly string[]): Flag {
  const rank: Record<Flag, number> = { unknown: 0, ok: 1, yellow: 2, red: 3 };
  let best: Flag = 'unknown';
  for (const s of signals) {
    if (!targetNames.includes(s.name)) continue;
    if (rank[s.flag] > rank[best]) best = s.flag;
  }
  return best;
}

export default function StressPathway({ signals }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Central node — drives outbound arrows uniformly by stackedReds magnitude
  const inboundFlags: Record<string, Flag> = {};
  for (const node of INBOUND_NODES) {
    inboundFlags[node.id] = worstFlag(signals, node.signals);
  }
  const maxInbound = Object.values(inboundFlags).reduce<Flag>((acc, f) => {
    const rank: Record<Flag, number> = { unknown: 0, ok: 1, yellow: 2, red: 3 };
    return rank[f] > rank[acc] ? f : acc;
  }, 'unknown');

  return (
    <div className="w-full">
      <svg viewBox="0 0 420 300" className="w-full">
        {/* Arrow marker — defs first so Safari resolves forward refs on markerEnd */}
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
        </defs>

        {/* Central Cortisol node */}
        <circle cx="200" cy="150" r="34" fill="var(--surface)" stroke="var(--amber)" strokeWidth="2" />
        <text x="200" y="148" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--foreground)">Cortisol</text>
        <text x="200" y="162" textAnchor="middle" fontSize="9" fill="var(--muted)">HPA axis</text>

        {/* Inbound arrows */}
        {INBOUND_NODES.map(node => {
          const flag = inboundFlags[node.id];
          const focused = activeId === node.id;
          return (
            <g
              key={node.id}
              tabIndex={0}
              role="button"
              aria-label={`${node.label}: ${node.explainer}`}
              onFocus={() => setActiveId(node.id)}
              onBlur={() => setActiveId(curr => curr === node.id ? null : curr)}
              onMouseEnter={() => setActiveId(node.id)}
              onMouseLeave={() => setActiveId(curr => curr === node.id ? null : curr)}
              className="focus:outline-none cursor-pointer"
              style={{ outline: focused ? '2px solid var(--teal)' : 'none' }}
            >
              <rect x={node.x - 25} y={node.y - 12} width="50" height="24" rx="4"
                fill="var(--surface)" stroke="var(--border)" strokeWidth="1" />
              <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize="10" fill="var(--foreground)">
                {node.label}
              </text>
              <line
                x1={node.x + 25} y1={node.y}
                x2={170} y2={150}
                stroke={flag === 'red' ? 'var(--red)' : flag === 'yellow' ? 'var(--amber)' : 'var(--muted)'}
                strokeWidth="2.5"
                opacity={opacityForFlag(flag)}
                markerEnd="url(#arrow)"
              />
            </g>
          );
        })}

        {/* Outbound arrows */}
        {OUTBOUND_NODES.map(node => {
          const focused = activeId === node.id;
          return (
            <g
              key={node.id}
              tabIndex={0}
              role="button"
              aria-label={`${node.label}: ${node.explainer}`}
              onFocus={() => setActiveId(node.id)}
              onBlur={() => setActiveId(curr => curr === node.id ? null : curr)}
              onMouseEnter={() => setActiveId(node.id)}
              onMouseLeave={() => setActiveId(curr => curr === node.id ? null : curr)}
              className="focus:outline-none cursor-pointer"
              style={{ outline: focused ? '2px solid var(--teal)' : 'none' }}
            >
              <line
                x1={230} y1={150}
                x2={node.x - 25} y2={node.y}
                stroke={maxInbound === 'red' ? 'var(--red)' : maxInbound === 'yellow' ? 'var(--amber)' : 'var(--muted)'}
                strokeWidth="2.5"
                opacity={opacityForFlag(maxInbound)}
                markerEnd="url(#arrow)"
              />
              <rect x={node.x - 25} y={node.y - 12} width="50" height="24" rx="4"
                fill="var(--surface)" stroke="var(--border)" strokeWidth="1" />
              <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize="10" fill="var(--foreground)">
                {node.label}
              </text>
            </g>
          );
        })}

      </svg>

      {/* Tooltip */}
      {activeId && (
        <div className="mt-3 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted)] leading-relaxed">
          {[...INBOUND_NODES, ...OUTBOUND_NODES].find(n => n.id === activeId)?.explainer}
        </div>
      )}
    </div>
  );
}
