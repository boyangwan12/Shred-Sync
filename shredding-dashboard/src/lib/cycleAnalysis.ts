import { MACRO_TARGETS, CYCLE_ORDER, type DayType } from '@/constants/targets';

export type CycleGrade = 'A' | 'B' | 'C' | 'D' | 'incomplete';
export type Tone = 'positive' | 'neutral' | 'warning' | 'critical';

export interface CycleLog {
  date: string;
  dayType: string;
  carbType: string;
  caloriesActual: number | null;
  caloriesTarget: number | null;
  proteinActual: number | null;
  carbsActual: number | null;
  carbsTarget: number | null;
  fatActual: number | null;
  weightLbs: number | null;
  morningHr: number | null;
  energyScore: number | null;
  satietyScore: number | null;
  dailyTotalCalBurned: number | null;
  liverGlycogenPct: number | null;
  muscleGlycogenPct: number | null;
  fatBurningPct: number | null;
  workoutDurationMin: number | null;
  workoutAvgHr: number | null;
  workoutExerciseCount: number;
  workoutTotalSets: number;
  workoutVolumeLbs: number;
}

export interface CycleDay {
  dayType: DayType;
  dayNumber: number; // 1-4
  date: string | null;
  isToday: boolean;
  isFuture: boolean;
  isLogged: boolean;
  log: CycleLog | null;
  carbs: { actual: number | null; target: number };
  liverGlycogenPct: number | null;
  muscleGlycogenPct: number | null;
  fatBurningPct: number | null;
  workout: string; // summary
  insight: string; // one-line
}

export interface GlycogenSeries {
  cycleLabel: string;
  liver: (number | null)[];
  muscle: (number | null)[];
}

export interface WeightBreakdown {
  scaleWeight: number | null;
  glycogenWaterLbs: number | null;
  estimatedLeanWeight: number | null;
  lastRefeedDate: string | null;
  explanation: string;
  flagTrend: boolean;
  trendMessage: string;
}

export interface CycleAnalysis {
  targetDate: string;
  currentCycle: {
    startDate: string | null;
    cycleNumber: number; // 1-based
    days: CycleDay[];
  };
  previousCycle: {
    startDate: string | null;
    cycleNumber: number;
    days: CycleDay[];
  } | null;
  glycogenSeries: {
    current: GlycogenSeries;
    previous: GlycogenSeries | null;
  };
  grade: {
    letter: CycleGrade;
    tone: Tone;
    carbTargetsHit: string;
    vShapeFormed: string;
    refeedTimed: string;
  };
  coaching: string;
  weightBreakdown: WeightBreakdown;
}

const GLYCOGEN_MAX = { liver: 100, muscle: 400 }; // grams
const WATER_PER_GLYCOGEN_G = 3; // each g glycogen binds 3g water (total 4g with itself)
const GRAMS_PER_LB = 453.592;

