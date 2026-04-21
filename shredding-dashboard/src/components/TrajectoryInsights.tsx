'use client';

export default function TrajectoryInsights() {
  return (
    <div className="bg-[var(--surface)] rounded-lg">
      <details className="group">
        <summary className="w-full flex items-center justify-between px-5 py-3 text-left cursor-pointer list-none">
          <span className="text-sm font-semibold text-[var(--foreground)]">
            Why the trajectory curves (not a straight line)
          </span>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="text-[var(--muted)] transition-transform duration-200 group-open:rotate-180"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>

        <div className="px-5 pb-5 space-y-4">
          {/* 3-phase visual */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded border border-[var(--border)] p-3" style={{ borderTop: '3px solid #1D9E75' }}>
              <div className="text-[11px] font-bold text-[#1D9E75] mb-1">Phase 1 — Weeks 1-2</div>
              <div className="text-lg font-bold text-[var(--foreground)]">~1.2 lb/week</div>
              <div className="text-[10px] text-[var(--muted)] mt-1 leading-relaxed">
                Glycogen + water flush on top of fat loss. Scale moves fast but don't be fooled — some is water, not banked fat.
              </div>
            </div>
            <div className="rounded border-2 p-3" style={{ borderColor: '#378ADD', backgroundColor: 'rgba(55, 138, 221, 0.06)' }}>
              <div className="text-[11px] font-bold text-[#378ADD] mb-1">Phase 2 — Weeks 3-6</div>
              <div className="text-lg font-bold text-[var(--foreground)]">~0.8 lb/week</div>
              <div className="text-[10px] text-[var(--muted)] mt-1 leading-relaxed">
                Steady fat loss at planned deficit. Glycogen stabilized. This is the productive zone — your plan is working as designed.
              </div>
            </div>
            <div className="rounded border border-[var(--border)] p-3" style={{ borderTop: '3px solid #EF9F27' }}>
              <div className="text-[11px] font-bold text-[#EF9F27] mb-1">Phase 3 — Weeks 7-9</div>
              <div className="text-lg font-bold text-[var(--foreground)]">~0.6 lb/week</div>
              <div className="text-[10px] text-[var(--muted)] mt-1 leading-relaxed">
                Adaptive thermogenesis + lower BF% = less mobilizable fat. TDEE drops 80-150 cal/day beyond what weight loss predicts.
              </div>
            </div>
          </div>

          {/* Action items */}
          <div className="space-y-2">
            <div className="flex gap-2 items-start text-[11px]">
              <span className="text-[#E24B4A] font-bold shrink-0 mt-px">!</span>
              <span className="text-[var(--muted)]">
                <span className="text-[var(--foreground)] font-medium">Rest day calories are your biggest lever.</span> The Apr 8 overshoot (+324 cal) erased an entire day's deficit. Rest day is the deepest cut in the cycle — adherence here matters most.
              </span>
            </div>
            <div className="flex gap-2 items-start text-[11px]">
              <span className="text-[#EF9F27] font-bold shrink-0 mt-px">!</span>
              <span className="text-[var(--muted)]">
                <span className="text-[var(--foreground)] font-medium">Bump protein to 165-175g when you drop below ~12% BF</span> (around week 5-6). Current 153g is adequate but Helms 2014 recommends 2.3-3.1 g/kg FFM for the lean phase. Your FFM of 59.6kg needs 137-185g — you're at the low end.
              </span>
            </div>
            <div className="flex gap-2 items-start text-[11px]">
              <span className="text-[#378ADD] font-bold shrink-0 mt-px">!</span>
              <span className="text-[var(--muted)]">
                <span className="text-[var(--foreground)] font-medium">Adjust calories around week 6-7.</span> Metabolic adaptation will narrow your effective deficit by 80-150 cal/day. Cut rest day to ~1,450 cal or add 15-20 min steady-state cardio to compensate.
              </span>
            </div>
            <div className="flex gap-2 items-start text-[11px]">
              <span className="text-[#1D9E75] font-bold shrink-0 mt-px">!</span>
              <span className="text-[var(--muted)]">
                <span className="text-[var(--foreground)] font-medium">Don't trust early scale drops.</span> Weeks 1-2 will show 1.0-1.4 lb/week — that's water + glycogen, not extra fat. If you relax because "I'm ahead of schedule," the Phase 3 slowdown will catch you.
              </span>
            </div>
          </div>

          {/* Sources */}
          <div className="pt-2 border-t border-[var(--border)]">
            <p className="text-[10px] text-[#555] mb-1 font-medium">Research sources:</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px]">
              <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC4033492/" target="_blank" rel="noopener noreferrer" className="text-[var(--teal)] hover:underline">Helms et al. 2014</a>
              <a href="https://pubmed.ncbi.nlm.nih.gov/21558571/" target="_blank" rel="noopener noreferrer" className="text-[var(--teal)] hover:underline">Garthe et al. 2011</a>
              <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC3859816/" target="_blank" rel="noopener noreferrer" className="text-[var(--teal)] hover:underline">Hall & Chow 2013</a>
              <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC3943438/" target="_blank" rel="noopener noreferrer" className="text-[var(--teal)] hover:underline">Trexler et al. 2014</a>
              <a href="https://pubmed.ncbi.nlm.nih.gov/33762040/" target="_blank" rel="noopener noreferrer" className="text-[var(--teal)] hover:underline">Martins et al. 2021</a>
              <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC8471721/" target="_blank" rel="noopener noreferrer" className="text-[var(--teal)] hover:underline">Barakat et al. 2020</a>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
