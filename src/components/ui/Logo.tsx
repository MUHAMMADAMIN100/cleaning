import { COMPANY } from '../../config/company';

/** Логотип «Archidea Cleaning» (изображение бренда). */
export function Logo({ className = 'h-11' }: { className?: string }) {
  return (
    <a
      href="#top"
      aria-label={COMPANY.name}
      className="inline-flex items-center transition-transform hover:scale-[1.03]"
    >
      <img
        src="/logo.png"
        alt={COMPANY.name}
        className={`${className} w-auto rounded-xl`}
      />
    </a>
  );
}