function addDaysISO(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function toLog(log: CycleLog): CycleLog {
  return log;
}

function findCycleStart(date: string, logs: Map<string, CycleLog>): string | null {
  // Walk back up to 6 days looking for a rest day that starts a cycle
  for (let i = 0; i < 7; i++) {
    const d = addDaysISO(date, -i);
    const log = logs.get(d);
    if (log?.dayType === 'rest') return d;
  }
  return null;
}

function dayInsight(dt: DayType, log: CycleLog | null): string {
  if (!log) {
    switch (dt) {
      case 'rest': return 'Low-carb rest day — glycogen drawdown begins.';
      case 'push': return 'Push day on low carbs — muscle glycogen depleting.';
      case 'pull': return 'Pull day, deepest depletion — fat oxidation peak.';
      case 'legs': return 'High-carb refeed — glycogen fully reloads.';
    }
  }
  const carbsActual = log.carbsActual ?? 0;
  const target = log.carbsTarget ?? 0;
  const muscle = log.muscleGlycogenPct ?? 0;
  const liver = log.liverGlycogenPct ?? 0;

  switch (dt) {
    case 'rest':
      return `Low-carb rest. Liver glycogen ${liver}%, muscle ${muscle}%. Body starts pulling from stored fat.`;
    case 'push':
      return `Push on ${carbsActual}g carbs — muscle glycogen drops from training, fat burning ramps up.`;
    case 'pull':
      return `Pull day, ${carbsActual}g carbs. Deepest depletion of the cycle — prime fat-oxidation window.`;
    case 'legs':
      return carbsActual >= target * 0.9
        ? `Refeed hit ${carbsActual}g carbs — glycogen refills to ~${muscle}%, water binds in (expect +1–2 lb scale).`
        : `Refeed only ${carbsActual}g carbs vs ${target}g target — glycogen didn't fully reload, next cycle will feel flat.`;
  }
}

function workoutSummary(log: CycleLog | null, dt: DayType): string {
  if (!log) return dt === 'rest' ? 'Rest' : '—';
  if (dt === 'rest') return 'Rest day';
  if (log.workoutExerciseCount === 0) return 'Not logged';
  return `${log.workoutExerciseCount} exercises · ${log.workoutVolumeLbs.toLocaleString()} lbs volume`;
}

function buildCycleDays(startDate: string | null, logs: Map<string, CycleLog>): CycleDay[] {
  const today = todayISO();
  return CYCLE_ORDER.map((dt, idx) => {
    const date = startDate ? addDaysISO(startDate, idx) : null;
    const log = date ? logs.get(date) ?? null : null;
    const target = MACRO_TARGETS[dt].carbs;
    return {
      dayType: dt,
      dayNumber: idx + 1,
      date,
      isToday: date === today,
      isFuture: date ? date > today : false,
      isLogged: !!log,
      log,
      carbs: { actual: log?.carbsActual ?? null, target },
      liverGlycogenPct: log?.liverGlycogenPct ?? null,
      muscleGlycogenPct: log?.muscleGlycogenPct ?? null,
      fatBurningPct: log?.fatBurningPct ?? null,
      workout: workoutSummary(log, dt),
      insight: dayInsight(dt, log),
    };
  });
}

function glycogenSeriesFromDays(days: CycleDay[], label: string): GlycogenSeries {
  return {
    cycleLabel: label,
    liver: days.map(d => d.liverGlycogenPct),
    muscle: days.map(d => d.muscleGlycogenPct),
  };
}

function computeGrade(
  currentDays: CycleDay[],
): { letter: CycleGrade; tone: Tone; carbTargetsHit: string; vShapeFormed: string; refeedTimed: string } {
  const logged = currentDays.filter(d => d.isLogged);
  const complete = logged.length === 4;

  if (logged.length === 0) {
    return {
      letter: 'incomplete',
      tone: 'neutral',
      carbTargetsHit: 'Nothing logged yet.',
      vShapeFormed: '—',
      refeedTimed: '—',
    };
  }

  // Carb target adherence
  const carbHits = logged.filter(d => {
    if (d.carbs.actual == null || d.carbs.target == 0) return false;
    return Math.abs(d.carbs.actual - d.carbs.target) / d.carbs.target <= 0.15;
  }).length;
  const carbHitRate = `${carbHits}/${logged.length} days within 15% of carb target.`;

  // V-shape formation: muscle glycogen should dip on pull then rebound on legs
  const pull = currentDays.find(d => d.dayType === 'pull');
  const legs = currentDays.find(d => d.dayType === 'legs');
  const rest = currentDays.find(d => d.dayType === 'rest');
  let vShape: string;
  if (pull?.muscleGlycogenPct != null && legs?.muscleGlycogenPct != null) {
    if (legs.muscleGlycogenPct > pull.muscleGlycogenPct + 15) {
      vShape = `V-shape formed cleanly — muscle glycogen dropped to ${pull.muscleGlycogenPct}% on pull, rebounded to ${legs.muscleGlycogenPct}% on legs.`;
    } else {
      vShape = `V-shape weak — glycogen only moved from ${pull.muscleGlycogenPct}% (pull) to ${legs.muscleGlycogenPct}% (legs). Refeed carbs may have been too low.`;
    }
  } else if (pull?.muscleGlycogenPct != null && rest?.muscleGlycogenPct != null) {
    vShape = `Depletion trending: rest ${rest.muscleGlycogenPct}% → pull ${pull.muscleGlycogenPct}%. Refeed day not logged yet.`;
  } else {
    vShape = 'Need pull + legs days logged to evaluate V-shape.';
  }

  // Refeed timing: legs day should be the highest-carb day
  let refeedTimed: string;
  if (legs?.carbs.actual != null) {
    const otherCarbs = logged.filter(d => d.dayType !== 'legs').map(d => d.carbs.actual ?? 0);
    const maxOther = otherCarbs.length ? Math.max(...otherCarbs) : 0;
    if (legs.carbs.actual > maxOther + 50) {
      refeedTimed = `Refeed timing good — ${legs.carbs.actual}g on legs vs max ${maxOther}g elsewhere.`;
    } else {
      refeedTimed = `Refeed wasn't distinct — ${legs.carbs.actual}g on legs vs ${maxOther}g elsewhere. Bigger swing recommended.`;
    }
  } else {
    refeedTimed = 'Legs day not logged yet — refeed timing pending.';
  }

  // Letter grade
  let letter: CycleGrade = 'C';
  let tone: Tone = 'neutral';
  if (!complete) {
    letter = 'incomplete';
    tone = 'neutral';
  } else {
    const score =
      (carbHits / 4) * 0.5 +
      (vShape.startsWith('V-shape formed') ? 0.3 : 0) +
      (refeedTimed.startsWith('Refeed timing good') ? 0.2 : 0);
    if (score >= 0.85) { letter = 'A'; tone = 'positive'; }
    else if (score >= 0.7) { letter = 'B'; tone = 'positive'; }
    else if (score >= 0.5) { letter = 'C'; tone = 'neutral'; }
    else { letter = 'D'; tone = 'warning'; }
  }

  return { letter, tone, carbTargetsHit: carbHitRate, vShapeFormed: vShape, refeedTimed };
}

function buildCoaching(currentDays: CycleDay[], previousDays: CycleDay[] | null): string {
  const logged = currentDays.filter(d => d.isLogged);
  if (logged.length === 0) {
    return `This cycle hasn't been logged yet. Start with today's entry on the Log tab, then come back here to see how the V forms.`;
  }

  const rest = currentDays.find(d => d.dayType === 'rest' && d.isLogged);
  const push = currentDays.find(d => d.dayType === 'push' && d.isLogged);
  const pull = currentDays.find(d => d.dayType === 'pull' && d.isLogged);
  const legs = currentDays.find(d => d.dayType === 'legs' && d.isLogged);

  const parts: string[] = [];

  // Opening: what the cycle design is doing
  const lowCarbDays = [rest, push, pull].filter((d): d is CycleDay => !!d);
  if (lowCarbDays.length >= 1) {
    const avgCarbs = Math.round(
      lowCarbDays.reduce((s, d) => s + (d.carbs.actual ?? 0), 0) / lowCarbDays.length
    );
    parts.push(
      `The first three days ran carbs at around ${avgCarbs}g each, which forces your body to stop coasting on dietary glucose and tap into stored fuel instead. ` +
      (rest?.liverGlycogenPct != null && pull?.liverGlycogenPct != null
        ? `Liver glycogen drifts down from ~${rest.liverGlycogenPct}% on rest day to ~${pull.liverGlycogenPct}% by pull day as your brain keeps burning through ~80g/day of glucose.`
        : `Liver glycogen quietly drains because your brain burns through ~80g/day of glucose with no carbs to replace it.`)
    );
  }

  // Middle: workout + fat burning
  if (pull?.fatBurningPct != null) {
    parts.push(
      `By pull day, fat oxidation hits its peak — an estimated ${pull.fatBurningPct}% of your daily energy is coming from body fat rather than carbs. That's the point of the low phase: strip carbs, and the body has no choice but to run on fat.`
    );
  }

  // Refeed explanation
  if (legs?.isLogged && legs.carbs.actual != null) {
    const carbsG = legs.carbs.actual;
    // Each gram of carbs stored as glycogen binds ~3g water → ~4g total weight per g glycogen
    // Assume ~60% of refeed carbs go into glycogen
    const glycogenGained = Math.round(carbsG * 0.6);
    const waterGained = glycogenGained * WATER_PER_GLYCOGEN_G;
    const totalLbs = ((glycogenGained + waterGained) / GRAMS_PER_LB).toFixed(1);
    parts.push(
      `Legs day's ${carbsG}g carb refeed did exactly what it's designed to: roughly ${glycogenGained}g got stored as glycogen, which pulled about ${waterGained}g of water into the muscle with it (1g glycogen holds 3g water). That's why you'll see around +${totalLbs} lb on the scale the next morning even though zero fat was gained — it's literally water, gone again by the end of the next low-carb cycle.`
    );
  } else if (pull && !legs?.isLogged) {
    parts.push(
      `Legs day hasn't happened yet — when it does, expect a scale jump of 1–2 lb. That's water binding to the glycogen you're about to refill, not fat. The scale will settle back down within 2–3 days.`
    );
  }

  // Compare to previous cycle
  if (previousDays) {
    const prevLegs = previousDays.find(d => d.dayType === 'legs' && d.isLogged);
    const prevPull = previousDays.find(d => d.dayType === 'pull' && d.isLogged);
    if (prevPull && pull && prevPull.muscleGlycogenPct != null && pull.muscleGlycogenPct != null) {
      const diff = pull.muscleGlycogenPct - prevPull.muscleGlycogenPct;
      if (Math.abs(diff) > 5) {
        parts.push(
          `Compared to last cycle's pull day (glycogen ${prevPull.muscleGlycogenPct}%), this one bottomed ${Math.abs(diff)}pp ${diff < 0 ? 'deeper' : 'shallower'} — meaning the low phase ${diff < 0 ? 'hit harder' : 'was less effective'} this time.`
        );
      }
    }
  }

  return parts.join(' ');
}

function buildWeightBreakdown(
  targetDate: string,
  currentDays: CycleDay[],
  allLogs: CycleLog[],
): WeightBreakdown {
  const today = currentDays.find(d => d.date === targetDate);
  const todayLog = today?.log ?? null;
  const scaleWeight = todayLog?.weightLbs ?? null;

  // Estimate excess glycogen water based on current muscle/liver glycogen vs depleted baseline (~40%)
  let glycogenWaterLbs: number | null = null;
  let estimatedLeanWeight: number | null = null;
  let lastRefeedDate: string | null = null;
  let explanation = '';

  // Find most recent legs (refeed) day
  const pastLegsDays = allLogs
    .filter(l => l.dayType === 'legs' && l.date <= targetDate)
    .sort((a, b) => b.date.localeCompare(a.date));
  lastRefeedDate = pastLegsDays[0]?.date ?? null;

  if (scaleWeight != null && todayLog?.muscleGlycogenPct != null && todayLog?.liverGlycogenPct != null) {
    // Baseline = ~40% muscle, ~45% liver (typical depleted mid-cycle state)
    const baselineMuscle = 40;
    const baselineLiver = 45;
    const excessMuscleG = ((todayLog.muscleGlycogenPct - baselineMuscle) / 100) * GLYCOGEN_MAX.muscle;
    const excessLiverG = ((todayLog.liverGlycogenPct - baselineLiver) / 100) * GLYCOGEN_MAX.liver;
    const excessGlycogen = Math.max(0, excessMuscleG + excessLiverG);
    const excessWater = excessGlycogen * WATER_PER_GLYCOGEN_G;
    const totalExcessLbs = (excessGlycogen + excessWater) / GRAMS_PER_LB;

    glycogenWaterLbs = Math.round(totalExcessLbs * 10) / 10;
    estimatedLeanWeight = Math.round((scaleWeight - glycogenWaterLbs) * 10) / 10;

    if (glycogenWaterLbs > 0.3) {
      const refeedPhrase = lastRefeedDate
        ? ` from your ${lastRefeedDate} refeed`
        : '';
      explanation = `Scale shows ${scaleWeight.toFixed(1)} lb, but an estimated ~${glycogenWaterLbs.toFixed(1)} lb is glycogen + bound water${refeedPhrase} (glycogen ${todayLog.muscleGlycogenPct}% muscle, ${todayLog.liverGlycogenPct}% liver — each gram of glycogen pulls in 3g of water with it). Your actual lean-plus-fat body weight is closer to **~${estimatedLeanWeight.toFixed(1)} lb** — what you'd weigh at the bottom of your next low-carb cycle.`;
    } else {
      explanation = `Scale shows ${scaleWeight.toFixed(1)} lb. Glycogen levels are low right now (${todayLog.muscleGlycogenPct}% muscle), so minimal water weight is inflating this reading — this is close to your actual body weight.`;
    }
  } else if (scaleWeight != null) {
    explanation = `Scale shows ${scaleWeight.toFixed(1)} lb. Not enough glycogen data yet to estimate water weight vs fat weight.`;
  }

  // 2-week moving average trend check
  const weights = allLogs
    .filter(l => l.weightLbs != null && l.date <= targetDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  let flagTrend = false;
  let trendMessage = '';

  if (weights.length < 14) {
    trendMessage = `Need at least 14 days of weigh-ins before calling a trend (you have ${weights.length}). Daily fluctuations from carb cycling can mask fat loss for 1–2 weeks.`;
  } else {
    // Compute 7-day moving averages for each of the last 14 days
    const movingAvgs: { date: string; avg: number }[] = [];
    for (let i = 6; i < weights.length; i++) {
      const window = weights.slice(i - 6, i + 1);
      const avg = window.reduce((s, w) => s + (w.weightLbs ?? 0), 0) / window.length;
      movingAvgs.push({ date: weights[i].date, avg });
    }
    if (movingAvgs.length >= 14) {
      const recent7 = movingAvgs.slice(-7);
      const prior7 = movingAvgs.slice(-14, -7);
      const recentAvg = recent7.reduce((s, m) => s + m.avg, 0) / recent7.length;
      const priorAvg = prior7.reduce((s, m) => s + m.avg, 0) / prior7.length;
      if (recentAvg > priorAvg + 0.5) {
        flagTrend = true;
        trendMessage = `7-day moving average has risen for 2 straight weeks (${priorAvg.toFixed(1)} → ${recentAvg.toFixed(1)} lb). This is past carb-cycling noise — weight is genuinely trending up.`;
      } else {
        trendMessage = `7-day moving average is ${recentAvg.toFixed(1)} lb (prior week ${priorAvg.toFixed(1)} lb). Nothing flagged — any daily scale spikes are glycogen water.`;
      }
    }
  }

  return {
    scaleWeight,
    glycogenWaterLbs,
    estimatedLeanWeight,
    lastRefeedDate,
    explanation,
    flagTrend,
    trendMessage,
  };
}

export function buildCycleAnalysis(logs: CycleLog[], targetDate: string): CycleAnalysis {
  const byDate = new Map(logs.map(l => [l.date, toLog(l)]));
  const startDate = findCycleStart(targetDate, byDate);
  const prevStartDate = startDate ? findCycleStart(addDaysISO(startDate, -1), byDate) : null;

  const currentDays = buildCycleDays(startDate, byDate);
  const previousDays = prevStartDate ? buildCycleDays(prevStartDate, byDate) : null;

  // Cycle numbering — count rest days up to and including startDate
  const restDaysCount = logs.filter(l => l.dayType === 'rest' && l.date <= (startDate ?? targetDate)).length;
  const currentCycleNum = Math.max(1, restDaysCount);
  const previousCycleNum = Math.max(1, currentCycleNum - 1);

  const grade = computeGrade(currentDays);
  const coaching = buildCoaching(currentDays, previousDays);
  const weightBreakdown = buildWeightBreakdown(targetDate, currentDays, logs);

  return {
    targetDate,
    currentCycle: {
      startDate,
      cycleNumber: currentCycleNum,
      days: currentDays,
    },
    previousCycle: previousDays && prevStartDate
      ? { startDate: prevStartDate, cycleNumber: previousCycleNum, days: previousDays }
      : null,
    glycogenSeries: {
      current: glycogenSeriesFromDays(currentDays, `Cycle ${currentCycleNum}`),
      previous: previousDays ? glycogenSeriesFromDays(previousDays, `Cycle ${previousCycleNum}`) : null,
    },
    grade,
    coaching,
    weightBreakdown,
  };
}
