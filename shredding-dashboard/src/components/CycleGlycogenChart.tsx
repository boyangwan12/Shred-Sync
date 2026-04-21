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
import type { GlycogenSeries } from '@/lib/cycleAnalysis';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface Props {
  current: GlycogenSeries;
  previous: GlycogenSeries | null;
}

const DAY_LABELS = ['Rest', 'Push', 'Pull', 'Legs'];

export default function CycleGlycogenChart({ current, previous }: Props) {
  const datasets: Record<string, unknown>[] = [];

  if (previous) {
    datasets.push({
      label: `${previous.cycleLabel} · Liver`,
      data: previous.liver,
      borderColor: 'rgba(29, 158, 117, 0.4)',
      backgroundColor: 'rgba(29, 158, 117, 0.05)',
      borderDash: [5, 5],
      borderWidth: 1.5,
      pointRadius: 3,
      pointBackgroundColor: 'rgba(29, 158, 117, 0.5)',
      tension: 0.35,
      spanGaps: true,
    });
    datasets.push({
      label: `${previous.cycleLabel} · Muscle`,
      data: previous.muscle,
      borderColor: 'rgba(55, 138, 221, 0.4)',
      backgroundColor: 'rgba(55, 138, 221, 0.05)',
      borderDash: [5, 5],
      borderWidth: 1.5,
      pointRadius: 3,
      pointBackgroundColor: 'rgba(55, 138, 221, 0.5)',
      tension: 0.35,
      spanGaps: true,
    });
  }

  datasets.push({
    label: `${current.cycleLabel} · Liver`,
    data: current.liver,
    borderColor: 'rgb(29, 158, 117)',
    backgroundColor: 'rgba(29, 158, 117, 0.15)',
    borderWidth: 2.5,
    pointRadius: 5,
    pointBackgroundColor: 'rgb(29, 158, 117)',
    tension: 0.35,
    spanGaps: true,
  });
  datasets.push({
    label: `${current.cycleLabel} · Muscle`,
    data: current.muscle,
    borderColor: 'rgb(55, 138, 221)',
    backgroundColor: 'rgba(55, 138, 221, 0.15)',
    borderWidth: 2.5,
    pointRadius: 5,
    pointBackgroundColor: 'rgb(55, 138, 221)',
    tension: 0.35,
    spanGaps: true,
  });

  const chartData = { labels: DAY_LABELS, datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#a3a3a3',
          font: { size: 11 },
          padding: 12,
          boxWidth: 18,
          boxHeight: 2,
        },
      },
      tooltip: {
        backgroundColor: '#1a1a1a',
        borderColor: '#333',
        borderWidth: 1,
        titleColor: '#fff',
        bodyColor: '#d4d4d4',
        padding: 10,
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
            `${ctx.dataset.label}: ${ctx.parsed.y != null ? ctx.parsed.y + '%' : 'no data'}`,
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          color: '#737373',
          font: { size: 10 },
          callback: (v: string | number) => `${v}%`,
        },
        grid: { color: 'rgba(255,255,255,0.05)' },
        title: {
          display: true,
          text: 'Glycogen %',
          color: '#737373',
          font: { size: 11 },
        },
      },
      x: {
        ticks: { color: '#a3a3a3', font: { size: 11 } },
        grid: { color: 'rgba(255,255,255,0.03)' },
      },
    },
    interaction: { mode: 'index' as const, intersect: false },
  };

  return (
    <div className="h-[260px] w-full">
      <Line data={chartData as never} options={options as never} />
    </div>
  );
}
