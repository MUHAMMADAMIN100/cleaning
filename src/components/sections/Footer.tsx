import { Logo } from '../ui/Logo';
import {
  IconPhone,
  IconMapPin,
  IconClock,
  IconTelegram,
  IconWhatsapp,
  IconInstagram,
} from '../ui/icons';
import { COMPANY } from '../../config/company';
import { scrollToId } from '../../lib/scroll';

const SOCIALS = [
  { href: COMPANY.telegram, icon: IconTelegram, label: 'Telegram' },
  { href: COMPANY.whatsapp, icon: IconWhatsapp, label: 'WhatsApp' },
  { href: COMPANY.instagram, icon: IconInstagram, label: 'Instagram' },
];

export function Footer() {
  return (
    <footer id="footer" className="border-t border-white/10 bg-navy-950">
      <div className="container-px py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr]">
          {/* Бренд */}
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-white/60">
              Профессиональный клининг в {COMPANY.city}. Чистота, которой можно
              доверять — для дома и офиса.
            </p>
            <div className="mt-5 flex gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  aria-label={s.label}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:text-accent-light"
                >
                  <s.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Навигация */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white/40">
              Разделы
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              {[
                ['О нас', 'about'],
                ['Услуги', 'tariffs'],
                ['Калькулятор', 'calculator'],
              ].map(([label, id]) => (
                <li key={id}>
                  <button
                    onClick={() => scrollToId(id)}
                    className="transition hover:text-accent-light"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Контакты */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white/40">
              Контакты
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              <li>
                <a
                  href={COMPANY.phoneHref}
                  className="flex items-center gap-2.5 transition hover:text-accent-light"
                >
                  <IconPhone className="h-4 w-4 text-accent-light" />
                  {COMPANY.phone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <IconMapPin className="h-4 w-4 text-accent-light" />
                {COMPANY.address}
              </li>
              <li className="flex items-center gap-2.5">
                <IconClock className="h-4 w-4 text-accent-light" />
                {COMPANY.workingHours}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {COMPANY.name}. Все права защищены.
          </p>
          <p>Политика конфиденциальности · Договор оферты</p>
        </div>
      </div>
    </footer>
  );
}
