'use client';

export default function CortisolExplainer() {
  return (
    <details className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 group">
      <summary className="cursor-pointer select-none text-sm font-semibold uppercase tracking-wider text-[var(--foreground)]">
        Why this matters
      </summary>
      <div className="mt-4 flex flex-col gap-3 text-[14px] text-[var(--muted)] leading-relaxed">
        <p>
          Cortisol is the body&apos;s master stress hormone. Released by the adrenal glands in a daily rhythm
          (peaks ~30 min after waking, falls through the evening), it mobilizes glucose, raises blood pressure,
          and suppresses processes your body considers non-urgent — muscle repair, immune function, digestion.
          In short bursts it&apos;s adaptive. Chronically elevated, it drives muscle loss, visceral fat gain,
          and overnight water retention.{' '}
          <a className="text-[var(--teal)] hover:underline" href="https://www.ncbi.nlm.nih.gov/books/NBK538239/" target="_blank" rel="noreferrer">StatPearls Physiology: Cortisol</a>.
        </p>
        <p>
          <strong className="text-[var(--foreground)]">Sleep loss spikes cortisol.</strong>{' '}
          Restricting sleep to 4h for one week raised evening cortisol ~37%
          (<a className="text-[var(--teal)] hover:underline" href="https://pubmed.ncbi.nlm.nih.gov/9415946/" target="_blank" rel="noreferrer">Spiegel 1997</a>).
        </p>
        <p>
          <strong className="text-[var(--foreground)]">HRV is a cortisol barometer.</strong>{' '}
          When the autonomic balance shifts toward sympathetic dominance, RMSSD drops and cortisol rises
          (<a className="text-[var(--teal)] hover:underline" href="https://pmc.ncbi.nlm.nih.gov/articles/PMC8488831/" target="_blank" rel="noreferrer">Flatt et al.</a>).
          The 7-day rolling mean filters out day-to-day noise from alcohol, travel, etc.
        </p>
        <p>
          <strong className="text-[var(--foreground)]">Resting HR + training load.</strong>{' '}
          Elevated morning HR relative to your 7-day baseline is a classic overreach marker
          (<a className="text-[var(--teal)] hover:underline" href="https://pubmed.ncbi.nlm.nih.gov/23247672/" target="_blank" rel="noreferrer">Meeusen 2013 ECSS/ACSM consensus</a>).
        </p>
        <p>
          <strong className="text-[var(--foreground)]">Catabolism mechanism.</strong>{' '}
          Cortisol activates the ubiquitin–proteasome system in skeletal muscle, breaking protein down
          into amino acids for gluconeogenesis
          (<a className="text-[var(--teal)] hover:underline" href="https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2015.00012/full" target="_blank" rel="noreferrer">Frontiers in Physiology, 2015</a>).
          This is why low-sleep + deep-deficit days are the ones that stall recomp.
        </p>
        <p className="text-[12px] border-t border-[var(--border)] pt-3 mt-1">
          <strong className="text-[var(--foreground)]">About wakingBPM.</strong>{' '}
          AutoSleep&apos;s <code className="text-[var(--foreground)]">wakingBPM</code> is the HR measured in the final
          quiescent minute before you woke. It&apos;s not clinical resting HR taken supine at 06:00, but it&apos;s the
          closest proxy AutoSleep exposes — and its trend vs your 7-day mean is what matters, not the absolute number.
        </p>
      </div>
    </details>
  );
}
