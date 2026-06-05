import {
  CLEANING_TYPES,
  EXTRA_SERVICES,
  MIN_ORDER_PRICE,
} from '../config/pricing';
import type { CalculatorState, PriceBreakdown } from '../types';

/**
 * Главная функция расчёта стоимости.
 * Итог = площадь × ставка_типа + сумма доп.услуг (с учётом количества).
 * Применяется минимальная стоимость заказа.
 */
export function calculatePrice(state: CalculatorState): PriceBreakdown {
  const type = CLEANING_TYPES.find((t) => t.id === state.cleaningTypeId);
  const ratePerSqm = type?.pricePerSqm ?? 0;
  const area = Number.isFinite(state.area) ? Math.max(0, state.area) : 0;

  const base = Math.round(area * ratePerSqm);

  const extras: PriceBreakdown['extras'] = [];
  for (const service of EXTRA_SERVICES) {
    const qty = state.extras[service.id] ?? 0;
    if (qty > 0) {
      const sum = service.price * qty;
      extras.push({
        title: service.hasQuantity
          ? `${service.title} (${qty} ${service.unit})`
          : service.title,
        qty,
        sum,
      });
    }
  }

  const extrasSum = extras.reduce((acc, e) => acc + e.sum, 0);
  const rawTotal = base + extrasSum;
  const total = rawTotal > 0 ? Math.max(rawTotal, MIN_ORDER_PRICE) : 0;

  return { base, extras, total };
}
