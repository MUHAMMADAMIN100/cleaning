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
            className="w-full rounded-2xl border border-navy-200 bg-white px-4 py-4 pr-16 text-2xl font-bold text-navy-900 placeholder:text-base placeholder:font-normal placeholder:text-navy-300 focus:border-navy-600 focus:outline-none focus:ring-2 focus:ring-navy-200"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-navy-400">
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
                  ? 'bg-navy-800 text-white'
                  : 'bg-navy-100 text-navy-600 hover:bg-navy-200'
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
                    ? 'border-navy-700 bg-navy-50 ring-1 ring-navy-200'
                    : 'border-navy-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleExtra(s.id, !active)}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all ${
                      active
                        ? 'border-navy-800 bg-navy-800 text-white'
                        : 'border-navy-300 text-transparent'
                    }`}
                    aria-pressed={active}
                  >
                    <IconCheck className="h-4 w-4" />
                  </button>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-100 text-navy-600">
                    {Icon && <Icon className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold leading-tight text-navy-900">
                      {s.title}
                    </div>
                    <div className="text-xs text-navy-500">
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
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy-100 text-lg leading-none text-navy-700 hover:bg-navy-200"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm font-semibold text-navy-900">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(s.id, qty + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy-100 text-lg leading-none text-navy-700 hover:bg-navy-200"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
                {s.hasQuantity && active && s.hint && (
                  <p className="mt-2 pl-9 text-xs text-navy-400">{s.hint}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center text-xs text-navy-400">
        * Итоговая сумма предварительная. Точную стоимость подтвердит менеджер
        после оформления заявки. Минимальный заказ — {formatPrice(150)}.
      </p>
    </div>
  );
}
