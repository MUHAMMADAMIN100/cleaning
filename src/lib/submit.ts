import { buildOrderText } from './message';
import type { OrderPayload } from '../types';

/**
 * Отправка заявки.
 *
 * Основной канал — Telegram-бот компании (Bot API).
 * Токен и chat_id берутся из переменных окружения (.env):
 *   VITE_TELEGRAM_BOT_TOKEN
 *   VITE_TELEGRAM_CHAT_ID
 *
 * ⚠️ Примечание по безопасности: вызов Bot API напрямую с фронтенда
 * раскрывает токен в браузере. Для продакшена рекомендуется проксировать
 * запрос через серверную функцию (тот самый будущий CRM-бэкенд).
 * Здесь оставлен задел: функция sendToCrm() — точка подключения CRM.
 */

const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN as string | undefined;
const CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID as string | undefined;

export interface SubmitResult {
  ok: boolean;
  error?: string;
}

async function sendToTelegram(text: string): Promise<SubmitResult> {
  // Если токен не настроен — не падаем, а логируем (режим демо/разработки).
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn(
      '[Telegram] Токен не настроен. Заявка не отправлена в Telegram.\n' +
        'Добавьте VITE_TELEGRAM_BOT_TOKEN и VITE_TELEGRAM_CHAT_ID в .env\n\n' +
        text,
    );
    // Возвращаем ok:true, чтобы пользователь в демо-режиме видел успех.
    return { ok: true };
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text,
          disable_web_page_preview: true,
        }),
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data?.description || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Отправка заявки в CRM «Archidea Sistem» (NestJS-бэкенд).
 * Эндпоинт защищён API-ключом (заголовок x-api-key).
 *   VITE_CRM_API_URL    — базовый URL API, напр. https://crm-api.up.railway.app/api
 *   VITE_CRM_INTAKE_KEY — ключ приёма заявок (должен совпадать с LEADS_INTAKE_API_KEY на бэке)
 */
async function sendToCrm(order: OrderPayload, honeypot: string): Promise<void> {
  const apiUrl = import.meta.env.VITE_CRM_API_URL as string | undefined;
  const apiKey = import.meta.env.VITE_CRM_INTAKE_KEY as string | undefined;
  if (!apiUrl || !apiKey) return; // CRM ещё не подключена

  try {
    await fetch(`${apiUrl}/leads/intake`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ ...order, company: honeypot }),
    });
  } catch (e) {
    console.warn('[CRM] Не удалось отправить заявку в CRM:', e);
  }
}

/**
 * Главная функция отправки заявки из формы.
 * @param honeypot — скрытое антиспам-поле (должно быть пустым у людей)
 */
export async function submitOrder(
  order: OrderPayload,
  honeypot = '',
): Promise<SubmitResult> {
  const text = buildOrderText(order);

  // Параллельно: Telegram (основной) + CRM (если настроена).
  const [tg] = await Promise.all([
    sendToTelegram(text),
    sendToCrm(order, honeypot),
  ]);

  return tg;
}
