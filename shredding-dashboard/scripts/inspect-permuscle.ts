import { prisma } from '../src/lib/db';
import { simulateGlycogen } from '../src/lib/glycogen';
import { fetchGlycogenInputs } from '../src/lib/glycogen-data';

async function main() {
  const inputs = await fetchGlycogenInputs('2026-04-07', '2026-04-23');
  const outputs = simulateGlycogen(inputs);
  for (const o of outputs) {
    const input = inputs.find(i => i.date === o.date);
    const dayType = (input?.dayType ?? '').padEnd(5);
    const carbs = Math.round(input?.carbsActual ?? input?.carbsTarget ?? 0);
    const pm = o.perMuscle;
    console.log(
      `${o.date} ${dayType} C=${String(carbs).padStart(3)}g ` +
      `WB=${String(o.muscleGlycogenPct).padStart(3)}% ` +
      `legs=${String(pm.legs).padStart(3)} back=${String(pm.back).padStart(3)} chest=${String(pm.chest).padStart(3)} sho=${String(pm.shoulders).padStart(3)} arms=${String(pm.arms).padStart(3)} core=${String(pm.core).padStart(3)} ` +
      `liver=${String(o.liverGlycogenPct).padStart(3)}% fat=${String(o.fatBurningPct).padStart(3)}% ` +
      `${o.workoutDataMissing ? '[miss]' : ''}`
    );
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
