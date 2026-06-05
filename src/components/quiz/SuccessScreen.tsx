import { motion } from 'framer-motion';
import { IconCheck, IconPhone } from '../ui/icons';
import { formatPrice } from '../../lib/format';
import { COMPANY } from '../../config/company';

interface Props {
  total: number;
  name: string;
  phone: string;
}

export function SuccessScreen({ total, name, phone }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="glass-card mx-auto max-w-xl p-8 text-center sm:p-12"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent/20"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent shadow-glow">
          <IconCheck className="h-8 w-8 text-white" />
        </span>
      </motion.div>

      <h3 className="mt-6 text-2xl font-extrabold sm:text-3xl">
        Заявка отправлена!
      </h3>
      <p className="mt-3 text-white/60">
        Спасибо{name ? `, ${name}` : ''}! Мы получили вашу заявку на сумму{' '}
        <span className="font-semibold text-accent-light">
          {formatPrice(total)}
        </span>
        . Менеджер свяжется с вами в ближайшее время для подтверждения.
      </p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/70">
        Мы позвоним на номер{' '}
        <span className="font-semibold text-white">{phone}</span>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <a href={COMPANY.whatsapp} target="_blank" className="btn-primary">
          Написать в WhatsApp
        </a>
        <a href={COMPANY.phoneHref} className="btn-ghost">
          <IconPhone className="h-4 w-4" />
          {COMPANY.phone}
        </a>
      </div>

      <p className="mt-6 text-xs text-white/40">{COMPANY.workingHours}</p>
    </motion.div>
  );
}
