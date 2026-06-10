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
      className="card-light mx-auto max-w-xl p-8 text-center text-navy-900 sm:p-12"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-navy-100"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-500 shadow-glow">
          <IconCheck className="h-8 w-8 text-white" />
        </span>
      </motion.div>

      <h3 className="mt-6 text-2xl font-extrabold sm:text-3xl">
        Заявка отправлена!
      </h3>
      <p className="mt-3 text-navy-600">
        Спасибо{name ? `, ${name}` : ''}! Мы получили вашу заявку на сумму{' '}
        <span className="font-semibold text-navy-800">{formatPrice(total)}</span>
        . Менеджер свяжется с вами в ближайшее время для подтверждения.
      </p>

      <div className="mt-6 rounded-2xl border border-navy-100 bg-navy-50 px-5 py-4 text-sm text-navy-600">
        Мы позвоним на номер{' '}
        <span className="font-semibold text-navy-900">{phone}</span>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <a href={COMPANY.whatsapp} target="_blank" className="btn-primary">
          Написать в WhatsApp
        </a>
        <a href={COMPANY.phoneHref} className="btn-outline-dark">
          <IconPhone className="h-4 w-4" />
          {COMPANY.phone}
        </a>
      </div>

      <p className="mt-6 text-xs text-navy-400">{COMPANY.workingHours}</p>
    </motion.div>
  );
}
