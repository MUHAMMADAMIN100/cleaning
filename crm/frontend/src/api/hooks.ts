import { useCallback, useEffect, useState } from 'react';
import { api } from './client';

interface Options {
  /** Зависимости — при изменении перезагружает */
  deps?: any[];
  /** Интервал фонового авто-обновления, мс (живые данные без F5) */
  pollMs?: number;
}

/**
 * Загрузка данных с GET-эндпоинта с фоновым авто-обновлением.
 * - первый запрос показывает спиннер (loading);
 * - поллинг и refetch-при-фокусе обновляют данные «тихо» (без спиннера);
 * - reload() — тихая перезагрузка для согласования после мутаций.
 */
export function useFetch<T>(url: string | null, opts: Options = {}) {
  const { deps = [], pollMs } = opts;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent: boolean) => {
      if (!url) {
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      try {
        const res = await api.get<T>(url);
        setData(res.data);
        setError(null);
      } catch (e: any) {
        if (!silent) setError(e?.response?.data?.message || 'Ошибка загрузки');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url, ...deps],
  );

  // первичная загрузка (со спиннером)
  useEffect(() => {
    load(false);
  }, [load]);

  // фоновый поллинг (тихо)
  useEffect(() => {
    if (!pollMs || !url) return;
    const id = setInterval(() => load(true), pollMs);
    return () => clearInterval(id);
  }, [pollMs, url, load]);

  // обновление при возврате на вкладку (тихо)
  useEffect(() => {
    if (!url) return;
    const onFocus = () => load(true);
    const onVis = () => {
      if (!document.hidden) load(true);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [url, load]);

  /** Тихая перезагрузка (для согласования после оптимистичной мутации) */
  const reload = useCallback(() => load(true), [load]);

  return { data, loading, error, reload, setData };
}
