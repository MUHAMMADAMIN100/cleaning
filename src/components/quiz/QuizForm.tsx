import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalculatorStep } from './CalculatorStep';
import { SpecificsStep } from './SpecificsStep';
import { ContactsStep } from './ContactsStep';
import { SuccessScreen } from './SuccessScreen';
import { Stepper } from './Stepper';
import { IconArrowLeft, IconArrowRight, IconCheck } from '../ui/icons';
import { calculatePrice } from '../../lib/calc';
import { formatPrice } from '../../lib/format';
import { submitOrder } from '../../lib/submit';
import { DEFAULTS } from '../../config/pricing';
import type {
  CalculatorState,
  ContactState,
  QuizState,
} from '../../types';

const STEP_TITLES = ['Параметры уборки', 'Детали заказа', 'Контакты'];

/** Сегодняшняя дата в формате YYYY-MM-DD (для min календаря) */
function todayISO(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export function QuizForm() {
  const [step, setStep] = useState(0); // 0,1,2
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [calc, setCalc] = useState<CalculatorState>({
    area: DEFAULTS.area,
    cleaningTypeId: DEFAULTS.cleaningTypeId,
    extras: {},
  });
  const [quiz, setQuiz] = useState<QuizState>({
    date: '',
    time: '',
    hasUtilities: '',
    access: '',
    comment: '',
  });
  const [contact, setContact] = useState<ContactState>({
    name: '',
    phone: '',
    address: '',
  });
  const [contactErrors, setContactErrors] = useState<
    Partial<Record<keyof ContactState, boolean>>
  >({});

  const breakdown = useMemo(() => calculatePrice(calc), [calc]);
  const minDate = useMemo(() => todayISO(), []);

  // --- Валидация по шагам ---
  const canNext = useMemo(() => {
    if (step === 0) return calc.area > 0 && breakdown.total > 0;
    if (step === 1)
      return (
        !!quiz.date && !!quiz.time && !!quiz.hasUtilities && !!quiz.access
      );
    return true;
  }, [step, calc.area, breakdown.total, quiz]);

  const validateContacts = () => {
    const errs: Partial<Record<keyof ContactState, boolean>> = {
      name: contact.name.trim().length < 2,
      phone: contact.phone.replace(/\D/g, '').length < 7,
      address: contact.address.trim().length < 4,
    };
    setContactErrors(errs);
    return !Object.values(errs).some(Boolean);
  };

  const goNext = () => {
    if (!canNext) return;
    setStep((s) => Math.min(s + 1, 2));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!validateContacts()) return;
    setSubmitting(true);
    setSubmitError('');
    const res = await submitOrder({
      calculator: calc,
      quiz,
      contact,
      total: breakdown.total,
    });
    setSubmitting(false);
    if (res.ok) {
      setDone(true);
    } else {
      setSubmitError(
        res.error || 'Не удалось отправить заявку. Попробуйте ещё раз.',
      );
    }
  };

  if (done) {
    return (
      <SuccessScreen
        total={breakdown.total}
        name={contact.name}
        phone={contact.phone}
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      {/* Левая часть — шаги формы (светлая карточка) */}
      <div className="card-light p-6 text-navy-900 sm:p-8">
        <Stepper current={step} titles={STEP_TITLES} />

        <div className="mt-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3 }}
            >
              {step === 0 && (
                <CalculatorStep state={calc} onChange={setCalc} />
              )}
              {step === 1 && (
                <SpecificsStep
                  state={quiz}
                  onChange={setQuiz}
                  minDate={minDate}
                />
              )}
              {step === 2 && (
                <ContactsStep
                  state={contact}
                  onChange={setContact}
                  errors={contactErrors}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {submitError && (
          <p className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600">
            {submitError}
          </p>
        )}

        {/* Навигация */}
        <div className="mt-8 flex items-center gap-3">
          {step > 0 && (
            <button type="button" onClick={goBack} className="btn-outline-dark">
              <IconArrowLeft className="h-4 w-4" />
              Назад
            </button>
          )}
          {step < 2 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canNext}
              className="btn-primary ml-auto"
            >
              {step === 0 ? 'Оформить заявку' : 'Далее'}
              <IconArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary ml-auto"
            >
              {submitting ? (
                'Отправляем…'
              ) : (
                <>
                  Отправить заявку
                  <IconCheck className="h-5 w-5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Правая часть — «Итого» (тёмная панель, sticky) */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="overflow-hidden rounded-3xl bg-navy-gradient text-white shadow-card">
          <div className="border-b border-white/10 bg-white/5 px-6 py-4">
            <h3 className="font-bold">Ваш расчёт</h3>
            <p className="text-xs text-white/50">Обновляется автоматически</p>
          </div>

          <div className="space-y-3 px-6 py-5 text-sm">
            <Row label={`Уборка · ${calc.area} м²`} value={formatPrice(breakdown.base)} />
            {breakdown.extras.map((e) => (
              <Row key={e.title} label={e.title} value={formatPrice(e.sum)} muted />
            ))}
            {breakdown.extras.length === 0 && (
              <p className="text-xs text-white/40">Доп. услуги не выбраны</p>
            )}
          </div>

          <div className="border-t border-white/10 px-6 py-5">
            <div className="flex items-end justify-between">
              <span className="text-white/60">Итого</span>
              <motion.span
                key={breakdown.total}
                initial={{ scale: 0.9, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="text-3xl font-extrabold text-navy-100"
              >
                {formatPrice(breakdown.total)}
              </motion.span>
            </div>
          </div>
        </div>

        <ul className="mt-4 space-y-2 px-2 text-xs text-navy-500">
          {['Без предоплаты', 'Оплата после уборки', 'Можно отменить заранее'].map(
            (t) => (
              <li key={t} className="flex items-center gap-2">
                <IconCheck className="h-3.5 w-3.5 text-navy-600" />
                {t}
              </li>
            ),
          )}
        </ul>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={muted ? 'text-white/50' : 'text-white/80'}>{label}</span>
      <span className="shrink-0 font-semibold text-white">{value}</span>
    </div>
  );
}
