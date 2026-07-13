import { randomBytes } from 'crypto';
import { Logger } from '@nestjs/common';

/**
 * Секрет для подписи/проверки JWT — единый источник правды.
 * Берётся из переменной окружения JWT_SECRET. Если она не задана —
 * генерируется СЛУЧАЙНЫЙ секрет на время жизни процесса (безопасно, но
 * сессии сбрасываются при перезапуске — задайте JWT_SECRET в проде).
 * Предсказуемого фолбэка ('dev_secret') больше нет.
 */
export const JWT_SECRET: string = (() => {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  const generated = randomBytes(48).toString('hex');
  new Logger('JwtSecret').warn(
    'JWT_SECRET не задан (или слишком короткий) — сгенерирован временный секрет. ' +
      'Сессии будут сбрасываться при перезапуске. Задайте JWT_SECRET в окружении.',
  );
  return generated;
})();
