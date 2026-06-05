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
 * Точка подключения CRM (заглушка на будущее).
 * Когда появится CRM-эндпоинт — реализуем POST сюда.
 */
async function sendToCrm(_text: string, _order: OrderPayload): Promise<void> {
  const endpoint = import.meta.env.VITE_CRM_ENDPOINT as string | undefined;
  if (!endpoint) return; // CRM ещё не подключена
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(_order),
    });
  } catch (e) {
    console.warn('[CRM] Не удалось отправить заявку в CRM:', e);
  }
}

/** Главная функция отправки заявки из формы. */
export async function submitOrder(order: OrderPayload): Promise<SubmitResult> {
  const text = buildOrderText(order);

  // Параллельно: Telegram (основной) + CRM (если настроена).
  const [tg] = await Promise.all([sendToTelegram(text), sendToCrm(text, order)]);

  return tg;
}
