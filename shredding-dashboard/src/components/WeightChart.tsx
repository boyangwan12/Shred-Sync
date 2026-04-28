'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface DailyLog {
  date: string;
  weightLbs: number | null;
}

interface WeightChartProps {
  logs: DailyLog[];
}

const GOAL_WEIGHT = 146.0;

// Research-validated 3-phase trajectory (not linear)
// Phase 1 (wk 1-2): ~1.2 lb/week (glycogen + water flush on top of fat)
// Phase 2 (wk 3-6): ~0.8 lb/week (steady fat loss at planned deficit)
// Phase 3 (wk 7-9): ~0.6 lb/week (adaptive thermogenesis + lower BF%)
// Sources: Hall & Chow 2013 (PMC3859816), Trexler et al. 2014 (PMC3943438)
const TRAJECTORY: { date: string; weight: number }[] = [
  { date: '2026-04-07', weight: 153.3 },  // baseline
  { date: '2026-04-14', weight: 152.0 },  // Phase 1: -1.3 (water + glycogen + fat)
  { date: '2026-04-21', weight: 151.0 },  // Phase 1: -1.0
  { date: '2026-04-28', weight: 150.2 },  // Phase 2: -0.8 (steady fat loss)
  { date: '2026-05-05', weight: 149.4 },  // Phase 2: -0.8
  { date: '2026-05-12', weight: 148.6 },  // Phase 2: -0.8
  { date: '2026-05-19', weight: 147.9 },  // Phase 2: -0.7 (starting to slow)
  { date: '2026-05-26', weight: 147.3 },  // Phase 3: -0.6 (AT kicking in)
  { date: '2026-06-02', weight: 146.7 },  // Phase 3: -0.6
  { date: '2026-06-09', weight: 146.2 },  // Phase 3: -0.5 (adjust deficit here)
  { date: '2026-06-15', weight: 145.8 },  // End: ~10% BF (accounting for ~1 lb LBM loss)
];

function interpolatePlanned(date: string): number | null {
  const d = new Date(date + 'T00:00:00').getTime();
  const t0 = new Date(TRAJECTORY[0].date + 'T00:00:00').getTime();
  const tEnd = new Date(TRAJECTORY[TRAJECTORY.length - 1].date + 'T00:00:00').getTime();
  if (d < t0 || d > tEnd) return null;
  for (let i = 0; i < TRAJECTORY.length - 1; i++) {
    const a = new Date(TRAJECTORY[i].date + 'T00:00:00').getTime();
    const b = new Date(TRAJECTORY[i + 1].date + 'T00:00:00').getTime();
    if (d >= a && d <= b) {
      const pct = (d - a) / (b - a);
      return parseFloat((TRAJECTORY[i].weight + pct * (TRAJECTORY[i + 1].weight - TRAJECTORY[i].weight)).toFixed(1));
    }
  }
  return null;
}

// Generate all weekly label dates from Apr 7 to Jun 15
function generateFullTimeline(): string[] {
  const dates: string[] = [];
  const start = new Date('2026-04-07T00:00:00');
  const end = new Date('2026-06-15T00:00:00');
  const d = new Date(start);
  while (d <= end) {
    // Add weekly points (every Monday / every 7 days from Apr 7)
    dates.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 7);
  }
  return dates;
}

