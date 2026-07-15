/**
 * Общий ключ и защита от циклической перезагрузки страницы при сбое
 * подгрузки чанков (code-splitting). Используется и в lazyWithRetry,
 * и в ErrorBoundary — ключ должен быть ОДИН на оба механизма.
 */
const RELOAD_KEY = 'chunk-reloaded-at';

/** Перезагрузить страницу для получения свежих чанков — не чаще раза в 10 сек. */
export function reloadForFreshChunks(): void {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last > 10_000) {
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
      window.location.reload();
    }
  } catch {
    window.location.reload();
  }
}

/** Сбросить защиту (после ручного «Обновить»). */
export function clearChunkReloadGuard(): void {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    /* ignore */
  }
}
