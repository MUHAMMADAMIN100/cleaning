import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Modal, Badge } from './ui';
import { useToast } from './Toast';
import {
  STAGE_LABEL,
  STAGE_ORDER,
  STAGE_COLOR,
  TYPE_LABEL,
  SOURCE_LABEL,
  formatPrice,
  formatDate,
} from '../lib/labels';
import type { Cleaner, FunnelStage, Order } from '../types';

interface Props {
  orderId: string | null;
  onClose: () => void;
  onUpdated: () => void;
  /** Оптимистичное обновление доски до ответа сервера */
  onOptimistic?: (orderId: string, patch: Partial<Order>) => void;
}

export function OrderModal({ orderId, onClose, onUpdated, onOptimistic }: Props) {
  const toast = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [stage, setStage] = useState<FunnelStage>('NEW');
  const [rejectionReason, setRejectionReason] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [finalPrice, setFinalPrice] = useState<string>('');
  const [selectedCleaners, setSelectedCleaners] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;
    setError('');
    Promise.all([
      api.get<Order>(`/orders/${orderId}`),
      api.get<Cleaner[]>('/cleaners'),
    ]).then(([o, c]) => {
      setOrder(o.data);
      setStage(o.data.stage);
      setRejectionReason(o.data.rejectionReason ?? '');
      setScheduledDate(o.data.scheduledDate?.slice(0, 10) ?? '');
      setFinalPrice(o.data.finalPrice != null ? String(o.data.finalPrice) : '');
      setSelectedCleaners((o.data.cleaners ?? []).map((x) => x.id));
      setCleaners(c.data);
    });
  }, [orderId]);

  const save = async () => {
    if (!order) return;
    if (stage === 'REJECTED' && !rejectionReason.trim()) {
      setError('Укажите причину отказа');
      return;
    }

    // 1) Оптимистично двигаем карточку на доске и закрываем окно — без ожидания
    const newFinal = finalPrice !== '' ? Number(finalPrice) : order.finalPrice;
    onOptimistic?.(order.id, {
      stage,
      finalPrice: newFinal,
      scheduledDate: scheduledDate || order.scheduledDate,
      rejectionReason: stage === 'REJECTED' ? rejectionReason : order.rejectionReason,
      cleaners: cleaners
        .filter((c) => selectedCleaners.includes(c.id))
        .map((c) => ({ id: c.id, fullName: c.fullName })),
    });
    onClose();

    // 2) Запросы уходят в фоне; при ошибке — откат через reload + тост
    try {
      if (finalPrice !== '' && Number(finalPrice) !== order.finalPrice) {
        await api.patch(`/orders/${order.id}`, { finalPrice: Number(finalPrice) });
      }
      await api.patch(`/orders/${order.id}/cleaners`, {
        cleanerIds: selectedCleaners,
      });
      if (stage !== order.stage || stage === 'REJECTED') {
        await api.patch(`/orders/${order.id}/stage`, {
          stage,
          rejectionReason: stage === 'REJECTED' ? rejectionReason : undefined,
          scheduledDate: scheduledDate || undefined,
        });
      } else if (scheduledDate) {
        await api.patch(`/orders/${order.id}`, { scheduledDate });
      }
      onUpdated();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Не удалось сохранить заказ');
      onUpdated(); // откат к серверному состоянию
    }
  };

  const toggleCleaner = (id: string) =>
    setSelectedCleaners((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <Modal
      open={!!orderId}
      onClose={onClose}
      title={order ? `Заказ — ${order.client?.fullName}` : 'Загрузка…'}
      wide
    >
      {!order ? (
        <div className="py-8 text-center text-navy-400">Загрузка…</div>
      ) : (
        <div className="space-y-5">
          {/* Инфо */}
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-navy-50 p-4 text-sm">
            <Info label="Телефон" value={order.client?.phone} />
            <Info label="Источник" value={SOURCE_LABEL[order.source]} />
            <Info label="Тип уборки" value={TYPE_LABEL[order.cleaningType]} />
            <Info label="Площадь" value={`${order.area} м²`} />
            <Info label="Расчёт с сайта" value={formatPrice(order.estimatedPrice)} />
            <Info label="Адрес" value={order.address || '—'} />
            {order.preferredDate && (
              <Info label="Желаемая дата" value={formatDate(order.preferredDate)} />
            )}
            {order.comment && <Info label="Комментарий" value={order.comment} />}
          </div>

          {/* Текущий этап */}
          <div>
            <label className="label">Этап воронки</label>
            <div className="flex flex-wrap gap-2">
              {STAGE_ORDER.map((s) => (
                <button
                  key={s}
                  onClick={() => setStage(s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    stage === s
                      ? STAGE_COLOR[s] + ' ring-2 ring-navy-300'
                      : 'bg-white text-navy-500 border border-navy-200 hover:bg-navy-50'
                  }`}
                >
                  {STAGE_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          {stage === 'REJECTED' && (
            <div>
              <label className="label">Причина отказа *</label>
              <input
                className="input"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Например: дорого, выбрали другую компанию"
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Итоговая стоимость (после КП)</label>
              <input
                type="number"
                className="input"
                value={finalPrice}
                onChange={(e) => setFinalPrice(e.target.value)}
                placeholder={String(order.estimatedPrice)}
              />
            </div>
            <div>
              <label className="label">Дата уборки</label>
              <input
                type="date"
                className="input"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
          </div>

          {/* Команда */}
          <div>
            <label className="label">Назначить команду (клинеры)</label>
            {cleaners.length === 0 ? (
              <div className="text-sm text-navy-400">
                Нет доступных клинеров. Добавьте их в разделе «Команда».
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {cleaners.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleCleaner(c.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      selectedCleaners.includes(c.id)
                        ? 'bg-navy-800 text-white'
                        : 'border border-navy-200 bg-white text-navy-600 hover:bg-navy-50'
                    }`}
                  >
                    {c.fullName}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-navy-100 pt-4">
            <Badge className={STAGE_COLOR[order.stage]}>
              Сейчас: {STAGE_LABEL[order.stage]}
            </Badge>
            <div className="flex gap-2">
              <button onClick={onClose} className="btn-ghost">
                Отмена
              </button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-xs text-navy-400">{label}</div>
      <div className="font-medium text-navy-800">{value}</div>
    </div>
  );
}