export default function WeightChart({ logs }: WeightChartProps) {
  // Build full timeline: weekly dates from Apr 7 to Jun 15
  const weeklyDates = generateFullTimeline();

  // Merge: all weekly dates + all log dates (deduplicated, sorted)
  const allDatesSet = new Set([...weeklyDates, ...logs.map((l) => l.date)]);
  const allDates = Array.from(allDatesSet).sort();

  // Build a lookup from logs
  const logMap = new Map(logs.map((l) => [l.date, l]));

  const labels = allDates.map((date) => {
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  // Actual weight data (null for dates without logs)
  const weights = allDates.map((date) => logMap.get(date)?.weightLbs ?? null);
  const planned = allDates.map((date) => interpolatePlanned(date));

  // 7-day rolling average — anchored to dates with actual weight logs.
  // Uses time-based window (last 7 calendar days, inclusive) rather than index
  // distance, since allDates also contains weekly trajectory marker dates.
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const rolling7Day = allDates.map((date, idx) => {
    if (weights[idx] === null) return null;
    const cutoff = new Date(date + 'T00:00:00').getTime() - 6 * ONE_DAY;
    const windowVals: number[] = [];
    for (let i = 0; i <= idx; i++) {
      const t = new Date(allDates[i] + 'T00:00:00').getTime();
      if (t >= cutoff && weights[i] !== null) windowVals.push(weights[i] as number);
    }
    if (windowVals.length < 3) return null;
    return parseFloat((windowVals.reduce((s, v) => s + v, 0) / windowVals.length).toFixed(2));
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'Planned trajectory',
        data: planned,
        borderColor: '#555555',
        borderDash: [8, 4],
        backgroundColor: 'transparent',
        fill: false,
        tension: 0,
        pointRadius: planned.map((v) => v !== null ? 3 : 0),
        pointBackgroundColor: '#555555',
        pointBorderColor: '#555555',
        borderWidth: 1.5,
        spanGaps: true,
        yAxisID: 'y',
        order: 4,
      },
      {
        label: 'Daily Weight',
        data: weights,
        borderColor: '#378ADD',
        backgroundColor: 'rgba(55, 138, 221, 0.15)',
        fill: true,
        tension: 0.2,
        pointRadius: weights.map((w) => w !== null ? 5 : 0),
        pointHoverRadius: 7,
        pointBackgroundColor: '#378ADD',
        pointBorderColor: '#378ADD',
        borderWidth: 2,
        spanGaps: false,
        yAxisID: 'y',
        order: 2,
      },
      {
        label: '7-day avg',
        data: rolling7Day,
        borderColor: '#EF9F27',
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: '#EF9F27',
        pointBorderColor: '#EF9F27',
        borderWidth: 2,
        spanGaps: true,
        yAxisID: 'y',
        order: 1,
      },
      {
        label: `Goal (${GOAL_WEIGHT} lbs)`,
        data: allDates.map(() => GOAL_WEIGHT),
        borderColor: '#1D9E75',
        borderDash: [3, 3],
        backgroundColor: 'transparent',
        fill: false,
        pointRadius: 0,
        borderWidth: 1,
        yAxisID: 'y',
        order: 5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#ededed',
          usePointStyle: true,
          pointStyleWidth: 14,
          font: { size: 12, weight: 500 as const },
          padding: 16,
          boxWidth: 14,
          boxHeight: 14,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(20, 20, 20, 0.95)',
        titleColor: '#ededed',
        titleFont: { size: 14, weight: 'bold' as const },
        bodyColor: '#ededed',
        bodyFont: { size: 13 },
        borderColor: '#333',
        borderWidth: 1,
        padding: 14,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => {
            if (ctx.parsed.y === null) return '';
            return `  ${ctx.dataset.label}: ${ctx.parsed.y} lbs`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#a0a0a0',
          font: { size: 10 },
          maxRotation: 45,
          autoSkip: true,
          maxTicksLimit: 12,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.08)',
        },
        border: {
          color: 'rgba(255, 255, 255, 0.15)',
        },
      },
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        min: 144,
        max: 155,
        title: {
          display: true,
          text: 'Weight (lbs)',
          color: '#a0a0a0',
          font: { size: 12 },
        },
        ticks: {
          color: '#a0a0a0',
          font: { size: 11 },
          stepSize: 1,
          callback: (value: number | string) => `${value}`,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.08)',
        },
        border: {
          color: 'rgba(255, 255, 255, 0.15)',
        },
      },
    },
  };

  return (
    <div className="bg-[var(--surface)] rounded-lg p-5">
      <h3 className="text-base font-semibold text-[var(--foreground)] mb-4">
        Weight Trend
      </h3>
      <div className="chart-container" style={{ height: 320 }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
