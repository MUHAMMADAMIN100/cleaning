import { CLEANING_TYPES } from '../config/pricing';
import { COMPANY } from '../config/company';
import { calculatePrice } from './calc';
import { formatPrice } from './format';
import type { OrderPayload } from '../types';

const UTILITIES_LABEL: Record<string, string> = {
  yes: 'Да',
  no: 'Нет',
};

const ACCESS_LABEL: Record<string, string> = {
  keys: 'Передать ключи',
  onsite: 'Буду на месте',
};

/**
 * Собирает все данные заявки в единый структурированный текст.
 * Используется для отправки в Telegram (и в будущем — в CRM).
 */
export function buildOrderText(order: OrderPayload): string {
  const { calculator, quiz, contact } = order;
  const breakdown = calculatePrice(calculator);
  const type = CLEANING_TYPES.find((t) => t.id === calculator.cleaningTypeId);

  const lines: string[] = [];
  lines.push('🧽 НОВАЯ ЗАЯВКА — Архыдея клининг');
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━');
  lines.push('📐 РАСЧЁТ');
  lines.push(`• Площадь: ${calculator.area} м²`);
  lines.push(`• Тип уборки: ${type?.title ?? '—'} (${type?.pricePerSqm ?? 0} сомони/м²)`);
  lines.push(`• Базовая стоимость: ${formatPrice(breakdown.base)}`);
  if (breakdown.extras.length) {
    lines.push('• Доп. услуги:');
    for (const e of breakdown.extras) {
      lines.push(`   – ${e.title}: ${formatPrice(e.sum)}`);
    }
  } else {
    lines.push('• Доп. услуги: нет');
  }
  lines.push(`💰 ИТОГО: ${formatPrice(breakdown.total)}`);
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━');
  lines.push('📋 СПЕЦИФИКА ОБЪЕКТА');
  lines.push(`• Дата/время: ${quiz.date || '—'} ${quiz.time || ''}`.trim());
  lines.push(`• Вода/электричество: ${UTILITIES_LABEL[quiz.hasUtilities] ?? '—'}`);
  lines.push(`• Доступ: ${ACCESS_LABEL[quiz.access] ?? '—'}`);
  if (quiz.comment.trim()) {
    lines.push(`• Комментарий: ${quiz.comment.trim()}`);
  }
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━');
  lines.push('👤 КОНТАКТЫ');
  lines.push(`• Имя: ${contact.name}`);
  lines.push(`• Телефон: ${contact.phone}`);
  lines.push(`• Адрес: ${contact.address}`);
  lines.push('');
  lines.push(`🏙️ Город: ${COMPANY.city}`);

  return lines.join('\n');
}
