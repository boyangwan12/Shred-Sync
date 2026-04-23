'use client';

import { useEffect, useState } from 'react';
import MetricCard from '@/components/MetricCard';
import StatsTargets from '@/components/StatsTargets';
import GlycogenChart from '@/components/GlycogenChart';
import MuscleGlycogenMap from '@/components/MuscleGlycogenMap';
import WeightChart from '@/components/WeightChart';
import TrajectoryInsights from '@/components/TrajectoryInsights';
import AdherenceBar from '@/components/AdherenceBar';
import WorkoutSummary from '@/components/WorkoutSummary';
import { USER_PROFILE } from '@/constants/targets';

interface DailyLog {
  date: string;
  dayType: string;
  carbType: string;
  caloriesTarget: number | null;
  caloriesActual: number | null;
  proteinTarget: number | null;
  proteinActual: number | null;
  carbsTarget: number | null;
  carbsActual: number | null;
  fatTarget: number | null;
  fatActual: number | null;
  weightLbs: number | null;
  morningHr: number | null;
  energyScore: number | null;
  satietyScore: number | null;
  pumpScore: number | null;
  workoutAvgHr: number | null;
  liverGlycogenPct: number | null;
  muscleGlycogenPct: number | null;
  fatBurningPct: number | null;
  perMuscle?: {
    legs: number;
    back: number;
    chest: number;
    shoulders: number;
    arms: number;
    core: number;
  } | null;
  workoutDataMissing?: boolean;
  dailyTotalCalBurned: number | null;
}

const { startWeight, startBf, goalBf, lbm, startDate, endDate } = USER_PROFILE;

function calcGoalWeight(): number {
  return parseFloat((lbm / (1 - goalBf / 100)).toFixed(1));
}

function calcDaysIntoCut(logs: DailyLog[]): { daysIn: number; totalDays: number } {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  // Only count actual cut days: from Apr 8 onward, exclude prediction/future days
  const today = new Date().toISOString().split('T')[0];
  const daysIn = logs.filter((l) => l.date >= '2026-04-08' && l.date <= today).length;
  return { daysIn, totalDays };
}

// TDEE estimates by day type (from targets table)
const TDEE: Record<string, number> = {
  rest: 1990, push: 2485, pull: 2520, legs: 2620,
};

function calcWeeklyAvgDeficit(logs: DailyLog[]): number {
  // Exclude pre-cut baseline (Apr 7) and prediction days — only actual cut days
  const cutLogs = logs.filter((l) => l.date >= '2026-04-08' && l.caloriesActual !== null);
  const last7 = cutLogs.slice(-7);
  const deficits = last7
    .map((l) => {
      if (l.caloriesActual === null) return null;
      // Use Apple Watch burn data if available, otherwise TDEE estimate
      const burned = l.dailyTotalCalBurned ?? TDEE[l.dayType] ?? 2200;
      return burned - l.caloriesActual;
    })
    .filter((d): d is number => d !== null);
  if (deficits.length === 0) return 0;
  return Math.round(deficits.reduce((a, b) => a + b, 0) / deficits.length);
}

function estimateBfPct(currentWeight: number): number {
  const fatMass = currentWeight - lbm;
  const bf = (fatMass / currentWeight) * 100;
  return parseFloat(bf.toFixed(1));
}

