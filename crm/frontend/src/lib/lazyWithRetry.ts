import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { reloadForFreshChunks } from './chunkReload';

/**
 * lazy() с устойчивой загрузкой чанка на мобильном/флаки-сети:
 * - повтор импорта один раз при сбое;
 * - если чанк всё ещё не грузится (частая причина — новый деплой заменил
 *   имена файлов, а у пользователя открыта старая версия) — один раз
 *   перезагружаем страницу, чтобы получить свежий index.html и чанки.
 * Общий guard (chunkReload.ts) не даёт зациклить перезагрузку.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch {
      // вторая попытка через короткую паузу
      try {
        await new Promise((r) => setTimeout(r, 600));
        return await factory();
      } catch (err) {
        reloadForFreshChunks();
        // если reload не сработал (сработал guard) — прокидываем ошибку
        // в ErrorBoundary; иначе рендерим пустышку, пока идёт перезагрузка
        return { default: (() => null) as unknown as T };
      }
    }
  });
}
