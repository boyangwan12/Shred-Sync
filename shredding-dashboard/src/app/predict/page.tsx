'use client';

import { useEffect, useState } from 'react';
import TankGauge from '@/components/TankGauge';
import FatBurningDial from '@/components/FatBurningDial';
import GlycogenSimulator from '@/components/GlycogenSimulator';
import SymptomGuide from '@/components/SymptomGuide';

interface Prediction {
  nextDayType: string;
  liverGlycogenPct: number;
  muscleGlycogenPct: number;
  fatBurningPct: number;
  weightDirection: 'up' | 'down' | 'stable';
  weightReason: string;
  expectedEnergy: number;
  expectedHunger: number;
  mealTimingSuggestion: string;
}

function WeightArrow({ direction }: { direction: 'up' | 'down' | 'stable' }) {
  const config = {
    up: { symbol: '\u2191', color: 'var(--amber)', label: 'Trending Up' },
    down: { symbol: '\u2193', color: 'var(--teal)', label: 'Trending Down' },
    stable: { symbol: '\u2194', color: 'var(--blue)', label: 'Stable' },
  };
  const { symbol, color, label } = config[direction];

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 44,
          height: 44,
          backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
          border: `2px solid ${color}`,
        }}
      >
        <span className="text-xl font-bold" style={{ color }}>
          {symbol}
        </span>
      </div>
      <span className="text-sm font-semibold" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

function ScoreDots({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: 10,
            height: 10,
            backgroundColor: i < value ? color : 'var(--border)',
            opacity: i < value ? 1 : 0.4,
          }}
        />
      ))}
    </div>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className ?? ''}`}
      style={{ backgroundColor: 'var(--border)', opacity: 0.3 }}
    />
  );
}

function formatDayType(dayType: string): string {
  return dayType.charAt(0).toUpperCase() + dayType.slice(1);
}

export default function PredictPage() {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/predict')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch prediction');
        return res.json();
      })
      .then((data) => {
        setPrediction(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
          Tomorrow&apos;s Prediction
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Forecast based on your recent logging data and carb cycle position.
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div
          className="rounded-lg p-4 text-sm"
          style={{ backgroundColor: 'color-mix(in srgb, var(--red) 10%, transparent)', border: '1px solid var(--red)', color: 'var(--red)' }}
        >
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="space-y-6">
          <SkeletonBlock className="h-12 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SkeletonBlock className="h-72" />
            <SkeletonBlock className="h-72" />
            <SkeletonBlock className="h-72" />
          </div>
        </div>
      )}

      {/* Prediction panel */}
      {prediction && !loading && (
        <div className="space-y-8">
          {/* Day type badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--teal) 12%, transparent)',
              border: '1px solid var(--teal)',
            }}
          >
            <span className="text-xs font-medium text-[var(--muted)]">Tomorrow</span>
            <span className="text-sm font-bold text-[var(--teal)]">
              {formatDayType(prediction.nextDayType)} Day
            </span>
          </div>

          {/* Main grid: Tanks + Fat Burning + Weight/Energy/Hunger */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Glycogen Tanks */}
            <div
              className="rounded-xl p-6"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <h2 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-6">
                Glycogen Stores
              </h2>
              <div className="flex justify-center gap-8">
                <TankGauge
                  label="Liver"
                  value={prediction.liverGlycogenPct}
                  maxGrams={100}
                  unit="g"
                />
                <TankGauge
                  label="Muscle"
                  value={prediction.muscleGlycogenPct}
                  maxGrams={400}
                  unit="g"
                />
              </div>
            </div>

            {/* Fat burning + Weight */}
            <div
              className="rounded-xl p-6 flex flex-col gap-6"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div>
                <h2 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-4">
                  Fat Oxidation
                </h2>
                <FatBurningDial value={prediction.fatBurningPct} />
              </div>
              <div className="mt-auto">
                <h2 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3">
                  Weight Direction
                </h2>
                <WeightArrow direction={prediction.weightDirection} />
                <p className="text-xs text-[var(--muted)] mt-2 leading-relaxed">
                  {prediction.weightReason}
                </p>
              </div>
            </div>

            {/* Energy + Hunger + Meal Timing */}
            <div
              className="rounded-xl p-6 flex flex-col gap-6"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              {/* Expected Energy */}
              <div>
                <h2 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3">
                  Expected Energy
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-[var(--foreground)]">
                    {prediction.expectedEnergy}
                  </span>
                  <span className="text-xs text-[var(--muted)]">/ 5</span>
                </div>
                <div className="mt-2">
                  <ScoreDots value={prediction.expectedEnergy} max={5} color="var(--amber)" />
                </div>
              </div>

              {/* Expected Hunger */}
              <div>
                <h2 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3">
                  Expected Hunger
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-[var(--foreground)]">
                    {prediction.expectedHunger}
                  </span>
                  <span className="text-xs text-[var(--muted)]">/ 5</span>
                </div>
                <div className="mt-2">
                  <ScoreDots value={prediction.expectedHunger} max={5} color="var(--red)" />
                </div>
              </div>

              {/* Meal Timing */}
              <div className="mt-auto">
                <h2 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">
                  Meal Timing
                </h2>
                <div
                  className="rounded-lg p-3"
                  style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
                >
                  <p className="text-xs text-[var(--foreground)] leading-relaxed opacity-90">
                    {prediction.mealTimingSuggestion}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Glycogen Simulator section */}
      <section>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[var(--foreground)] tracking-tight">
            Glycogen Simulator
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1">
            Adjust glycogen levels and activity to see how your body shifts between fuel sources.
          </p>
        </div>
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <GlycogenSimulator />
        </div>
      </section>

      {/* Symptom Reference Guide */}
      <section>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[var(--foreground)] tracking-tight">
            Symptom Reference Guide
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1">
            Recognize glycogen depletion signals to guide your refeed timing and training decisions.
          </p>
        </div>
        <SymptomGuide />
      </section>
    </div>
  );
}
