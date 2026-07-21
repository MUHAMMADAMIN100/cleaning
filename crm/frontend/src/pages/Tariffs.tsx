import { useEffect, useRef, useState } from 'react';
import {
  Save,
  Check,
  Sparkles,
  Hammer,
  Armchair,
  LayoutGrid,
  Box,
  Flame,
  Shirt,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../api/client';
import { useFetch } from '../api/hooks';
import { Spinner, PageHeader } from '../components/ui';
import { useToast } from '../components/Toast';
import type { CleaningType, Tariff, Tariffs as TariffsData } from '../types';

const TYPE_META: Partial<Record<CleaningType, { icon: LucideIcon; desc: string }>> = {
  GENERAL: {
    icon: Sparkles,
    desc: 'Глубокая уборка всей площади до блеска, даже в труднодоступных местах',
  },
  POST_RENOVATION: {
    icon: Hammer,
    desc: 'Удаление строительной пыли и следов ремонта, подготовка к заселению',
  },
  FURNITURE: {
    icon: Armchair,
    desc: 'Чистка мягкой мебели от пятен и запахов — цена за посадочное место',
  },
};

const EXTRA_META: Record<string, { icon: LucideIcon }> = {
  windows: { icon: LayoutGrid },
  fridge: { icon: Box },
  oven: { icon: Flame },
  ironing: { icon: Shirt },
};

const LEVELS: { key: 'priceLight' | 'priceMedium' | 'priceHeavy'; label: string }[] = [
  { key: 'priceLight', label: 'Лёгкая' },
  { key: 'priceMedium', label: 'Средняя' },
  { key: 'priceHeavy', label: 'Тяжёлая' },
];

/** Только цифры, без ведущих нулей; пустая строка допустима */
const sanitize = (v: string) => v.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '');

type PriceMap = Record<string, { light: string; medium: string; heavy: string }>;

