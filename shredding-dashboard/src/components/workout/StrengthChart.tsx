'use client';

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

interface Exercise {
  id: string;
  name: string;
}

interface SetData {
  weight: number;
  reps: number;
  isWarmup?: boolean;
}

interface SessionHistory {
  date: string;
  dayType: string;
  sets: SetData[];
}

/**
 * Epley formula: estimated 1RM = weight * (1 + reps / 30)
 * Use the heaviest non-warmup set per session.
 */
function computeEstimated1RM(sets: SetData[]): number | null {
  const workingSets = sets.filter((s) => !s.isWarmup && s.weight > 0 && s.reps > 0);
  if (workingSets.length === 0) return null;

  let best1RM = 0;
  for (const s of workingSets) {
    const e1rm = s.weight * (1 + s.reps / 30);
    if (e1rm > best1RM) best1RM = e1rm;
  }
  return Math.round(best1RM);
}

export default function StrengthChart() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [history, setHistory] = useState<SessionHistory[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch exercise list on mount
  useEffect(() => {
    fetch('/api/exercises')
      .then((res) => res.json())
      .then((data) => {
        setExercises(Array.isArray(data) ? data : []);
        setLoadingExercises(false);
      })
      .catch(() => setLoadingExercises(false));
  }, []);

  // Fetch history when exercise is selected
  useEffect(() => {
    if (!selectedId) {
      setHistory([]);
      return;
    }
    setLoadingHistory(true);
    fetch(`/api/exercises/${selectedId}/history`)
      .then((res) => res.json())
      .then((data: SessionHistory[]) => {
        setHistory(data);
        setLoadingHistory(false);
      })
      .catch(() => setLoadingHistory(false));
  }, [selectedId]);

  // Compute 1RM data points
  const chartPoints = history
    .map((session) => ({
      date: session.date,
      e1rm: computeEstimated1RM(session.sets),
    }))
    .filter((p): p is { date: string; e1rm: number } => p.e1rm !== null);

  const labels = chartPoints.map((p) => {
    const d = new Date(p.date + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'Estimated 1RM (lbs)',
        data: chartPoints.map((p) => p.e1rm),
        borderColor: '#1D9E75',
        backgroundColor: 'rgba(29, 158, 117, 0.1)',
        fill: true,
        tension: 0.3,
        borderWidth: 2.5,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: '#1D9E75',
        pointBorderColor: '#1D9E75',
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
        displayColors: false,
        callbacks: {
          label: (ctx: { parsed: { y: number | null } }) => {
            if (ctx.parsed.y === null) return '';
            return `  Est. 1RM: ${ctx.parsed.y} lbs`;
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
          text: 'Estimated 1RM (lbs)',
          color: '#a0a0a0',
          font: { size: 12 },
        },
        ticks: {
          color: '#a0a0a0',
          font: { size: 11 },
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

  const selectedExercise = exercises.find((e) => e.id === selectedId);

  return (
    <div className="bg-[var(--surface)] rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[var(--foreground)]">
          Strength Trend
        </h3>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
        >
          <option value="">Select exercise...</option>
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name}
            </option>
          ))}
        </select>
      </div>

      {loadingExercises && (
        <div className="flex items-center justify-center" style={{ height: 280 }}>
          <span className="text-[var(--muted)] text-sm">Loading exercises...</span>
        </div>
      )}

      {!loadingExercises && !selectedId && (
        <div className="flex items-center justify-center" style={{ height: 280 }}>
          <span className="text-[var(--muted)] text-sm">
            Select an exercise to see strength trend
          </span>
        </div>
      )}

      {!loadingExercises && selectedId && loadingHistory && (
        <div className="flex items-center justify-center" style={{ height: 280 }}>
          <span className="text-[var(--muted)] text-sm">Loading history...</span>
        </div>
      )}

      {!loadingExercises && selectedId && !loadingHistory && chartPoints.length === 0 && (
        <div className="flex items-center justify-center" style={{ height: 280 }}>
          <span className="text-[var(--muted)] text-sm">
            No data for {selectedExercise?.name ?? 'this exercise'}.
          </span>
        </div>
      )}

      {!loadingExercises && selectedId && !loadingHistory && chartPoints.length > 0 && (
        <div className="chart-container" style={{ height: 280 }}>
          <Line data={data} options={options} />
        </div>
      )}
    </div>
  );
}
