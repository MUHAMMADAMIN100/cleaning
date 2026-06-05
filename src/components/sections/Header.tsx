import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Logo } from '../ui/Logo';
import { IconPhone } from '../ui/icons';
import { COMPANY } from '../../config/company';
import { scrollToId } from '../../lib/scroll';

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-white/10 bg-navy-950/80 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="container-px flex h-16 items-center justify-between">
        <Logo />

        <nav className="hidden items-center gap-7 text-sm font-medium text-white/70 md:flex">
          <button onClick={() => scrollToId('about')} className="transition hover:text-white">
            О нас
          </button>
          <button onClick={() => scrollToId('tariffs')} className="transition hover:text-white">
            Услуги
          </button>
          <button onClick={() => scrollToId('calculator')} className="transition hover:text-white">
            Калькулятор
          </button>
          <button onClick={() => scrollToId('footer')} className="transition hover:text-white">
            Контакты
          </button>
        </nav>

        <a href={COMPANY.phoneHref} className="btn-ghost !px-4 !py-2 text-sm">
          <IconPhone className="h-4 w-4" />
          <span className="hidden sm:inline">{COMPANY.phone}</span>
          <span className="sm:hidden">Позвонить</span>
        </a>
      </div>
    </motion.header>
  );
}
