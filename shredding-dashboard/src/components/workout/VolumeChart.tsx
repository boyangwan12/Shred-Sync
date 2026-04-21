'use client';

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface WorkoutStat {
  date: string;
  dayType: string;
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
}

const DAY_TYPE_COLORS: Record<string, string> = {
  rest: '#EF9F27',
  push: '#E24B4A',
  pull: '#378ADD',
  legs: '#1D9E75',
};

const DAY_LABELS: Record<string, string> = {
  rest: 'Rest',
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
};

interface VolumeChartProps {
  stats?: WorkoutStat[];
}

export default function VolumeChart({ stats: statsProp }: VolumeChartProps) {
  const [stats, setStats] = useState<WorkoutStat[]>(statsProp ?? []);
  const [loading, setLoading] = useState(!statsProp);

  useEffect(() => {
    if (statsProp) return;
    fetch('/api/workout/stats')
      .then((res) => res.json())
      .then((data: WorkoutStat[]) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [statsProp]);

  if (loading) {
    return (
      <div className="bg-[var(--surface)] rounded-lg p-5">
        <h3 className="text-base font-semibold text-[var(--foreground)] mb-4">
          Session Volume
        </h3>
        <div className="flex items-center justify-center" style={{ height: 280 }}>
          <span className="text-[var(--muted)] text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="bg-[var(--surface)] rounded-lg p-5">
        <h3 className="text-base font-semibold text-[var(--foreground)] mb-4">
          Session Volume
        </h3>
        <div className="flex items-center justify-center" style={{ height: 280 }}>
          <span className="text-[var(--muted)] text-sm">No workout data yet.</span>
        </div>
      </div>
    );
  }

  const labels = stats.map((s) => {
    const d = new Date(s.date + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const barColors = stats.map((s) => DAY_TYPE_COLORS[s.dayType] ?? '#737373');

  const data = {
    labels,
    datasets: [
      {
        label: 'Total Volume (lbs)',
        data: stats.map((s) => s.totalVolume),
        backgroundColor: barColors,
        borderColor: barColors,
        borderWidth: 1,
        borderRadius: 4,
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
        display: false,
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
          title: (items: { dataIndex: number }[]) => {
            if (!items.length) return '';
            const s = stats[items[0].dataIndex];
            if (!s) return '';
            const d = new Date(s.date + 'T00:00:00');
            const day = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const dayLabel = DAY_LABELS[s.dayType] || s.dayType;
            return `${day} - ${dayLabel}`;
          },
          label: (ctx: { parsed: { y: number | null } }) => {
            if (ctx.parsed.y === null) return '';
            return `  Volume: ${ctx.parsed.y.toLocaleString()} lbs`;
          },
          afterBody: (items: { dataIndex: number }[]) => {
            if (!items.length) return '';
            const s = stats[items[0].dataIndex];
            if (!s) return '';
            return [
              `  Exercises: ${s.exerciseCount}`,
              `  Sets: ${s.setCount}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#a0a0a0',
          font: { size: 11 },
          maxRotation: 45,
          autoSkip: true,
          maxTicksLimit: 14,
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
        title: {
          display: true,
          text: 'Volume (lbs)',
          color: '#a0a0a0',
          font: { size: 12 },
        },
        ticks: {
          color: '#a0a0a0',
          font: { size: 11 },
          callback: (value: number | string) => `${Number(value).toLocaleString()}`,
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

  // Legend: show day type color key
  const legendItems = Object.entries(DAY_TYPE_COLORS).map(([key, color]) => ({
    label: DAY_LABELS[key] || key,
    color,
  }));

  return (
    <div className="bg-[var(--surface)] rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[var(--foreground)]">
          Session Volume
        </h3>
        <div className="flex items-center gap-3">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[11px] text-[var(--muted)]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="chart-container" style={{ height: 280 }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
