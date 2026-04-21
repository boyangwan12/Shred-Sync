# Shredding Phase Dashboard — Claude Code Build Spec

## Overview

Build a full-stack web app that tracks a bodybuilding cutting/shredding phase with carb cycling. The user inputs daily data each night (from Apple Watch + Notion), and the app analyzes glycogen levels, fat burning, and plan adherence — then gives visual feedback and recommendations.

## User Context

- Male, 153.3 lbs starting weight, 14.3% body fat, LBM 131.4 lbs, BMR 1,657 cal
- Goal: 14.3% → 10% body fat in ~9 weeks (Apr 7 – Jun 30, 2026)
- Uses carb cycling: 4-day rotation (Rest → Push → Pull → Legs)
- Wears Apple Watch for workout HR and calorie data
- Logs food in Notion

## Macro Targets by Day Type

| Day Type | Calories | Protein | Carbs | Fat | TDEE |
|----------|----------|---------|-------|-----|------|
| Rest (Low) | 1,600 | 153g | 75g | 76g | ~1,990 |
| Push (Low) | 2,100 | 153g | 100g | 121g | ~2,485 |
| Pull (Low) | 2,100 | 153g | 100g | 121g | ~2,520 |
| Legs (High) | 2,200 | 153g | 250g | 65g | ~2,620 |

## Tech Stack

- **Frontend**: Next.js + React + Tailwind CSS + Chart.js (or Recharts)
- **Database**: SQLite (via Prisma) or Supabase (PostgreSQL)
- **Auth**: None needed (single user, local)
- **Deployment**: Local dev initially, can deploy to Vercel later

## Database Schema

### `daily_logs` table