export function Tariffs() {
  const toast = useToast();
  const { data, loading, reload, setData } = useFetch<TariffsData>('/tariffs');
  // Цены храним строками — чтобы поле можно было очистить и не было «прилипшего» нуля
  const [prices, setPrices] = useState<PriceMap>({});
  const [extraPrices, setExtraPrices] = useState<Record<string, string>>({});

  // заполняем поля ОДИН раз при первой загрузке — фоновые обновления
  // (фокус окна и т.п.) не должны затирать вводимые цены
  const seeded = useRef(false);
  useEffect(() => {
    if (data && !seeded.current) {
      seeded.current = true;
      setPrices(
        Object.fromEntries(
          data.tariffs.map((t) => [
            t.key,
            {
              light: String(t.priceLight),
              medium: String(t.priceMedium),
              heavy: String(t.priceHeavy),
            },
          ]),
        ),
      );
      setExtraPrices(
        Object.fromEntries(data.extras.map((e) => [e.key, String(e.price)])),
      );
    }
  }, [data]);

  if (loading || !data) return <Spinner />;

  const saveTariff = (t: Tariff) => {
    const p = prices[t.key];
    if (!p) return;
    // у услуги без уровней (мебель) одна цена — во все три поля
    const light = Number(p.light || 0);
    const medium = t.hasLevels ? Number(p.medium || 0) : light;
    const heavy = t.hasLevels ? Number(p.heavy || 0) : light;
    // оптимистично: кнопка сразу показывает «Сохранено», запрос — в фоне
    setData((d) =>
      d
        ? {
            ...d,
            tariffs: d.tariffs.map((x) =>
              x.key === t.key
                ? { ...x, priceLight: light, priceMedium: medium, priceHeavy: heavy }
                : x,
            ),
          }
        : d,
    );
    // нормализуем строки в полях к сохранённым числам — иначе очищенное поле
    // (пустая строка ≠ "0") навсегда осталось бы в состоянии «Сохранить»
    setPrices((prev) => ({
      ...prev,
      [t.key]: { light: String(light), medium: String(medium), heavy: String(heavy) },
    }));
    toast.success('Цены обновлены');
    api
      .patch(`/tariffs/tariff/${t.key}`, {
        priceLight: light,
        priceMedium: medium,
        priceHeavy: heavy,
        pricePerSqm: medium, // совместимость со старым бэкендом на время деплоя
      })
      .catch(() => {
        toast.error('Не удалось сохранить цены');
        reload(); // вернуть серверные значения
      });
  };

  const saveExtra = (key: string) => {
    const price = Number(extraPrices[key] || 0);
    setData((d) =>
      d
        ? {
            ...d,
            extras: d.extras.map((x) => (x.key === key ? { ...x, price } : x)),
          }
        : d,
    );
    setExtraPrices((prev) => ({ ...prev, [key]: String(price) }));
    toast.success('Цена обновлена');
    api.patch(`/tariffs/extra/${key}`, { price }).catch(() => {
      toast.error('Не удалось сохранить цену');
      reload();
    });
  };

  return (
    <div>
      <PageHeader
        title="Управление тарифами"
        subtitle="Эти цены автоматически отражаются в калькуляторе на сайте"
      />

      {/* Услуги */}
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-400">
        Услуги — цена по степени загрязнения
      </h3>
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        {data.tariffs.map((t) => {
          const meta = TYPE_META[t.key];
          const p = prices[t.key] ?? { light: '', medium: '', heavy: '' };
          const dirty = t.hasLevels
            ? p.light !== String(t.priceLight) ||
              p.medium !== String(t.priceMedium) ||
              p.heavy !== String(t.priceHeavy)
            : p.light !== String(t.priceLight);
          return (
            <div key={t.key} className="card flex flex-col p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-100 text-navy-600">
                  {(() => {
                    const Icon = meta?.icon ?? Sparkles;
                    return <Icon className="h-5 w-5" />;
                  })()}
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold leading-tight text-navy-900">
                    {t.title}
                  </h4>
                  {meta?.desc && (
                    <p className="mt-0.5 text-xs text-navy-400">{meta.desc}</p>
                  )}
                </div>
              </div>

              {t.hasLevels ? (
                <div className="mt-4 space-y-2.5">
                  {LEVELS.map((lv, i) => {
                    const value = [p.light, p.medium, p.heavy][i];
                    return (
                      <div key={lv.key} className="flex items-center gap-3">
                        <span className="w-20 shrink-0 text-sm text-navy-500">
                          {lv.label}
                        </span>
                        <div className="relative flex-1">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={value}
                            onChange={(e) => {
                              const v = sanitize(e.target.value);
                              setPrices((prev) => ({
                                ...prev,
                                [t.key]: {
                                  ...(prev[t.key] ?? { light: '', medium: '', heavy: '' }),
                                  [i === 0 ? 'light' : i === 1 ? 'medium' : 'heavy']: v,
                                },
                              }));
                            }}
                            placeholder="0"
                            className="input pr-24 font-bold"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-navy-400">
                            сомони / {t.unit}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4">
                  <label className="mb-1.5 block text-xs font-medium text-navy-500">
                    Цена
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={p.light}
                      onChange={(e) => {
                        const v = sanitize(e.target.value);
                        setPrices((prev) => ({
                          ...prev,
                          [t.key]: { light: v, medium: v, heavy: v },
                        }));
                      }}
                      placeholder="0"
                      className="input pr-28 text-lg font-bold"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-navy-400">
                      сомони / {t.unit}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={() => saveTariff(t)}
                disabled={!dirty}
                className={`mt-4 w-full ${dirty ? 'btn-primary' : 'btn-ghost !text-navy-400'}`}
              >
                {dirty ? (
                  <>
                    <Save className="h-4 w-4" />
                    Сохранить
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Сохранено
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Доп. услуги */}
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-400">
        Дополнительные услуги — фиксированная цена
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.extras.map((e) => {
          const dirty = (extraPrices[e.key] ?? '') !== String(e.price);
          const Icon = EXTRA_META[e.key]?.icon ?? Box;
          return (
            <div key={e.key} className="card flex flex-col p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-100 text-navy-600">
                  <Icon className="h-5 w-5" />
                </span>
                <h4 className="min-w-0 flex-1 font-bold leading-tight text-navy-900">
                  {e.title}
                </h4>
              </div>

              <label className="mb-1.5 mt-4 block text-xs font-medium text-navy-500">
                Цена
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={extraPrices[e.key] ?? ''}
                  onChange={(ev) =>
                    setExtraPrices((prev) => ({
                      ...prev,
                      [e.key]: sanitize(ev.target.value),
                    }))
                  }
                  placeholder="0"
                  className="input pr-24 text-lg font-bold"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-navy-400">
                  {e.hasQty ? 'сомони / шт' : 'сомони'}
                </span>
              </div>

              <button
                onClick={() => saveExtra(e.key)}
                disabled={!dirty}
                className={`mt-3 w-full ${dirty ? 'btn-primary' : 'btn-ghost !text-navy-400'}`}
              >
                {dirty ? (
                  <>
                    <Save className="h-4 w-4" />
                    Сохранить
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Сохранено
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
