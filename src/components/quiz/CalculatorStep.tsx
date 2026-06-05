import { FieldLabel, OptionCard } from './fields';
import {
  IconWindow,
  IconFridge,
  IconOven,
  IconIron,
  IconCheck,
} from '../ui/icons';
import {
  CLEANING_TYPES,
  EXTRA_SERVICES,
  CURRENCY,
} from '../../config/pricing';
import { formatPrice } from '../../lib/format';
import type { CalculatorState } from '../../types';

const EXTRA_ICONS: Record<string, typeof IconWindow> = {
  windows: IconWindow,
  fridge: IconFridge,
  oven: IconOven,
  ironing: IconIron,
};

interface Props {
  state: CalculatorState;
  onChange: (next: CalculatorState) => void;
}

export function CalculatorStep({ state, onChange }: Props) {
  const setArea = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, '');
    const area = digits === '' ? 0 : Math.min(Number(digits), 100000);
    onChange({ ...state, area });
  };

  const setType = (id: CalculatorState['cleaningTypeId']) =>
    onChange({ ...state, cleaningTypeId: id });

  const toggleExtra = (id: string, on: boolean) =>
    onChange({ ...state, extras: { ...state.extras, [id]: on ? 1 : 0 } });

  const setQty = (id: string, qty: number) =>
    onChange({
      ...state,
      extras: { ...state.extras, [id]: Math.max(0, Math.min(qty, 99)) },
    });

  return (
    <div className="space-y-8">
      {/* Площадь */}
      <div>
        <FieldLabel required>Площадь помещения, м²</FieldLabel>
        <div className="relative">
          <input
            inputMode="numeric"
            value={state.area || ''}
            onChange={(e) => setArea(e.target.value)}
            placeholder="Например, 60"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 pr-16 text-2xl font-bold text-white placeholder:text-base placeholder:font-normal placeholder:text-white/30 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
            м²
          </span>
        </div>
        {/* Быстрые пресеты */}
        <div className="mt-3 flex flex-wrap gap-2">
          {[40, 60, 80, 100, 120].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ ...state, area: v })}
              className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                state.area === v
                  ? 'bg-accent text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {v} м²
            </button>
          ))}
        </div>
      </div>

      {/* Тип уборки */}
      <div>
        <FieldLabel required>Тип уборки</FieldLabel>
        <div className="grid gap-3 sm:grid-cols-3">
          {CLEANING_TYPES.map((t) => (
            <OptionCard
              key={t.id}
              active={state.cleaningTypeId === t.id}
              onClick={() => setType(t.id)}
              title={t.title}
              subtitle={`${t.pricePerSqm} ${CURRENCY} / м²`}
            />
          ))}
        </div>
      </div>

      {/* Доп. услуги */}
      <div>
        <FieldLabel>Дополнительные услуги</FieldLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          {EXTRA_SERVICES.map((s) => {
            const qty = state.extras[s.id] ?? 0;
            const active = qty > 0;
            const Icon = EXTRA_ICONS[s.id];
            return (
              <div
                key={s.id}
                className={`rounded-2xl border p-4 transition-all duration-200 ${
                  active
                    ? 'border-accent/60 bg-accent/10'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleExtra(s.id, !active)}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all ${
                      active
                        ? 'border-accent bg-accent text-white'
                        : 'border-white/30 text-transparent'
                    }`}
                    aria-pressed={active}
                  >
                    <IconCheck className="h-4 w-4" />
                  </button>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-accent-light">
                    {Icon && <Icon className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold leading-tight">
                      {s.title}
                    </div>
                    <div className="text-xs text-white/50">
                      +{s.price} {CURRENCY}
                      {s.hasQuantity ? ` / ${s.unit}` : ''}
                    </div>
                  </div>

                  {/* Счётчик количества для услуг с qty */}
                  {s.hasQuantity && active && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQty(s.id, qty - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-lg leading-none hover:bg-white/20"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm font-semibold">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(s.id, qty + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-lg leading-none hover:bg-white/20"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
                {s.hasQuantity && active && s.hint && (
                  <p className="mt-2 pl-9 text-xs text-white/40">{s.hint}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center text-xs text-white/40">
        * Итоговая сумма предварительная. Точную стоимость подтвердит менеджер
        после оформления заявки. Минимальный заказ — {formatPrice(150)}.
      </p>
    </div>
  );
}
