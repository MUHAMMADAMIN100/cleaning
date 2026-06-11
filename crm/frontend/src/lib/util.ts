let counter = 0;

/** Временный id для оптимистично созданных элементов (до ответа сервера) */
export function tempId(): string {
  counter += 1;
  return `temp_${counter}`;
}

/** Текущая дата в ISO (для оптимистичных элементов) */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Повтор запроса при разовом сбое (холодный старт / кратковременный 502).
 * Делает ещё одну попытку через delayMs, прежде чем пробросить ошибку.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 1,
  delayMs = 800,
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
      return withRetry(fn, retries - 1, delayMs);
    }
    throw e;
  }
}
