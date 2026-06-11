import { useEffect, useState } from 'react';
import {
  Save,
  Check,
  Sparkles,
  Repeat,
  Hammer,
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
import type { CleaningType, Tariffs as TariffsData } from '../types';

const TYPE_META: Record<CleaningType, { icon: LucideIcon; desc: string }> = {
  MAINTENANCE: {
    icon: Repeat,
    desc: 'Регулярная уборка для поддержания чистоты',
  },
  GENERAL: { icon: Sparkles, desc: 'Глубокая уборка всей квартиры до блеска' },
  POST_RENOVATION: {
    icon: Hammer,
    desc: 'Удаление строительной пыли и следов ремонта',
  },
};

const EXTRA_META: Record<string, { icon: LucideIcon }> = {
  windows: { icon: LayoutGrid },
  fridge: { icon: Box },
  oven: { icon: Flame },
  ironing: { icon: Shirt },
};

export function Tariffs() {
  const toast = useToast();
  const { data, loading, reload } = useFetch<TariffsData>('/tariffs');
  // Цены храним строками — чтобы поле можно было очистить и не было «прилипшего» нуля
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [extraPrices, setExtraPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) {
      setPrices(
        Object.fromEntries(data.tariffs.map((t) => [t.key, String(t.pricePerSqm)])),
      );
      setExtraPrices(
        Object.fromEntries(data.extras.map((e) => [e.key, String(e.price)])),
      );
    }
  }, [data]);

  if (loading || !data) return <Spinner />;

  const saveTariff = async (key: string) => {
    try {
      await api.patch(`/tariffs/tariff/${key}`, {
        pricePerSqm: Number(prices[key] || 0),
      });
      toast.success('Цена обновлена');
      reload();
    } catch {
      toast.error('Не удалось сохранить цену');
      reload();
    }
  };
  const saveExtra = async (key: string) => {
    try {
      await api.patch(`/tariffs/extra/${key}`, {
        price: Number(extraPrices[key] || 0),
      });
      toast.success('Цена обновлена');
      reload();
    } catch {
      toast.error('Не удалось сохранить цену');
      reload();
    }
  };

  return (
    <div>
      <PageHeader
        title="Управление тарифами"
        subtitle="Эти цены автоматически отражаются в калькуляторе на сайте"
      />

      {/* Типы уборки */}
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-400">
        Тип уборки — цена за 1 м²
      </h3>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.tariffs.map((t) => {
          const meta = TYPE_META[t.key];
          const dirty = (prices[t.key] ?? '') !== String(t.pricePerSqm);
          return (
            <PriceCard
              key={t.key}
              icon={meta?.icon ?? Sparkles}
              title={t.title}
              desc={meta?.desc}
              unit="сомони / м²"
              value={prices[t.key] ?? ''}
              dirty={dirty}
              onChange={(v) => setPrices((p) => ({ ...p, [t.key]: v }))}
              onSave={() => saveTariff(t.key)}
            />
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
          return (
            <PriceCard
              key={e.key}
              icon={EXTRA_META[e.key]?.icon ?? Box}
              title={e.title}
              unit={e.hasQty ? 'сомони / шт' : 'сомони'}
              value={extraPrices[e.key] ?? ''}
              dirty={dirty}
              onChange={(v) => setExtraPrices((p) => ({ ...p, [e.key]: v }))}
              onSave={() => saveExtra(e.key)}
            />
          );
        })}
      </div>
    </div>
  );
}

function PriceCard({
  icon: Icon,
  title,
  desc,
  unit,
  value,
  dirty,
  onChange,
  onSave,
}: {
  icon: LucideIcon;
  title: string;
  desc?: string;
  unit: string;
  value: string;
  dirty: boolean;
  onChange: (v: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="card flex flex-col p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-100 text-navy-600">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="font-bold leading-tight text-navy-900">{title}</h4>
          {desc && <p className="mt-0.5 text-xs text-navy-400">{desc}</p>}
        </div>
      </div>

      <label className="mb-1.5 mt-4 block text-xs font-medium text-navy-500">
        Цена
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) =>
            onChange(
              e.target.value
                .replace(/[^\d]/g, '') // только цифры
                .replace(/^0+(?=\d)/, ''), // без ведущих нулей
            )
          }
          placeholder="0"
          className="input pr-24 text-lg font-bold"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-navy-400">
          {unit}
        </span>
      </div>

      <button
        onClick={onSave}
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
}
