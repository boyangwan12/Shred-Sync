import { prisma } from '../src/lib/db';
import { fetchGlycogenInputs } from '../src/lib/glycogen-data';

async function main() {
  const inputs = await fetchGlycogenInputs('2026-04-07', '2026-04-23');
  for (const i of inputs) {
    if (i.dayType === 'rest' || i.exercises.length === 0) continue;
    const groupVolume = new Map<string, number>();
    let sets = 0;
    for (const ex of i.exercises) {
      const g = ex.muscleGroup;
      groupVolume.set(g, (groupVolume.get(g) ?? 0) + ex.totalVolumeLbs);
      sets += ex.sets;
    }
    const parts = Array.from(groupVolume.entries()).map(([g, v]) => `${g}=${Math.round(v)}`).join(' ');
    console.log(`${i.date} ${i.dayType.padEnd(5)} ${String(sets).padStart(2)}sets  ${parts}  HR=${i.workoutAvgHr ?? 'null'}`);
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
