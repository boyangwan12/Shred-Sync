'use client';

import { useState, useMemo } from 'react';
import FatBurningDial from './FatBurningDial';
import { computeSimulatorState } from '@/lib/predictions';

type Activity = 'rest' | 'moderate' | 'heavy';

function MiniMeter({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--muted)]">{label}</span>
        <span className="text-xs font-bold" style={{ color }}>
          {Math.round(value)}%
        </span>
      </div>
      <div
        className="relative w-full rounded-full overflow-hidden"
        style={{ height: 10, backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
      >
        <div
          className="absolute top-0 left-0 bottom-0 rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            opacity: 0.85,
            transition: 'width 0.5s ease, background-color 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}

function getStateDescription(
  fatPct: number,
  carbPct: number,
  ketoPct: number,
  gng: number,
  risk: number,
  liver: number,
  muscle: number,
  activity: Activity,
): string {
  const parts: string[] = [];

  if (liver > 70 && muscle > 300) {
    parts.push('Glycogen stores are well-stocked. Your body is primarily burning carbohydrates for fuel.');
  } else if (liver > 40 && muscle > 150) {
    parts.push('Glycogen is moderately depleted. Fat oxidation is increasing as carb availability drops.');
  } else if (liver > 20) {
    parts.push('Glycogen running low. The body is shifting heavily toward fat burning with some gluconeogenesis.');
  } else {
    parts.push('Near-depleted glycogen. The body is in a strong fat-burning and ketone-producing state.');
  }

  if (ketoPct > 15) {
    parts.push(`Ketone production is significant at ~${ketoPct}% of energy supply.`);
  }

  if (gng > 30) {
    parts.push(`Gluconeogenesis is elevated (${gng}%) to maintain blood sugar from amino acids and glycerol.`);
  }

  if (risk > 50) {
    parts.push('Muscle breakdown risk is high. Consider a refeed or reduce training intensity.');
  } else if (risk > 25) {
    parts.push('Some muscle breakdown risk. Monitor recovery and consider extra protein.');
  }

  if (activity === 'heavy' && muscle < 200) {
    parts.push('Heavy training on low muscle glycogen will accelerate depletion and increase catabolism risk.');
  }

  return parts.join(' ');
}

export default function GlycogenSimulator() {
  const [liver, setLiver] = useState(60);
  const [muscle, setMuscle] = useState(250);
  const [activity, setActivity] = useState<Activity>('rest');

  const state = useMemo(
    () => computeSimulatorState(liver, muscle, activity),
    [liver, muscle, activity],
  );

  const description = useMemo(
    () => getStateDescription(state.fatPct, state.carbPct, state.ketoPct, state.gng, state.risk, liver, muscle, activity),
    [state, liver, muscle, activity],
  );

  const activityOptions: { value: Activity; label: string }[] = [
    { value: 'rest', label: 'Rest' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'heavy', label: 'Heavy' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Controls */}
      <div className="flex flex-col gap-6">
        {/* Liver slider */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
              Liver Glycogen
            </label>
            <span className="text-sm font-bold text-[var(--foreground)]">{liver}g</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={liver}
            onChange={(e) => setLiver(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--teal) 0%, var(--teal) ${liver}%, var(--border) ${liver}%, var(--border) 100%)`,
              accentColor: 'var(--teal)',
            }}
          />
          <div className="flex justify-between text-[10px] text-[var(--muted)]">
            <span>0g</span>
            <span>100g</span>
          </div>
        </div>

        {/* Muscle slider */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
              Muscle Glycogen
            </label>
            <span className="text-sm font-bold text-[var(--foreground)]">{muscle}g</span>
          </div>
          <input
            type="range"
            min={0}
            max={400}
            value={muscle}
            onChange={(e) => setMuscle(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--blue) 0%, var(--blue) ${(muscle / 400) * 100}%, var(--border) ${(muscle / 400) * 100}%, var(--border) 100%)`,
              accentColor: 'var(--blue)',
            }}
          />
          <div className="flex justify-between text-[10px] text-[var(--muted)]">
            <span>0g</span>
            <span>400g</span>
          </div>
        </div>

        {/* Activity level */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
            Activity Level
          </label>
          <div className="flex gap-2">
            {activityOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setActivity(opt.value)}
                className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  backgroundColor:
                    activity === opt.value ? 'var(--teal)' : 'var(--background)',
                  color:
                    activity === opt.value ? '#fff' : 'var(--muted)',
                  border: `1px solid ${activity === opt.value ? 'var(--teal)' : 'var(--border)'}`,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Outputs */}
      <div className="flex flex-col gap-5">
        {/* Energy source breakdown */}
        <div
          className="rounded-lg p-4"
          style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
        >
          <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider block mb-3">
            Energy Source Breakdown
          </span>
          <div className="flex gap-2 mb-3" style={{ height: 28 }}>
            <div
              className="rounded-l-md flex items-center justify-center text-[10px] font-bold text-white transition-all duration-500"
              style={{
                width: `${state.fatPct}%`,
                backgroundColor: 'var(--amber)',
                minWidth: state.fatPct > 5 ? 40 : 0,
              }}
            >
              {state.fatPct > 8 ? `Fat ${state.fatPct}%` : ''}
            </div>
            <div
              className="flex items-center justify-center text-[10px] font-bold text-white transition-all duration-500"
              style={{
                width: `${state.carbPct}%`,
                backgroundColor: 'var(--blue)',
                minWidth: state.carbPct > 5 ? 40 : 0,
              }}
            >
              {state.carbPct > 8 ? `Carb ${state.carbPct}%` : ''}
            </div>
            {state.ketoPct > 0 && (
              <div
                className="rounded-r-md flex items-center justify-center text-[10px] font-bold text-white transition-all duration-500"
                style={{
                  width: `${state.ketoPct}%`,
                  backgroundColor: 'var(--orange)',
                  minWidth: state.ketoPct > 5 ? 40 : 0,
                }}
              >
                {state.ketoPct > 8 ? `Keto ${state.ketoPct}%` : ''}
              </div>
            )}
          </div>
          <div className="flex gap-4 text-[10px] text-[var(--muted)]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--amber)' }} />
              Fat {state.fatPct}%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--blue)' }} />
              Carbs {state.carbPct}%
            </span>
            {state.ketoPct > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--orange)' }} />
                Ketones {state.ketoPct}%
              </span>
            )}
          </div>
        </div>

        {/* Fat oxidation dial */}
        <FatBurningDial value={state.fatPct} />

        {/* Mini meters */}
        <div className="grid grid-cols-2 gap-4">
          <MiniMeter
            label="Gluconeogenesis"
            value={state.gng}
            max={60}
            color={state.gng > 30 ? 'var(--orange)' : state.gng > 15 ? 'var(--amber)' : 'var(--muted)'}
          />
          <MiniMeter
            label="Muscle Breakdown Risk"
            value={state.risk}
            max={100}
            color={state.risk > 50 ? 'var(--red)' : state.risk > 25 ? 'var(--amber)' : 'var(--teal)'}
          />
        </div>

        {/* State description */}
        <div
          className="rounded-lg p-4"
          style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
        >
          <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider block mb-2">
            State Analysis
          </span>
          <p className="text-xs text-[var(--foreground)] leading-relaxed opacity-90">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
