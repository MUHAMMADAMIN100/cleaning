import { CURRENCY } from '../config/pricing';

/** Форматирует число как цену: 12500 -> «12 500 сомони» */
export function formatPrice(value: number): string {
  return `${value.toLocaleString('ru-RU')} ${CURRENCY}`;
}

/** Форматирует число с разделителями разрядов без валюты */
export function formatNumber(value: number): string {
  return value.toLocaleString('ru-RU');
}
