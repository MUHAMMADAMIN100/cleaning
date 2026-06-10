import { COMPANY } from '../../config/company';

/**
 * Логотип «Archidea Cleaning».
 * variant='white' — белый логотип (для синих фонов),
 * variant='blue'  — синий логотип (для белых фонов).
 */
export function Logo({
  variant = 'blue',
  className = 'h-12',
}: {
  variant?: 'white' | 'blue';
  className?: string;
}) {
  const src = variant === 'white' ? '/logo-white.png' : '/logo-blue.png';
  return (
    <a
      href="#top"
      aria-label={COMPANY.name}
      className="inline-flex items-center transition-transform hover:scale-[1.03]"
    >
      <img src={src} alt={COMPANY.name} className={`${className} w-auto`} />
    </a>
  );
}
