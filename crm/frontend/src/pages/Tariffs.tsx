import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { api } from '../api/client';
import { useFetch } from '../api/hooks';
import { Spinner, PageHeader } from '../components/ui';
import type { Tariffs as TariffsData } from '../types';

export function Tariffs() {
  const { data, loading, reload } = useFetch<TariffsData>('/tariffs');
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [extraPrices, setExtraPrices] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setPrices(Object.fromEntries(data.tariffs.map((t) => [t.key, t.pricePerSqm])));
      setExtraPrices(Object.fromEntries(data.extras.map((e) => [e.key, e.price])));
    }
  }, [data]);

  if (loading || !data) return <Spinner />;

  const saveTariff = async (key: string) => {
    await api.patch(`/tariffs/tariff/${key}`, { pricePerSqm: prices[key] });
    flash();
  };
  const saveExtra = async (key: string) => {
    await api.patch(`/tariffs/extra/${key}`, { price: extraPrices[key] });
    flash();
  };
  const flash = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    reload();
  };

  return (
    <div>
      <PageHeader
        title="Управление тарифами"
        subtitle="Цены отражаются в калькуляторе на сайте"
      />

      {saved && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          ✓ Цена сохранена
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 font-bold text-navy-900">Тип уборки (за м²)</h3>
          <div className="space-y-3">
            {data.tariffs.map((t) => (
              <div key={t.key} className="flex items-center gap-3">
                <span className="flex-1 text-sm font-medium text-navy-700">
                  {t.title}
                </span>
                <input
                  type="number"
                  className="input max-w-[120px]"
                  value={prices[t.key] ?? ''}
                  onChange={(e) =>
                    setPrices((p) => ({ ...p, [t.key]: Number(e.target.value) }))
                  }
                />
                <span className="text-sm text-navy-400">сомони</span>
                <button onClick={() => saveTariff(t.key)} className="btn-primary !px-3 !py-2">
                  <Save className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 font-bold text-navy-900">Дополнительные услуги</h3>
          <div className="space-y-3">
            {data.extras.map((e) => (
              <div key={e.key} className="flex items-center gap-3">
                <span className="flex-1 text-sm font-medium text-navy-700">
                  {e.title}
                </span>
                <input
                  type="number"
                  className="input max-w-[120px]"
                  value={extraPrices[e.key] ?? ''}
                  onChange={(ev) =>
                    setExtraPrices((p) => ({ ...p, [e.key]: Number(ev.target.value) }))
                  }
                />
                <span className="text-sm text-navy-400">сомони</span>
                <button onClick={() => saveExtra(e.key)} className="btn-primary !px-3 !py-2">
                  <Save className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
