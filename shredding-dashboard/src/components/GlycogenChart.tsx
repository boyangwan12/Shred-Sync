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
  dayType: string;
  carbsActual?: number | null;
  carbsTarget?: number | null;
  liverGlycogenPct: number | null;
  muscleGlycogenPct: number | null;
  fatBurningPct: number | null;
  workoutAvgHr: number | null;
}

interface GlycogenChartProps {
  logs: DailyLog[];
}

const DAY_LABELS: Record<string, string> = {
  rest: 'Rest',
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
};

export default function GlycogenChart({ logs }: GlycogenChartProps) {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const tomorrowIdx = logs.findIndex((l) => l.date >= tomorrow);
  const predictionStartIdx = tomorrowIdx >= 0 ? tomorrowIdx : logs.length; // no prediction point

  const labels = logs.map((l) => {
    const d = new Date(l.date + 'T00:00:00');
    const day = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayLabel = DAY_LABELS[l.dayType] || l.dayType;
    const carbs = l.carbsActual ?? l.carbsTarget ?? 0;
    const suffix = l.date >= tomorrow ? ' (tomorrow)' : '';
    return `${day} ${dayLabel} ${Math.round(carbs)}g C${suffix}`;
  });

  // Segment styling: dash lines going TO prediction points
  const predictionSegment = {
    borderDash: (ctx: { p1DataIndex: number }) =>
      ctx.p1DataIndex >= predictionStartIdx ? [6, 4] : undefined,
  };

  const data = {
    labels,
    datasets: [
      {
        label: 'Liver glycogen (%)',
        data: logs.map((l) => l.liverGlycogenPct),
        borderColor: '#1D9E75',
        backgroundColor: 'rgba(29, 158, 117, 0.08)',
        fill: true,
        tension: 0.3,
        borderWidth: 3,
        pointRadius: logs.map((_, i) => i >= predictionStartIdx ? 8 : 6),
        pointHoverRadius: 9,
        pointBackgroundColor: logs.map((_, i) => i >= predictionStartIdx ? '#0a0a0a' : '#1D9E75'),
        pointBorderColor: '#1D9E75',
        pointBorderWidth: logs.map((_, i) => i >= predictionStartIdx ? 3 : 1),
        segment: predictionSegment,
        yAxisID: 'y',
        order: 2,
      },
      {
        label: 'Muscle glycogen (%)',
        data: logs.map((l) => l.muscleGlycogenPct),
        borderColor: '#378ADD',
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.3,
        borderWidth: 3,
        pointRadius: logs.map((_, i) => i >= predictionStartIdx ? 8 : 6),
        pointHoverRadius: 9,
        pointBackgroundColor: logs.map((_, i) => i >= predictionStartIdx ? '#0a0a0a' : '#378ADD'),
        pointBorderColor: '#378ADD',
        pointBorderWidth: logs.map((_, i) => i >= predictionStartIdx ? 3 : 1),
        segment: predictionSegment,
        yAxisID: 'y',
        order: 3,
      },
      {
        label: 'Fat burning rate (%)',
        data: logs.map((l) => l.fatBurningPct),
        borderColor: '#EF9F27',
        borderDash: [6, 4],
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.3,
        borderWidth: 2.5,
        pointRadius: logs.map((_, i) => i >= predictionStartIdx ? 7 : 6),
        pointHoverRadius: 8,
        pointBackgroundColor: logs.map((_, i) => i >= predictionStartIdx ? 'transparent' : '#EF9F27'),
        pointBorderColor: '#EF9F27',
        pointBorderWidth: logs.map((_, i) => i >= predictionStartIdx ? 2.5 : 1),
        pointStyle: 'circle',
        yAxisID: 'y',
        order: 4,
      },
      {
        label: 'Workout avg HR',
        data: logs.map((l) => l.workoutAvgHr ?? null),
        borderColor: '#E24B4A',
        backgroundColor: '#E24B4A',
        borderDash: [3, 3],
        fill: false,
        tension: 0.3,
        borderWidth: 2,
        pointStyle: logs.map((l) => l.workoutAvgHr ? 'triangle' : false),
        pointRadius: logs.map((l) => l.workoutAvgHr ? 8 : 0),
        pointHoverRadius: logs.map((l) => l.workoutAvgHr ? 10 : 0),
        pointBackgroundColor: '#E24B4A',
        pointBorderColor: '#E24B4A',
        showLine: true,
        spanGaps: false,
        yAxisID: 'y1',
        order: 1,
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
        align: 'start' as const,
        labels: {
          color: '#ededed',
          usePointStyle: true,
          pointStyleWidth: 14,
          font: { size: 13, weight: 500 as const },
          padding: 20,
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
        boxWidth: 12,
        boxHeight: 12,
        callbacks: {
          title: (items: { dataIndex: number }[]) => {
            if (!items.length) return '';
            const log = logs[items[0].dataIndex];
            if (!log) return '';
            const d = new Date(log.date + 'T00:00:00');
            const day = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const dayLabel = DAY_LABELS[log.dayType] || log.dayType;
            return `${day}\n${dayLabel}`;
          },
          label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => {
            const label = ctx.dataset.label || '';
            const val = ctx.parsed.y;
            if (val == null) return '';
            if (label.includes('HR')) return `  ${label}: ${val} bpm`;
            return `  ${label}: ${val}%`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#a0a0a0',
          font: { size: 11 },
          maxRotation: 0,
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
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Glycogen / fat burn %',
          color: '#a0a0a0',
          font: { size: 12 },
        },
        ticks: {
          color: '#a0a0a0',
          font: { size: 11 },
          callback: (value: number | string) => `${value}%`,
          stepSize: 25,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.08)',
        },
        border: {
          color: 'rgba(255, 255, 255, 0.15)',
        },
      },
      y1: {
        type: 'linear' as const,
        position: 'right' as const,
        min: 80,
        max: 170,
        title: {
          display: true,
          text: 'Workout HR',
          color: '#E24B4A',
          font: { size: 12 },
        },
        ticks: {
          color: '#E24B4A',
          font: { size: 11 },
          callback: (value: number | string) => `${value} bpm`,
        },
        grid: {
          drawOnChartArea: false,
        },
        border: {
          color: 'rgba(226, 75, 74, 0.3)',
        },
      },
    },
  };

  return (
    <div className="bg-[var(--surface)] rounded-lg p-5">
      <h3 className="text-base font-semibold text-[var(--foreground)] mb-4">
        Glycogen & Fat Burning
      </h3>
      <div className="chart-container" style={{ height: 400 }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
