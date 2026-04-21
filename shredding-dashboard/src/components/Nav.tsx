'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/food', label: 'Food' },
  { href: '/workout', label: 'Workout' },
  { href: '/predict', label: 'Predict' },
  { href: '/analysis', label: 'Analysis' },
  { href: '/cortisol', label: 'Cortisol' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-0 sm:justify-between h-14">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[var(--teal)] font-bold text-lg tracking-tight">ShredSync</span>
          </Link>
          <div
            className="flex items-center gap-1 overflow-x-auto min-w-0 -mx-2 px-2 sm:mx-0 sm:px-0"
            style={{ scrollbarWidth: 'none' }}
          >
            {links.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[var(--teal)] text-white'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
