'use client';

interface DailyLog {
  date: string;
  dayType: string;
  caloriesTarget: number | null;
  caloriesActual: number | null;
  proteinTarget: number | null;
  proteinActual: number | null;
  carbsTarget: number | null;
  carbsActual: number | null;
  fatTarget: number | null;
  fatActual: number | null;
}

interface AdherenceBarProps {
  logs: DailyLog[];
}

type MacroKey = 'calories' | 'protein' | 'carbs' | 'fat';

const MACROS: { key: MacroKey; label: string; unit: string }[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
];

const DAY_TYPE_PILL: Record<string, { bg: string; text: string }> = {
  rest: { bg: 'rgba(239, 159, 39, 0.15)', text: '#EF9F27' },
  push: { bg: 'rgba(226, 75, 74, 0.15)', text: '#E24B4A' },
  pull: { bg: 'rgba(55, 138, 221, 0.15)', text: '#378ADD' },
  legs: { bg: 'rgba(29, 158, 117, 0.15)', text: '#1D9E75' },
};

function deviationColor(target: number | null, actual: number | null): string {
  if (target === null || actual === null || target === 0) return '#737373';
  const pct = Math.abs(actual - target) / target;
  if (pct <= 0.05) return '#1D9E75';
  if (pct <= 0.15) return '#EF9F27';
  return '#E24B4A';
}

function formatDelta(target: number | null, actual: number | null): string {
  if (target === null || actual === null) return '';
  const diff = actual - target;
  if (diff === 0) return '0';
  return diff > 0 ? `+${Math.round(diff * 10) / 10}` : `${Math.round(diff * 10) / 10}`;
}

function MacroCell({ target, actual }: { target: number | null; actual: number | null }) {
  const color = deviationColor(target, actual);
  const delta = formatDelta(target, actual);

  if (actual === null) {
    return <td className="px-2 py-2 text-center text-xs text-[#737373]">—</td>;
  }

  return (
    <td className="px-2 py-2 text-center">
      <div className="text-sm font-medium" style={{ color }}>
        {Math.round(actual * 10) / 10}
      </div>
      {delta && (
        <div className="text-[10px] text-[#737373]">
          ({delta})
        </div>
      )}
    </td>
  );
}

export default function AdherenceBar({ logs }: AdherenceBarProps) {
  // Exclude pre-cut and prediction days for the table
  const recentLogs = logs.filter((l) => l.date >= '2026-04-08').slice(-7);

  // Calculate weekly averages
  const avgRow = MACROS.map(({ key }) => {
    const targetKey = `${key}Target` as keyof DailyLog;
    const actualKey = `${key}Actual` as keyof DailyLog;
    const targets = recentLogs.map((l) => l[targetKey] as number | null).filter((v): v is number => v !== null);
    const actuals = recentLogs.map((l) => l[actualKey] as number | null).filter((v): v is number => v !== null);
    const avgTarget = targets.length > 0 ? targets.reduce((a, b) => a + b, 0) / targets.length : null;
    const avgActual = actuals.length > 0 ? actuals.reduce((a, b) => a + b, 0) / actuals.length : null;
    return { avgTarget, avgActual };
  });

  return (
    <div className="bg-[var(--surface)] rounded-lg p-5">
      <h3 className="text-base font-semibold text-[var(--foreground)] mb-4">
        Macro Adherence
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left text-[10px] uppercase tracking-wider text-[#737373] px-2 py-2 font-medium">Day</th>
              <th className="text-left text-[10px] uppercase tracking-wider text-[#737373] px-2 py-2 font-medium">Type</th>
              {MACROS.map(({ label, unit }) => (
                <th key={label} className="text-center text-[10px] uppercase tracking-wider text-[#737373] px-2 py-2 font-medium">
                  {label}<br /><span className="normal-case">{unit}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentLogs.map((log) => {
              const d = new Date(log.date + 'T00:00:00');
              const dateLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              const pill = DAY_TYPE_PILL[log.dayType] ?? { bg: '#333', text: '#999' };

              return (
                <tr key={log.date} className="border-b border-[var(--border)] border-opacity-30">
                  <td className="px-2 py-2 text-xs text-[var(--foreground)] whitespace-nowrap">{dateLabel}</td>
                  <td className="px-2 py-2">
                    <span
                      className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: pill.bg, color: pill.text }}
                    >
                      {log.dayType}
                    </span>
                  </td>
                  {MACROS.map(({ key }) => {
                    const targetKey = `${key}Target` as keyof DailyLog;
                    const actualKey = `${key}Actual` as keyof DailyLog;
                    return (
                      <MacroCell
                        key={key}
                        target={log[targetKey] as number | null}
                        actual={log[actualKey] as number | null}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--border)]">
              <td className="px-2 py-2 text-xs font-semibold text-[var(--foreground)]">Avg</td>
              <td className="px-2 py-2"></td>
              {avgRow.map((avg, i) => (
                <td key={MACROS[i].key} className="px-2 py-2 text-center">
                  <div className="text-sm font-medium" style={{ color: deviationColor(avg.avgTarget, avg.avgActual) }}>
                    {avg.avgActual !== null ? Math.round(avg.avgActual) : '—'}
                  </div>
                  <div className="text-[10px] text-[#737373]">
                    / {avg.avgTarget !== null ? Math.round(avg.avgTarget) : '—'}
                  </div>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
