import { useState } from 'react';
import { useFetch } from '../api/hooks';
import { Spinner, PageHeader, Badge } from '../components/ui';
import { OrderModal } from '../components/OrderModal';
import {
  STAGE_COLOR,
  TYPE_LABEL,
  formatPrice,
} from '../lib/labels';
import type { BoardColumn, Order } from '../types';

export function Funnel() {
  const { data, loading, reload, setData } = useFetch<BoardColumn[]>(
    '/orders/board',
    { pollMs: 10000 },
  );
  const [openId, setOpenId] = useState<string | null>(null);

  // Оптимистичное перемещение карточки между этапами (до ответа сервера)
  const applyPatch = (orderId: string, patch: Partial<Order>) => {
    setData((cols) => {
      if (!cols) return cols;
      let moved: Order | undefined;
      const without = cols.map((c) => ({
        ...c,
        orders: c.orders.filter((o) => {
          if (o.id === orderId) {
            moved = { ...o, ...patch };
            return false;
          }
          return true;
        }),
      }));
      if (!moved) return cols;
      const target = patch.stage ?? moved.stage;
      return without.map((c) =>
        c.stage === target ? { ...c, orders: [moved as Order, ...c.orders] } : c,
      );
    });
  };

  if (loading || !data) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Воронка продаж"
        subtitle="Перетаскивайте заказы по этапам — нажмите на карточку, чтобы изменить статус"
      />

      <div className="flex gap-4 overflow-x-auto pb-4">
        {data.map((col) => (
          <div key={col.stage} className="w-72 shrink-0">
            <div className="mb-3 flex items-center justify-between">
              <Badge className={STAGE_COLOR[col.stage]}>{col.label}</Badge>
              <span className="text-sm font-bold text-navy-400">
                {col.orders.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {col.orders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setOpenId(o.id)}
                  className="card w-full p-3.5 text-left transition-shadow hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-navy-900">
                      {o.client?.fullName}
                    </div>
                    {o.isLarge && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                        КРУПНЫЙ
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-navy-400">
                    {TYPE_LABEL[o.cleaningType]} · {o.area} м²
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-navy-700">
                      {formatPrice(o.finalPrice ?? o.estimatedPrice)}
                    </span>
                    {o.cleaners && o.cleaners.length > 0 && (
                      <span className="text-xs text-navy-400">
                        👥 {o.cleaners.length}
                      </span>
                    )}
                  </div>
                </button>
              ))}
              {col.orders.length === 0 && (
                <div className="rounded-xl border border-dashed border-navy-200 py-6 text-center text-xs text-navy-300">
                  Пусто
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <OrderModal
        orderId={openId}
        onClose={() => setOpenId(null)}
        onUpdated={reload}
        onOptimistic={applyPatch}
      />
    </div>
  );
}
