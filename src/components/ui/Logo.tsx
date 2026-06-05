import { IconSparkles } from './icons';
import { COMPANY } from '../../config/company';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <a href="#top" className="group flex items-center gap-2.5">
      <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-navy-600 shadow-glow">
        <IconSparkles className="h-5 w-5 text-white" />
        <span className="absolute inset-0 rounded-xl ring-1 ring-white/30" />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-base font-extrabold tracking-tight">
            Arhydeya
          </span>
          <span className="block text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
            cleaning
          </span>
        </span>
      )}
      <span className="sr-only">{COMPANY.name}</span>
    </a>
  );
}