export default function DashboardPage() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/logs')
      .then((r) => r.json())
      .then((logsData) => {
        const allLogs = Array.isArray(logsData) ? logsData : [];
        setLogs(allLogs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-[var(--muted)] text-sm">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  const latestWeight =
    [...logs].reverse().find((l) => l.weightLbs !== null)?.weightLbs ?? startWeight;
  const prevWeight =
    [...logs]
      .reverse()
      .filter((l) => l.weightLbs !== null)
      .slice(1)
      .find(() => true)?.weightLbs ?? startWeight;
  const weightDelta = latestWeight - prevWeight;
  const weightDeltaStr =
    weightDelta > 0
      ? `+${weightDelta.toFixed(1)} lbs`
      : weightDelta < 0
        ? `${weightDelta.toFixed(1)} lbs`
        : 'No change';
  const weightDeltaColor =
    weightDelta < 0 ? 'var(--teal)' : weightDelta > 0 ? 'var(--red)' : 'var(--muted)';

  const weeklyDeficit = calcWeeklyAvgDeficit(logs);
  const deficitColor = weeklyDeficit > 0 ? 'var(--teal)' : weeklyDeficit < 0 ? 'var(--red)' : 'var(--muted)';

  const { daysIn, totalDays } = calcDaysIntoCut(logs);

  const currentBf = estimateBfPct(latestWeight);
  const bfDelta = currentBf - startBf;
  const bfDeltaStr =
    bfDelta < 0
      ? `${bfDelta.toFixed(1)}% from start`
      : bfDelta > 0
        ? `+${bfDelta.toFixed(1)}% from start`
        : 'No change';
  const bfDeltaColor = bfDelta < 0 ? 'var(--teal)' : bfDelta > 0 ? 'var(--red)' : 'var(--muted)';

  const goalWeight = calcGoalWeight();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">Dashboard</h1>
        <span className="text-[12px] text-[var(--muted)]">
          Goal: {goalWeight} lbs at {goalBf}% BF
        </span>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Current Weight"
          value={`${latestWeight.toFixed(1)} lbs`}
          delta={weightDeltaStr}
          deltaColor={weightDeltaColor}
        />
        <MetricCard
          label="Avg Daily Deficit"
          value={`${weeklyDeficit > 0 ? '' : ''}${weeklyDeficit} kcal`}
          delta={weeklyDeficit > 0 ? 'On track' : weeklyDeficit === 0 ? 'No data' : 'Surplus'}
          deltaColor={deficitColor}
        />
        <MetricCard
          label="Days Into Cut"
          value={`${daysIn} / ${totalDays}`}
          delta={`${Math.round((daysIn / totalDays) * 100)}% complete`}
          deltaColor="var(--blue)"
        />
        <MetricCard
          label="Est. Body Fat"
          value={`${currentBf}%`}
          delta={bfDeltaStr}
          deltaColor={bfDeltaColor}
        />
      </div>

      <StatsTargets />

      <WorkoutSummary />

      {/* Charts */}
      {logs.length > 0 && (
        <>
          <GlycogenChart logs={logs} />
          <MuscleGlycogenMap logs={logs} />
          <WeightChart logs={logs} />
          <TrajectoryInsights />
          <AdherenceBar logs={logs} />
        </>
      )}

      {logs.length === 0 && (
        <div className="bg-[var(--surface)] rounded-lg p-12 text-center">
          <p className="text-[var(--muted)] text-sm">
            No logs yet. Start logging your daily data to see charts and trends.
          </p>
        </div>
      )}

      {/* Research References */}
      <div className="bg-[var(--surface)] rounded-lg p-5 mt-6">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">
          Glycogen Model — Research References
        </h3>
        <p className="text-xs text-[var(--muted)] mb-3">
          The glycogen estimation model uses research-validated parameters. Exercise depletes glycogen first, then post-workout carbs refill stores — mirroring real meal timing.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
          <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC3248697/" target="_blank" rel="noopener noreferrer" className="text-[var(--teal)] hover:underline truncate">
            Jensen et al. 2011 — Liver &amp; muscle glycogen capacity (Front Physiol)
          </a>
          <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC6019055/" target="_blank" rel="noopener noreferrer" className="text-[var(--teal)] hover:underline truncate">
            Murray &amp; Rosenbloom 2018 — Glycogen stores 400-500g (Nutr Rev)
          </a>
          <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC508308/" target="_blank" rel="noopener noreferrer" className="text-[var(--teal)] hover:underline truncate">
            Boden et al. 1997 — Overnight hepatic glucose output (JCI)
          </a>
          <a href="https://journals.physiology.org/doi/full/10.1152/ajpendo.00032.2001" target="_blank" rel="noopener noreferrer" className="text-[var(--teal)] hover:underline truncate">
            Ferrannini et al. 2001 — Carb partitioning liver vs muscle (AJP-Endo)
          </a>
          <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12717450/" target="_blank" rel="noopener noreferrer" className="text-[var(--teal)] hover:underline truncate">
            Hamidvand et al. 2025 — Resistance training glycogen depletion meta-analysis
          </a>
          <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC507408/" target="_blank" rel="noopener noreferrer" className="text-[var(--teal)] hover:underline truncate">
            Post-exercise glucose uptake &amp; GLUT4 translocation (JCI)
          </a>
          <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5872716/" target="_blank" rel="noopener noreferrer" className="text-[var(--teal)] hover:underline truncate">
            Hargreaves &amp; Spriet 2020 — Muscle glycogen regulation during exercise
          </a>
          <a href="https://pubmed.ncbi.nlm.nih.gov/31095946/" target="_blank" rel="noopener noreferrer" className="text-[var(--teal)] hover:underline truncate">
            Hearris et al. 2019 — Low glycogen = +45% fat oxidation (Metabolism)
          </a>
          <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12399638/" target="_blank" rel="noopener noreferrer" className="text-[var(--teal)] hover:underline truncate">
            2025 Meta-analysis — Glycogen supercompensation (Front Physiol)
          </a>
          <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC4008806/" target="_blank" rel="noopener noreferrer" className="text-[var(--teal)] hover:underline truncate">
            Spriet 2014 — Carb-fat interaction during exercise (Sports Med)
          </a>
        </div>
      </div>
    </div>
  );
}
