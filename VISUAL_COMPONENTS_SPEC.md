# Custom Visual Components — Reference Implementations

Use these as reference when building the dashboard components. 
These were prototyped in conversation and should be recreated as React components.

---

## 1. Tank Gauge Component (`TankGauge.tsx`)

Two vertical tank visualizations showing liver and muscle glycogen fill levels.
- Tank is a bordered rectangle with a colored fill that rises from bottom
- Fill color changes: green (>60%), amber (40-60%), red (<40%)
- Percentage label at the top
- Label below: "Liver ~100g max" / "Muscle ~400g max"
- Fill height animates on data change (CSS transition 0.6s ease)
- Tank dimensions: 100px wide × 200px tall

### Color rules:
- Above 60%: #1D9E75 (teal green)
- 40-60%: #EF9F27 (amber)  
- Below 40%: #E24B4A (red)

---

## 2. Fat Burning Rate Meter

Horizontal progress bar showing estimated fat oxidation rate.
- Track: subtle background, 20px height, rounded
- Fill: color matches intensity (gray=low, amber=moderate, green=high)
- Label above: "Fat oxidation rate" + "Low/Moderate/High"

---

## 3. Glycogen Timeline Chart (main dashboard chart)

Multi-line Chart.js chart with:
- X-axis: dates with day type labels (e.g., "Apr 8\nRest\n101g C")
- Y-axis left (0-100%): Liver glycogen (teal line, filled), Muscle glycogen (blue line, filled), Fat burning rate (amber dashed line, filled)
- Y-axis right (80-170 bpm): Workout avg HR (red triangles, sparse data points)
- Interactive tooltips showing all values
- Background should subtly indicate day type (optional)

### Dataset config:
```javascript
{
  liver: { borderColor: '#1D9E75', backgroundColor: 'rgba(29,158,117,0.1)', fill: true, tension: 0.3 },
  muscle: { borderColor: '#378ADD', backgroundColor: 'rgba(55,138,221,0.1)', fill: true, tension: 0.3 },
  fatBurn: { borderColor: '#EF9F27', borderDash: [5,3], fill: true, tension: 0.3 },
  workoutHR: { borderColor: '#E24B4A', pointStyle: 'triangle', pointRadius: 6, yAxisID: 'y2' }
}
```

---

## 4. Interactive Glycogen Simulator (`/predict` page)

Three sliders + live computed outputs:
- Slider 1: Liver glycogen (0-100g)
- Slider 2: Muscle glycogen (0-400g)  
- Slider 3: Activity level (Rest / Moderate / Heavy training)

### Computed outputs (update in real-time):
- Fat burning % (of total energy)
- Carb burning % (of total energy)
- Ketone production (None / active with %)
- Fat oxidation rate meter (Low/Moderate/High)
- Gluconeogenesis meter (Minimal/Mild/Active)
- Muscle breakdown risk meter (Low/Some risk/High)
- State description box explaining what's happening metabolically

### Computation logic:
```javascript
function computeState(liver, muscle, activity) {
  let baseFat = 30;
  if (liver < 50) baseFat += ((50 - liver) / 50) * 20;
  if (liver < 30) baseFat += ((30 - liver) / 30) * 15;
  if (muscle < 250) baseFat += ((250 - muscle) / 250) * 15;
  if (muscle < 150) baseFat += ((150 - muscle) / 150) * 10;
  if (activity === 'moderate') baseFat += 5;
  if (activity === 'heavy' && muscle < 200) baseFat += 10;
  
  let fatPct = Math.min(Math.round(baseFat), 90);
  let ketoPct = liver < 25 ? Math.min(Math.round((25 - liver) / 25 * 30), 30) : 0;
  let carbPct = Math.max(100 - fatPct - ketoPct, 5);
  
  let gng = liver < 40 ? ((40 - liver) / 40) * 60 : 0;
  
  let risk = 0;
  if (liver < 20 && muscle < 100) risk = 70;
  else if (liver < 30 && muscle < 150) risk = 40;
  else if (liver < 40) risk = 15;
  if (activity === 'heavy') risk += 15;
  
  return { fatPct, carbPct, ketoPct, gng: Math.round(gng), risk: Math.min(Math.round(risk), 100) };
}
```

---

## 5. Symptom Reference Guide Component

Two sections: Liver glycogen levels + Muscle glycogen levels.
Each section has 4 tiers with color-coded left border bar:

### Liver tiers:
| Range | Color | Tag | Signals |
|-------|-------|-----|---------|
| 70-100g (Full) | #1D9E75 | After high carb day | Wake clear-headed, fasted glucose 80-95, stable mood, normal appetite |
| 30-70g (Moderate) | #EF9F27 | Push/pull days | Slightly groggy AM, glucose 70-82, mild irritability, carb cravings |
| 15-30g (Low) | #D85A30 | End of rest day | Brain fog, glucose 60-72, irritable/anxious, light-headed standing |
| 0-15g (Depleted) | #E24B4A | Plan avoids this | Shaky hands, glucose <60, emotional, cold hands/feet/headache |

### Muscle tiers:
| Range | Color | Tag | Signals |
|-------|-------|-----|---------|
| 300-400g (Full) | #1D9E75 | Post refeed | Muscles round/full/veiny, hit all weights, easy pump in 2 sets |
| 150-300g (Moderate) | #EF9F27 | Mid-week | Muscles flatter, last 1-2 reps harder, pump takes 3-4 sets |
| 100-150g (Low) | #D85A30 | After 3 low days | Muscles flat/stringy, drop 10-15% on weights, hard to get pump |
| 0-100g (Depleted) | #E24B4A | Danger zone | Visibly smaller, can't complete sets, no pump possible |

### Home measurement tips (bottom card):
1. Fasted glucose with $20 glucometer → liver glycogen proxy
2. AM body weight → 1-2 lb overnight drop = glycogen + water leaving
3. Grip strength with $15 dynamometer → drops 5-10% when glycogen low
4. Resting HR → rises 3-5 bpm when glycogen low
5. Mirror check → compare muscle fullness high vs low day

---

## 6. Daily Analysis Card (per-day view)

Card layout with:
- Header: Day name + date + carb type tag (Low=amber, High=green)
- Stats row: C/P/F actuals with delta vs target (red if over)
- Two mini tank bars (liver + muscle with % and description)
- Signals section: colored dots (green/amber/red) with observations
  - Energy score interpretation
  - Morning HR analysis  
  - Satiety observation
  - Workout performance note

---

## 7. Metric Cards (top of dashboard)

Row of 3-4 cards:
- Background: surface color, no border, rounded corners
- Small label (12px, muted) on top
- Large number (22px, bold) below
- Small delta text (11px, colored green/amber) at bottom

Examples:
- "Weight change" → "-0.9 lb" → "153.3 → 152.4"
- "Avg deficit" → "~480 cal" → "On track for 0.8 lb/wk"
- "Cycle status" → "Day 5" → "Need 2-3 more cycles"
