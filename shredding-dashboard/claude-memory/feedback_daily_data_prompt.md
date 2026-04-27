---
name: feedback_daily_data_prompt
description: On daily check-ins, proactively prompt user for data they commonly forget to log before running analysis
type: feedback
originSessionId: 0489599e-6d50-4105-8a8d-9d1f4b6e222c
---
When the user opens a daily analysis/check-in conversation (asking "how am I doing", "what should I do today", "analyze my weight/glycogen", etc.), **proactively ask for the data they commonly forget to log** before diving into analysis.

**Why:** User skips subjective logging because "I don't really know how I feel tbh" — but without those data points the analysis has gaps. He explicitly asked me to prompt him "in case I forget."

**How to apply:** At the start of each daily session, quickly check the current DB state for today's row and ask only for the fields that are NULL/missing. Prioritized prompt list:

1. **Morning weight** (weightLbs) — fasted, post-bathroom
2. **Morning HR / 晨脉** (morningHr) — resting pulse immediately on waking
3. **Sleep sync status** — has AutoSleep CSV been exported/imported for the previous night?
4. **Energy score 1–5** (energyScore) — subjective, all-day average
5. **Satiety / 饱腹感 1–5** (satietyScore) — subjective
6. **Pump score 1–5** (pumpScore) — only on training days

**Phrasing:** keep it a short batched prompt, not a long checklist. Example:

> "Before the analysis — quick data check. What's your morning weight today? Did you check 晨脉 (morning resting HR)? Energy and satiety scores 1–5? And have you exported AutoSleep for last night yet?"

**Skip if already provided** in the same conversation. **Don't block analysis** — if the user says "skip" or ignores the prompt, proceed with what's available and note which fields are missing.