```sql
CREATE TABLE daily_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE UNIQUE NOT NULL,
  day_type TEXT NOT NULL CHECK(day_type IN ('rest', 'push', 'pull', 'legs')),
  carb_type TEXT NOT NULL CHECK(carb_type IN ('low', 'high')),
  
  -- Targets (auto-filled based on day_type)
  calories_target INTEGER,
  protein_target INTEGER,
  carbs_target INTEGER,
  fat_target INTEGER,
  
  -- Actuals (user inputs)
  calories_actual INTEGER,
  protein_actual REAL,
  carbs_actual REAL,
  fat_actual REAL,
  
  -- Body metrics (morning, fasted)
  weight_lbs REAL,
  morning_hr INTEGER,           -- resting heart rate from Apple Watch
  
  -- Subjective scores (1-5)
  energy_score INTEGER CHECK(energy_score BETWEEN 1 AND 5),
  satiety_score INTEGER CHECK(satiety_score BETWEEN 1 AND 5),
  pump_score INTEGER CHECK(pump_score BETWEEN 1 AND 5),
  
  -- Apple Watch workout data
  workout_duration_min INTEGER,
  workout_active_cal INTEGER,
  workout_total_cal INTEGER,
  workout_avg_hr INTEGER,
  workout_max_hr INTEGER,
  
  -- Apple Watch daily totals
  daily_total_cal_burned INTEGER, -- total cal burned whole day
  
  -- Computed glycogen estimates (calculated by the app)
  liver_glycogen_pct REAL,
  muscle_glycogen_pct REAL,
  fat_burning_pct REAL,
  
  -- Notes
  notes TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### `weekly_checkins` table

```sql
CREATE TABLE weekly_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_number INTEGER NOT NULL,
  start_date DATE,
  end_date DATE,
  target_weight REAL,
  actual_avg_weight REAL,
  avg_calories REAL,
  avg_morning_hr REAL,
  avg_energy REAL,
  avg_satiety REAL,
  weight_change REAL,          -- vs previous week
  on_track BOOLEAN,
  adjustment TEXT,             -- recommendation
  notes TEXT
);
```

## Glycogen Estimation Model

When the user submits daily data, compute estimated glycogen levels using this model:

```javascript
function estimateGlycogen(todayLog, yesterdayLog) {
  const LIVER_MAX = 100;   // grams
  const MUSCLE_MAX = 400;  // grams
  const DAILY_LIVER_USAGE = 80; // brain + organs use ~80g/day
  
  // Start from yesterday's levels (or defaults if day 1)
  let liver = yesterdayLog?.liver_glycogen_pct ?? 75;
  let muscle = yesterdayLog?.muscle_glycogen_pct ?? 80;
  
  // Convert % to grams
  let liverG = (liver / 100) * LIVER_MAX;
  let muscleG = (muscle / 100) * MUSCLE_MAX;
  
  // Carb intake refills glycogen (liver first, then muscle)
  const carbsEaten = todayLog.carbs_actual || todayLog.carbs_target;
  let availableCarbs = carbsEaten;
  
  // Liver takes what it needs first
  const liverDeficit = LIVER_MAX - liverG;
  const liverRefill = Math.min(availableCarbs * 0.3, liverDeficit);
  liverG += liverRefill;
  availableCarbs -= liverRefill;
  
  // Remaining goes to muscle
  const muscleDeficit = MUSCLE_MAX - muscleG;
  const muscleRefill = Math.min(availableCarbs * 0.7, muscleDeficit);
  muscleG += muscleRefill;
  
  // Daily liver drain (brain usage)
  liverG = Math.max(0, liverG - DAILY_LIVER_USAGE);
  
  // Exercise depletes muscle glycogen
  const exerciseDepletion = {
    'rest': 0,
    'push': 0.15,    // ~15% depletion
    'pull': 0.15,
    'legs': 0.30,    // ~30% depletion (biggest muscles)
  };
  
  const depletion = exerciseDepletion[todayLog.day_type] || 0;
  muscleG = muscleG * (1 - depletion);
  
  // If workout HR is available, adjust depletion based on intensity
  if (todayLog.workout_avg_hr) {
    const intensityFactor = Math.min(todayLog.workout_avg_hr / 120, 1.3);
    // Higher HR = more glycogen used
    muscleG = muscleG * (1 - (depletion * (intensityFactor - 1)));
  }
  
  // Compute fat burning rate (inverse of glycogen availability)
  const avgGlycogenPct = ((liverG / LIVER_MAX) + (muscleG / MUSCLE_MAX)) / 2 * 100;
  let fatBurning = 30; // baseline
  if (avgGlycogenPct < 60) fatBurning += (60 - avgGlycogenPct) * 0.8;
  if (todayLog.day_type !== 'rest') fatBurning += 5;
  fatBurning = Math.min(Math.round(fatBurning), 85);
  
  return {
    liver_glycogen_pct: Math.round((liverG / LIVER_MAX) * 100),
    muscle_glycogen_pct: Math.round((muscleG / MUSCLE_MAX) * 100),
    fat_burning_pct: fatBurning,
  };
}
```

## Pages & Components

### 1. Dashboard (Home Page `/`)

**Top metric cards (row of 4):**
- Current weight + trend arrow (vs last week avg)
- Weekly avg deficit (actual cal burned - cal eaten)
- Days into cut / total days
- Estimated current body fat %

**Main chart: Glycogen + Fat Burning Timeline**
- X-axis: dates (last 7-14 days)
- Y-axis left: glycogen % (0-100) — two lines: liver (teal) and muscle (blue)
- Y-axis right: workout avg HR (red triangles)
- Dashed amber line: fat burning rate %
- Background color bands for day type (subtle): yellow=rest, red=push, blue=pull, green=legs
- Hover tooltips showing all data for that day

**Secondary chart: Weight Trend**
- Line chart of daily weight (with 7-day moving average overlay)
- Horizontal target line at goal weight

**Adherence bars (below charts):**
- For each day: show target vs actual for calories, protein, carbs, fat
- Color code: green if within 5%, yellow if 5-15% off, red if >15% off

### 2. Daily Input Page `/log`

**Form with sections:**

Section 1 — Day info:
- Date picker (defaults to today)
- Day type selector: Rest / Push / Pull / Legs (auto-fills targets)

Section 2 — Body metrics (morning):
- Weight (lbs) — number input
- Morning resting HR — number input

Section 3 — Nutrition actuals:
- Calories — number input (shows target next to it)
- Protein — number input (shows target)
- Carbs — number input (shows target)
- Fat — number input (shows target)
- Show real-time delta: "+24 over target" or "-10 under target"

Section 4 — Subjective scores:
- Energy (1-5) — clickable dots or slider
- Satiety (1-5) — clickable dots
- Pump quality (1-5) — clickable dots (N/A for rest days)

Section 5 — Apple Watch data:
- Workout duration (minutes)
- Active calories
- Total calories
- Avg heart rate
- Max heart rate
- Daily total calories burned

Section 6 — Notes:
- Free text field

**On submit:**
1. Save to database
2. Run glycogen estimation model
3. Save computed values
4. Redirect to dashboard with updated charts

### 3. Analysis Page `/analysis`

**Cycle comparison view:**
- Compare cycle 1 (week 1) vs cycle 2 (week 2) vs cycle 3 (week 3)
- Side-by-side glycogen curves
- Average fat burning per cycle
- Performance trend (are workout weights going up/stable/down?)

**Recommendation engine:**
After each cycle (4 days), generate recommendations:

```javascript
function generateRecommendations(cycleLogs) {
  const recs = [];
  
  // Check rest day adherence
  const restDays = cycleLogs.filter(d => d.day_type === 'rest');
  restDays.forEach(d => {
    if (d.calories_actual > d.calories_target * 1.1) {
      recs.push({
        type: 'warning',
        msg: `Rest day calories ${d.calories_actual} exceeded target ${d.calories_target} by ${Math.round((d.calories_actual/d.calories_target - 1) * 100)}%. This weakens glycogen depletion.`
      });
    }
  });
  
  // Check protein floor
  cycleLogs.forEach(d => {
    if (d.protein_actual && d.protein_actual < 140) {
      recs.push({
        type: 'danger',
        msg: `Protein was ${d.protein_actual}g on ${d.date} — below 140g floor. Risk of muscle loss.`
      });
    }
  });
  
  // Check morning HR trend
  const hrs = cycleLogs.map(d => d.morning_hr).filter(Boolean);
  const avgHR = hrs.reduce((a,b) => a+b, 0) / hrs.length;
  if (avgHR > 70) {
    recs.push({
      type: 'warning',
      msg: `Average morning HR is ${Math.round(avgHR)} bpm (above 70). Consider a diet break if this persists.`
    });
  }
  
  // Check weight loss rate
  const weights = cycleLogs.map(d => d.weight_lbs).filter(Boolean);
  if (weights.length >= 2) {
    const change = weights[0] - weights[weights.length - 1];
    const weeklyRate = change / (cycleLogs.length / 7);
    if (weeklyRate > 1.2) {
      recs.push({
        type: 'warning',
        msg: `Losing ${weeklyRate.toFixed(1)} lbs/week — faster than 1.2 lb target. Add 100 cal to training days.`
      });
    }
    if (weeklyRate < 0.3 && cycleLogs.length >= 7) {
      recs.push({
        type: 'info',
        msg: `Only ${weeklyRate.toFixed(1)} lbs/week loss. Consider trimming 100 cal from rest days.`
      });
    }
  }
  
  // Check workout HR pattern (should rise during low days)
  const workoutHRs = cycleLogs
    .filter(d => d.workout_avg_hr)
    .map(d => ({ type: d.day_type, hr: d.workout_avg_hr }));
  
  const legHR = workoutHRs.find(d => d.type === 'legs');
  const pullHR = workoutHRs.find(d => d.type === 'pull');
  if (legHR && pullHR && legHR.hr > pullHR.hr) {
    recs.push({
      type: 'info',
      msg: `Leg day HR (${legHR.hr}) was higher than pull day (${pullHR.hr}). Expected pattern is pull > legs (depleted vs refed). Your refeed timing may need adjustment.`
    });
  }
  
  // Check energy scores
  const energyScores = cycleLogs.map(d => d.energy_score).filter(Boolean);
  const avgEnergy = energyScores.reduce((a,b) => a+b, 0) / energyScores.length;
  if (avgEnergy < 2.5) {
    recs.push({
      type: 'warning',
      msg: `Average energy score is ${avgEnergy.toFixed(1)}/5. You may be cutting too aggressively. Consider bumping low-day carbs from 90g to 110g.`
    });
  }
  
  return recs;
}
```

### 4. Prediction Page `/predict`

**Tomorrow's prediction panel:**
Based on today's data + the cycle position, predict:
- Estimated glycogen levels (liver + muscle tanks visual — like the interactive widget)
- Expected weight direction (up/down/stable + why)
- Expected energy level
- Expected hunger level
- Optimal meal timing suggestion

**Visual: Two animated tank gauges** (liver + muscle) with fill levels
**Visual: Fat burning dial** showing estimated fat oxidation rate

## Design Direction

- Dark theme primary (the user's Notion is dark mode)
- Color scheme: teal (#1D9E75) for glycogen/positive, amber (#EF9F27) for fat burning/warnings, red (#E24B4A) for danger/HR, blue (#378ADD) for muscle
- Clean, data-dense dashboard feel — inspired by Apple Fitness + Notion
- No rounded bubbly UI — sharp, functional, information-rich
- Charts should be interactive (hover for details)
- Mobile-responsive (user will check on phone too)

## API Routes

```
POST /api/log          — Submit daily log
GET  /api/log/:date    — Get specific day
GET  /api/logs         — Get all logs (with date range filter)
GET  /api/analysis     — Get cycle analysis + recommendations
GET  /api/predict      — Get tomorrow's prediction
GET  /api/weekly       — Get weekly check-in data
PUT  /api/log/:date    — Update a daily log
```

## File Structure

```
shredding-dashboard/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── page.tsx              (dashboard)
│   │   ├── log/page.tsx          (daily input form)
│   │   ├── analysis/page.tsx     (cycle analysis)
│   │   ├── predict/page.tsx      (tomorrow prediction)
│   │   └── api/
│   │       ├── log/route.ts
│   │       ├── logs/route.ts
│   │       ├── analysis/route.ts
│   │       ├── predict/route.ts
│   │       └── weekly/route.ts
│   ├── components/
│   │   ├── GlycogenChart.tsx     (main timeline chart)
│   │   ├── WeightChart.tsx       (weight trend)
│   │   ├── TankGauge.tsx         (liver/muscle tank visual)
│   │   ├── FatBurningDial.tsx    (fat oxidation indicator)
│   │   ├── MetricCard.tsx        (reusable stat card)
│   │   ├── AdherenceBar.tsx      (target vs actual bars)
│   │   ├── DayInputForm.tsx      (daily log form)
│   │   ├── RecommendationCard.tsx
│   │   └── CycleComparison.tsx
│   ├── lib/
│   │   ├── glycogen.ts           (estimation model)
│   │   ├── recommendations.ts   (recommendation engine)
│   │   ├── predictions.ts       (tomorrow predictor)
│   │   └── db.ts                (database helpers)
│   └── constants/
│       └── targets.ts           (macro targets by day type)
├── package.json
└── README.md
```

## Seed Data (First Cycle)

Pre-populate the database with the first cycle data:

```javascript
const seedData = [
  {
    date: '2026-04-08',
    day_type: 'rest',
    carb_type: 'low',
    calories_target: 1600, calories_actual: 1924,
    protein_target: 140, protein_actual: 156,
    carbs_target: 90, carbs_actual: 101,
    fat_target: 110, fat_actual: 99.5,
    morning_hr: 58,
    energy_score: 2, satiety_score: 5,
    daily_total_cal_burned: 2162,
  },
  {
    date: '2026-04-09',
    day_type: 'push',
    carb_type: 'low',
    calories_target: 1910, calories_actual: 1916,
    protein_target: 140, protein_actual: 150,
    carbs_target: 90, carbs_actual: 95,
    fat_target: 110, fat_actual: 104,
    morning_hr: 67,
    energy_score: 3, satiety_score: 5,
    workout_duration_min: 76, workout_active_cal: 452,
    workout_total_cal: 574, workout_avg_hr: 117,
    workout_max_hr: 146,
  },
  {
    date: '2026-04-10',
    day_type: 'pull',
    carb_type: 'low',
    calories_target: 1910, calories_actual: 1911,
    protein_target: 140, protein_actual: 139.4,
    carbs_target: 90, carbs_actual: 90,
    fat_target: 110, fat_actual: 110,
    weight_lbs: 153.3,
    morning_hr: 66,
    energy_score: 4, satiety_score: 3,
    workout_duration_min: 84, workout_active_cal: 619,
    workout_total_cal: 753, workout_avg_hr: 122,
    workout_max_hr: 162,
  },
  {
    date: '2026-04-11',
    day_type: 'legs',
    carb_type: 'high',
    calories_target: 2200, calories_actual: 2230,
    protein_target: 164, protein_actual: 164,
    carbs_target: 258, carbs_actual: 258,
    fat_target: 60, fat_actual: 60.2,
    weight_lbs: 152.4,
    morning_hr: 58,
    workout_duration_min: 75, workout_active_cal: 375,
    workout_total_cal: 494, workout_avg_hr: 110,
    workout_max_hr: 146,
  },
];
```

## Key User Workflow (Nightly)

1. User opens app on phone at night
2. Goes to `/log` page
3. Selects day type (auto-fills targets)
4. Enters: weight, morning HR, actual macros, subjective scores, Apple Watch data
5. Hits submit
6. App computes glycogen estimates, saves everything
7. Dashboard updates with new data point on charts
8. User sees recommendations if any thresholds are crossed
9. User checks `/predict` for tomorrow's expected state

## Priority Order for Building

1. Database schema + seed data
2. Daily input form (`/log`)
3. Dashboard with glycogen chart + weight chart (`/`)
4. Glycogen estimation model
5. Prediction page (`/predict`) with tank gauges
6. Recommendation engine
7. Analysis page with cycle comparisons
8. Polish: animations, mobile layout, dark mode
