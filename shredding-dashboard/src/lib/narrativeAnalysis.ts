import { MACRO_TARGETS, USER_PROFILE, type DayType } from '@/constants/targets';

export type Tone = 'positive' | 'neutral' | 'warning' | 'critical';

export interface NarrativeSection {
  id: string;
  title: string;
  tone: Tone;
  body: string[]; // paragraphs
  bullets?: string[];
}

export interface NarrativeAnalysis {
  date: string;
  hasTodayLog: boolean;
  summary: NarrativeSection;
  sections: NarrativeSection[];
  bottomLine: string[];
}

export interface NarrativeLog {
  date: string;
  dayType: string;
  caloriesActual: number | null;
  caloriesTarget: number | null;
  proteinActual: number | null;
  proteinTarget: number | null;
  carbsActual: number | null;
  carbsTarget: number | null;
  fatActual: number | null;
  fatTarget: number | null;
  weightLbs: number | null;
  morningHr: number | null;
  energyScore: number | null;
  satietyScore: number | null;
  dailyTotalCalBurned: number | null;
  workoutDurationMin: number | null;
  workoutAvgHr: number | null;
  workoutExerciseCount?: number;
  workoutTotalSets?: number;
  workoutVolumeLbs?: number;
}

const DEFICIT_MIN = 300;
const DEFICIT_MAX = 650;
const WEIGHT_RATE_MIN = 0.3;
const WEIGHT_RATE_MAX = 1.2;
const PROTEIN_FLOOR = 140;

