import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const exercises = await prisma.exercise.findMany({
      include: {
        workoutExercises: {
          orderBy: { dailyLog: { date: 'desc' } },
          include: {
            dailyLog: { select: { date: true, dayType: true } },
            sets: { orderBy: { setNumber: 'asc' } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Get all daily logs to check for supercompensation (post-legs-day sessions)
    const legsDays = await prisma.dailyLog.findMany({
      where: { dayType: 'legs' },
      select: { date: true },
      orderBy: { date: 'asc' },
    });
    const legsDates = new Set(legsDays.map(l => l.date));

    const result = exercises
      .filter(ex => ex.workoutExercises.length > 0)
      .map(ex => {
        const sessions = ex.workoutExercises.map(we => {
          const workingSets = we.sets.filter(s => !s.isWarmup);
          let topWeight = 0;
          let topReps = 0;
          let isPerSide = false;
          let volume = 0;
          let best1RM = 0;

          for (const s of workingSets) {
            const w = s.weightLbs ?? 0;
            const r = s.reps ?? 0;
            volume += w * r;
            const e1rm = w * (1 + r / 30);
            if (e1rm > best1RM) {
              best1RM = e1rm;
              topWeight = w;
              topReps = r;
              isPerSide = s.isPerSide;
            }
          }

          return {
            date: we.dailyLog.date,
            dayType: we.dailyLog.dayType,
            topWeight,
            topReps,
            isPerSide,
            volume: Math.round(volume),
            est1RM: Math.round(best1RM),
            setCount: workingSets.length,
          };
        });

        const lastSession = sessions[0] ?? null;
        const previousSession = sessions[1] ?? null;

        let trend: 'progressing' | 'maintaining' | 'regressing' | 'insufficient_data' = 'insufficient_data';
        let delta = null;
        let supercompensation = false;

        if (lastSession && previousSession) {
          const weightDiff = lastSession.topWeight - previousSession.topWeight;
          const repsDiff = lastSession.topReps - previousSession.topReps;
          const volumeDiff = lastSession.volume - previousSession.volume;
          const e1rmDiff = lastSession.est1RM - previousSession.est1RM;

          delta = {
            weight: weightDiff,
            reps: repsDiff,
            volume: volumeDiff,
            est1RM: e1rmDiff,
          };

          if (e1rmDiff > 2) trend = 'progressing';
          else if (e1rmDiff < -2) trend = 'regressing';
          else trend = 'maintaining';

          // Supercompensation: was last session done the day after a legs (refeed) day?
          const lastDate = new Date(lastSession.date + 'T00:00:00');
          const dayBefore = new Date(lastDate);
          dayBefore.setDate(dayBefore.getDate() - 1);
          const dayBeforeStr = dayBefore.toISOString().split('T')[0];

          if (legsDates.has(dayBeforeStr) && e1rmDiff > 0) {
            supercompensation = true;
          }
        }

        return {
          exerciseId: ex.id,
          exerciseName: ex.name,
          category: ex.category,
          sessionCount: sessions.length,
          lastSession,
          previousSession,
          delta,
          trend,
          supercompensation,
        };
      });

    return Response.json(result);
  } catch (error) {
    console.error('GET /api/exercises/overload error:', error);
    return Response.json({ error: 'Failed to fetch overload data' }, { status: 500 });
  }
}
