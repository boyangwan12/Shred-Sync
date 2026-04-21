'use client';

interface Tier {
  range: string;
  tag: string;
  color: string;
  signals: string[];
}

const LIVER_TIERS: Tier[] = [
  {
    range: '70–100g',
    tag: 'Full',
    color: 'var(--teal)',
    signals: [
      'Clear-headed, sharp focus',
      'Blood glucose 80–95 mg/dL',
      'Stable mood throughout the day',
      'Normal appetite, no unusual cravings',
    ],
  },
  {
    range: '30–70g',
    tag: 'Moderate',
    color: 'var(--amber)',
    signals: [
      'Slightly groggy, especially morning',
      'Blood glucose 70–82 mg/dL',
      'Mild irritability under stress',
      'Increased carb cravings',
    ],
  },
  {
    range: '15–30g',
    tag: 'Low',
    color: 'var(--orange)',
    signals: [
      'Brain fog, difficulty concentrating',
      'Blood glucose 60–72 mg/dL',
      'Irritable, short-tempered',
      'Light-headed when standing',
    ],
  },
  {
    range: '0–15g',
    tag: 'Depleted',
    color: 'var(--red)',
    signals: [
      'Shaky hands, visible tremor',
      'Blood glucose <60 mg/dL',
      'Emotional, mood swings',
      'Cold extremities, poor circulation',
    ],
  },
];

const MUSCLE_TIERS: Tier[] = [
  {
    range: '300–400g',
    tag: 'Full',
    color: 'var(--teal)',
    signals: [
      'Muscles look round, full, and veiny',
      'Hit all working weights with ease',
      'Easy pump within 1–2 warm-up sets',
    ],
  },
  {
    range: '150–300g',
    tag: 'Moderate',
    color: 'var(--amber)',
    signals: [
      'Muscles appear flatter than usual',
      'Last reps feel significantly harder',
      'Pump takes 3–4 sets to develop',
    ],
  },
  {
    range: '100–150g',
    tag: 'Low',
    color: 'var(--orange)',
    signals: [
      'Muscles visibly flat',
      'Need to drop 10–15% off working weights',
      'Hard to achieve any pump',
    ],
  },
  {
    range: '0–100g',
    tag: 'Depleted',
    color: 'var(--red)',
    signals: [
      'Visibly smaller, loss of muscle fullness',
      "Can't complete normal working sets",
      'No pump regardless of effort',
    ],
  },
];

function TierCard({ tier }: { tier: Tier }) {
  return (
    <div
      className="flex gap-3 py-3"
      style={{ borderLeft: `3px solid ${tier.color}`, paddingLeft: 16 }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-semibold" style={{ color: tier.color }}>
            {tier.tag}
          </span>
          <span className="text-xs text-[var(--muted)]">{tier.range}</span>
        </div>
        <ul className="space-y-1">
          {tier.signals.map((signal, i) => (
            <li key={i} className="text-xs text-[var(--foreground)] opacity-80 flex items-start gap-1.5">
              <span className="mt-1.5 shrink-0 block w-1 h-1 rounded-full" style={{ backgroundColor: tier.color }} />
              {signal}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function SymptomGuide() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Liver section */}
      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <h3 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider mb-4">
          Liver Glycogen
        </h3>
        <p className="text-xs text-[var(--muted)] mb-4">
          Liver glycogen fuels your brain and maintains blood sugar. Depletion drives cognitive
          and mood symptoms.
        </p>
        <div className="space-y-1 divide-y divide-[var(--border)]">
          {LIVER_TIERS.map((tier) => (
            <TierCard key={tier.tag} tier={tier} />
          ))}
        </div>
      </div>

      {/* Muscle section */}
      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <h3 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider mb-4">
          Muscle Glycogen
        </h3>
        <p className="text-xs text-[var(--muted)] mb-4">
          Muscle glycogen fuels contractions during training. Depletion directly impacts
          strength and visual fullness.
        </p>
        <div className="space-y-1 divide-y divide-[var(--border)]">
          {MUSCLE_TIERS.map((tier) => (
            <TierCard key={tier.tag} tier={tier} />
          ))}
        </div>
      </div>
    </div>
  );
}