function addDaysISO(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function estimateTdee(log: NarrativeLog): number {
  if (log.dailyTotalCalBurned != null) return log.dailyTotalCalBurned;
  const dt = log.dayType as DayType;
  return MACRO_TARGETS[dt]?.tdee ?? USER_PROFILE.bmr + 500;
}

function computeDeficit(log: NarrativeLog): number | null {
  if (log.caloriesActual == null) return null;
  return estimateTdee(log) - log.caloriesActual;
}

function linearSlope(points: { day: number; weight: number }[]): number | null {
  if (points.length < 2) return null;
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.day, 0);
  const sumY = points.reduce((s, p) => s + p.weight, 0);
  const sumXY = points.reduce((s, p) => s + p.day * p.weight, 0);
  const sumX2 = points.reduce((s, p) => s + p.day * p.day, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;
  return (n * sumXY - sumX * sumY) / denom;
}

function average(nums: (number | null)[]): number | null {
  const v = nums.filter((n): n is number => n != null && Number.isFinite(n));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

function pct(actual: number, target: number): number {
  return Math.round((actual / target - 1) * 100);
}

function fmtDelta(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

export function buildNarrativeAnalysis(
  logs: NarrativeLog[],
  targetDate: string,
): NarrativeAnalysis {
  const byDate = new Map(logs.map(l => [l.date, l]));
  const today = byDate.get(targetDate) ?? null;
  const windowStart = addDaysISO(targetDate, -6);
  const window = logs.filter(l => l.date >= windowStart && l.date <= targetDate);

  // No log for today — short-circuit with a helpful summary
  if (!today) {
    return {
      date: targetDate,
      hasTodayLog: false,
      summary: {
        id: 'summary',
        title: 'No log for today',
        tone: 'warning',
        body: [
          `You haven't logged anything for ${targetDate} yet. Once you fill out the daily form on the Log tab, this page will walk through your deficit, macros, workout, and weight trend with a real written analysis — not just numbers.`,
        ],
      },
      sections: window.length
        ? [
            {
              id: 'recent',
              title: 'Recent days (for context)',
              tone: 'neutral',
              body: [`You have ${window.length} day${window.length === 1 ? '' : 's'} logged in the last week. Come back after logging today for the full analysis.`],
            },
          ]
        : [],
      bottomLine: ['Log today\'s data in the Log tab.'],
    };
  }

  const sections: NarrativeSection[] = [];

  // ============================================================
  // Section: Deficit analysis
  // ============================================================
  const tdee = estimateTdee(today);
  const tdeeSource = today.dailyTotalCalBurned != null ? 'your Apple Watch daily total' : `the estimated TDEE for a ${today.dayType} day`;
  const deficit = computeDeficit(today);
  const calEaten = today.caloriesActual;
  const calTarget = today.caloriesTarget ?? MACRO_TARGETS[today.dayType as DayType]?.calories ?? null;

  const deficitParas: string[] = [];
  let deficitTone: Tone = 'neutral';

  if (deficit != null && calEaten != null) {
    const projWeeklyLoss = (deficit * 7) / 3500;

    deficitParas.push(
      `You burned about ${tdee.toLocaleString()} cal today (${tdeeSource}) and ate ${calEaten.toLocaleString()} cal — a **${deficit > 0 ? 'deficit' : 'surplus'} of ${Math.abs(deficit).toLocaleString()} cal**. ` +
      (deficit > 0
        ? `At that rate, you'd lose about **${projWeeklyLoss.toFixed(2)} lb/week** if every day looked like today.`
        : `That means you ate more than you burned — today actively worked against the cut.`)
    );

    if (deficit < 0) {
      deficitTone = 'critical';
      deficitParas.push(
        `A surplus day isn't fatal, but if this happens 2–3× a week the whole cut stalls. Double-check the logged macros — maybe something was under-counted, or a snack slipped through.`
      );
    } else if (deficit < DEFICIT_MIN) {
      deficitTone = 'warning';
      deficitParas.push(
        `This is **below the ${DEFICIT_MIN}-cal minimum** we aim for on cutting days. You'll still lose weight over time, but very slowly — probably under 0.5 lb/week. If most days look like this, trim ~100 cal off your target.`
      );
    } else if (deficit > DEFICIT_MAX) {
      deficitTone = 'warning';
      deficitParas.push(
        `This deficit is **aggressive (over ${DEFICIT_MAX} cal)** and will show up in recovery and morning HR within a few days if it persists. Watch your energy score and sleep this week.`
      );
    } else {
      deficitTone = 'positive';
      deficitParas.push(
        `This is squarely in the sweet spot (${DEFICIT_MIN}–${DEFICIT_MAX} cal) — a healthy rate of fat loss that still lets you recover from training.`
      );
    }

    // 7-day context
    const weekDeficits = window.map(l => computeDeficit(l)).filter((d): d is number => d != null);
    if (weekDeficits.length >= 2) {
      const avg = Math.round(weekDeficits.reduce((a, b) => a + b, 0) / weekDeficits.length);
      const weeklyProj = (avg * 7) / 3500;
      deficitParas.push(
        `Over the last ${weekDeficits.length} days, your **average deficit is ${avg} cal/day**, which projects to roughly ${weeklyProj.toFixed(2)} lb/week if it holds.`
      );
    }
  } else if (calTarget) {
    deficitTone = 'warning';
    deficitParas.push(
      `You didn't log calories eaten today, so there's nothing to compare against the ${calTarget}-cal target. Add your food totals to the log to see the deficit.`
    );
  }

  sections.push({
    id: 'deficit',
    title: 'Deficit & calorie balance',
    tone: deficitTone,
    body: deficitParas,
  });

  // ============================================================
  // Section: Nutrition quality
  // ============================================================
  const nutritionParas: string[] = [];
  const nutritionBullets: string[] = [];
  let nutritionTone: Tone = 'neutral';

  if (
    today.proteinActual != null &&
    today.carbsActual != null &&
    today.fatActual != null &&
    today.proteinTarget &&
    today.carbsTarget &&
    today.fatTarget
  ) {
    const proteinPct = pct(today.proteinActual, today.proteinTarget);
    const carbsPct = pct(today.carbsActual, today.carbsTarget);
    const fatPct = pct(today.fatActual, today.fatTarget);

    const lines: string[] = [];
    lines.push(
      `Protein hit ${today.proteinActual}g against a ${today.proteinTarget}g target (${fmtDelta(proteinPct)}%).`
    );
    lines.push(
      `Carbs landed at ${today.carbsActual}g vs ${today.carbsTarget}g (${fmtDelta(carbsPct)}%).`
    );
    lines.push(
      `Fat came in at ${today.fatActual}g vs ${today.fatTarget}g (${fmtDelta(fatPct)}%).`
    );
    nutritionBullets.push(...lines);

    if (today.proteinActual < PROTEIN_FLOOR) {
      nutritionTone = 'critical';
      nutritionParas.push(
        `**Protein (${today.proteinActual}g) fell below the ${PROTEIN_FLOOR}g floor.** In a cut, protein is what keeps your muscle intact — under this threshold and your body starts pulling amino acids from lean tissue instead of fat. Add an extra scoop of whey or 100g of chicken to fix tomorrow.`
      );
    } else if (today.proteinActual >= today.proteinTarget) {
      nutritionParas.push(
        `Protein was solid — you hit your ${today.proteinTarget}g target${proteinPct > 5 ? ' with some room to spare' : ''}. This is the single biggest lever for holding onto muscle during the cut, and you got it right.`
      );
    } else {
      nutritionParas.push(
        `Protein was ${today.proteinActual}g — above the ${PROTEIN_FLOOR}g safety floor but ${Math.abs(proteinPct)}% under your ${today.proteinTarget}g target. Not a problem for one day, but aim for the target on training days.`
      );
    }

    if (today.dayType === 'legs') {
      if (carbsPct < -10) {
        nutritionTone = nutritionTone === 'critical' ? 'critical' : 'warning';
        nutritionParas.push(
          `Since today was a legs/refeed day, the **carbs were ${Math.abs(carbsPct)}% low** — refeeds only work if you actually refill glycogen. Tomorrow's pull day will feel flat.`
        );
      } else if (carbsPct >= -5) {
        nutritionParas.push(
          `Carbs on this high-carb legs day hit the target — glycogen should be fully loaded for tomorrow's session.`
        );
      }
    } else {
      if (carbsPct > 15) {
        nutritionTone = nutritionTone === 'critical' ? 'critical' : 'warning';
        nutritionParas.push(
          `Carbs ran **${carbsPct}% over** target for a low-carb day — not disastrous, but it blunts the depletion the low days are designed to cause.`
        );
      }
    }

    if (fatPct > 15 && today.dayType !== 'legs') {
      nutritionParas.push(
        `Fat was ${fatPct}% over target. Fat is calorie-dense (9 cal/g) so this is where most overshoots come from — check portion sizes on oils, nuts, or avocado.`
      );
    }

    if (nutritionTone === 'neutral') nutritionTone = 'positive';
  } else {
    nutritionTone = 'warning';
    nutritionParas.push(`Some macros weren't logged — fill them in to see a full nutrition breakdown.`);
  }

  sections.push({
    id: 'nutrition',
    title: 'Nutrition quality',
    tone: nutritionTone,
    body: nutritionParas,
    bullets: nutritionBullets.length ? nutritionBullets : undefined,
  });

  // ============================================================
  // Section: Workout
  // ============================================================
  const workoutParas: string[] = [];
  let workoutTone: Tone = 'neutral';

  if (today.dayType === 'rest') {
    workoutTone = 'positive';
    workoutParas.push(
      `Today was a programmed rest day — nothing to analyze on the training side. Rest days are where recovery and fat loss actually happen, so the goal here is just to hit your (lower) calorie target, which you can see in the deficit section above.`
    );
  } else if ((today.workoutExerciseCount ?? 0) > 0) {
    workoutTone = 'positive';
    const setsStr = today.workoutTotalSets ? ` across ${today.workoutTotalSets} sets` : '';
    const volStr = today.workoutVolumeLbs
      ? ` Total volume came out to about ${today.workoutVolumeLbs.toLocaleString()} lbs (working sets × total weight including bar).`
      : '';
    workoutParas.push(
      `You logged **${today.workoutExerciseCount} exercises**${setsStr} on this ${today.dayType} day.${volStr}`
    );

    // Compare to previous same-day-type session
    const sameType = logs
      .filter(l => l.dayType === today.dayType && l.date < today.date && l.workoutVolumeLbs)
      .sort((a, b) => b.date.localeCompare(a.date));
    const prev = sameType[0];
    if (prev?.workoutVolumeLbs && today.workoutVolumeLbs) {
      const diff = today.workoutVolumeLbs - prev.workoutVolumeLbs;
      const pctDiff = Math.round((diff / prev.workoutVolumeLbs) * 100);
      if (diff > 0) {
        workoutParas.push(
          `Compared to your last ${today.dayType} session on ${prev.date} (${prev.workoutVolumeLbs.toLocaleString()} lbs), volume is **up ${pctDiff}%** — progressive overload is happening, which is exactly what you want during a cut to keep muscle mass.`
        );
      } else if (diff < 0) {
        workoutTone = 'warning';
        workoutParas.push(
          `Volume is **down ${Math.abs(pctDiff)}%** from your last ${today.dayType} session (${prev.workoutVolumeLbs.toLocaleString()} lbs on ${prev.date}). A dip here and there is normal during a cut, but if this becomes a trend across 2+ weeks, it's a signal your deficit is too aggressive or recovery is short.`
        );
      } else {
        workoutParas.push(
          `Volume matched your last ${today.dayType} session almost exactly — stable performance, which is a win mid-cut.`
        );
      }
    }

    if (today.workoutAvgHr) {
      workoutParas.push(
        `Average heart rate was ${today.workoutAvgHr} bpm. For resistance training, anywhere from 110–140 is typical; much higher often means you're under-fueled or cutting rest too short.`
      );
    }
  } else {
    workoutTone = 'warning';
    workoutParas.push(
      `Today was a **${today.dayType} day** but no workout was logged. If you trained, head to the Workout tab and log it so the analysis can track your progressive overload.`
    );
  }

  sections.push({
    id: 'workout',
    title: 'Workout',
    tone: workoutTone,
    body: workoutParas,
  });

  // ============================================================
  // Section: Weight trend
  // ============================================================
  const weightParas: string[] = [];
  let weightTone: Tone = 'neutral';

  const weightPoints = window
    .map(l => ({ date: l.date, weight: l.weightLbs }))
    .filter((p): p is { date: string; weight: number } => p.weight != null)
    .map(p => ({ day: new Date(p.date + 'T00:00:00Z').getTime() / 86400000, weight: p.weight }));
  const slopePerDay = linearSlope(weightPoints);
  const weeklyLoss = slopePerDay != null ? -slopePerDay * 7 : null;

  if (today.weightLbs != null) {
    weightParas.push(
      `You weighed **${today.weightLbs.toFixed(1)} lb** this morning${today.dayType === 'legs' ? ' (a legs/high-carb day — expect water weight to spike here)' : today.dayType === 'rest' ? ' after a rest day' : ` on a ${today.dayType} low-carb day`}.`
    );
  } else {
    weightParas.push(`No weigh-in logged for today.`);
  }

  if (weightPoints.length < 4) {
    weightParas.push(
      `Only ${weightPoints.length} weigh-in${weightPoints.length === 1 ? '' : 's'} in the last 7 days — not enough to compute a trend. Carb cycling makes single-day weights really noisy (refeed days can swing 2–3 lb in water weight alone), so I need at least 4 readings before saying anything about direction.`
    );
  } else if (weeklyLoss != null) {
    const rateStr = weeklyLoss >= 0 ? `−${weeklyLoss.toFixed(2)}` : `+${Math.abs(weeklyLoss).toFixed(2)}`;
    weightParas.push(
      `The linear trend over your last ${weightPoints.length} weigh-ins is **${rateStr} lb/week**.`
    );

    if (weeklyLoss < 0) {
      weightTone = 'critical';
      weightParas.push(
        `That's showing gain, not loss. Early in a cut this can be glycogen refill from the first few high-carb days, so give it another 5–7 days before panicking — but if the trend stays positive into week 2, the deficit isn't real.`
      );
    } else if (weeklyLoss < WEIGHT_RATE_MIN) {
      weightTone = 'warning';
      weightParas.push(
        `That's slower than the ${WEIGHT_RATE_MIN}–${WEIGHT_RATE_MAX} lb/week target band. Either the deficit is too small, or you're early in the cut and haven't fully dropped your initial water. Wait another week, then if it's still this slow, trim 100 cal off rest days.`
      );
    } else if (weeklyLoss > WEIGHT_RATE_MAX) {
      weightTone = 'warning';
      weightParas.push(
        `That's above the ${WEIGHT_RATE_MAX} lb/week safety ceiling. Fast early loss is usually water; if it continues into week 3+, you'll start losing muscle. Add 100 cal back to training days if it persists.`
      );
    } else {
      weightTone = 'positive';
      weightParas.push(
        `Dead center in the healthy ${WEIGHT_RATE_MIN}–${WEIGHT_RATE_MAX} lb/week band. This is the rate that lets you lose fat without sacrificing muscle or recovery. Hold the course.`
      );
    }
  }

  sections.push({
    id: 'weight',
    title: 'Weight trend',
    tone: weightTone,
    body: weightParas,
  });

  // ============================================================
  // Section: Recovery (energy, satiety, HR)
  // ============================================================
  const recoveryParas: string[] = [];
  let recoveryTone: Tone = 'neutral';

  const signals: string[] = [];
  if (today.energyScore != null) signals.push(`energy ${today.energyScore}/5`);
  if (today.satietyScore != null) signals.push(`satiety ${today.satietyScore}/5`);
  if (today.morningHr != null) signals.push(`morning HR ${today.morningHr} bpm`);

  if (signals.length) {
    recoveryParas.push(`You logged: ${signals.join(', ')}.`);

    if (today.energyScore != null && today.energyScore <= 2) {
      recoveryTone = 'critical';
      recoveryParas.push(
        `Energy at ${today.energyScore}/5 is a red flag — usually means under-fueling, under-sleeping, or both. If tomorrow is the same, eat at maintenance for one day and reset.`
      );
    } else if (today.energyScore != null && today.energyScore >= 4) {
      recoveryTone = 'positive';
      recoveryParas.push(
        `Energy at ${today.energyScore}/5 says your recovery is keeping up with the deficit — ideal.`
      );
    }

    const weekHr = average(window.map(l => l.morningHr));
    if (weekHr != null && weekHr > 70) {
      recoveryTone = recoveryTone === 'critical' ? 'critical' : 'warning';
      recoveryParas.push(
        `Your 7-day average morning HR is ${Math.round(weekHr)} bpm — above the 70 bpm line that usually signals accumulated stress (aggressive cut + training + poor sleep stacking up). Watch this; if it keeps climbing, take a diet break.`
      );
    }

    if (today.satietyScore != null && today.satietyScore <= 2) {
      recoveryParas.push(
        `Satiety at ${today.satietyScore}/5 means hunger is getting hard to fight. Try adding volume (leafy greens, tomatoes, zero-cal liquids) before trimming more calories.`
      );
    }
  } else {
    recoveryParas.push(`No subjective scores or morning HR logged today — worth capturing these, since they're the earliest warning signs that a cut is getting too aggressive.`);
  }

  sections.push({
    id: 'recovery',
    title: 'Recovery & subjective signals',
    tone: recoveryTone,
    body: recoveryParas,
  });

  // ============================================================
  // Summary — built last so it can reference other tones
  // ============================================================
  const criticalCount = sections.filter(s => s.tone === 'critical').length;
  const warningCount = sections.filter(s => s.tone === 'warning').length;
  const positiveCount = sections.filter(s => s.tone === 'positive').length;

  let summaryTone: Tone;
  let summaryBody: string[];
  const bottomLine: string[] = [];

  if (criticalCount >= 1) {
    summaryTone = 'critical';
    summaryBody = [
      `Today has one or more serious issues — mostly around ${
        sections.find(s => s.tone === 'critical')?.title.toLowerCase() ?? 'a critical metric'
      }. The cut can absorb bad days, but this is the kind of thing that stalls progress if it becomes the norm. Read the sections below and fix the root cause tomorrow.`,
    ];
  } else if (warningCount >= 2) {
    summaryTone = 'warning';
    summaryBody = [
      `Mixed day. ${warningCount} metrics need attention and ${positiveCount} are going well. You're not off track, but you're not fully dialed in either — see the specific sections below for what to tune.`,
    ];
  } else if (positiveCount >= 3) {
    summaryTone = 'positive';
    summaryBody = [
      `Great day. ${positiveCount} of your key metrics are on target and none are in crisis. The cut is working. Keep doing what you're doing tomorrow.`,
    ];
    if (deficit != null && deficit >= DEFICIT_MIN && deficit <= DEFICIT_MAX) {
      summaryBody[0] += ` Your ${Math.round(deficit)}-cal deficit will compound into ~${(deficit * 7 / 3500).toFixed(2)} lb of fat loss per week at this pace.`;
    }
  } else {
    summaryTone = 'neutral';
    summaryBody = [
      `Decent day. Most metrics are logged and within range. Read through the sections for the full picture.`,
    ];
  }

  // Bottom-line takeaways
  if (deficit != null && deficit < DEFICIT_MIN) bottomLine.push(`Deficit was only ${Math.round(deficit)} cal — tighten the diet tomorrow.`);
  if (deficit != null && deficit > DEFICIT_MAX) bottomLine.push(`Deficit was ${Math.round(deficit)} cal — watch recovery this week.`);
  if (deficit != null && deficit >= DEFICIT_MIN && deficit <= DEFICIT_MAX) bottomLine.push(`Deficit of ${Math.round(deficit)} cal is on target — keep this pattern.`);
  if (today.proteinActual != null && today.proteinActual < PROTEIN_FLOOR) bottomLine.push(`Hit protein tomorrow (was ${today.proteinActual}g, need ≥${PROTEIN_FLOOR}g).`);
  if (weeklyLoss != null && weightPoints.length >= 4) {
    if (weeklyLoss < 0) bottomLine.push(`Weight is trending up — re-audit your calorie counts.`);
    else if (weeklyLoss >= WEIGHT_RATE_MIN && weeklyLoss <= WEIGHT_RATE_MAX) bottomLine.push(`Weight trend is ${weeklyLoss.toFixed(2)} lb/wk — hold steady.`);
  }
  if (today.energyScore != null && today.energyScore <= 2) bottomLine.push(`Energy is low — a refeed day may help.`);

  return {
    date: targetDate,
    hasTodayLog: true,
    summary: {
      id: 'summary',
      title: 'Bottom line for today',
      tone: summaryTone,
      body: summaryBody,
    },
    sections,
    bottomLine,
  };
}
