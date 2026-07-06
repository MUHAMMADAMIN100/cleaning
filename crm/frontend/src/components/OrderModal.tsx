import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { Modal, Badge } from './ui';
import { useToast } from './Toast';
import { useDialog } from './Dialog';
import { DatePicker } from './DatePicker';
import { withRetry } from '../lib/util';
import {
  STAGE_LABEL,
  STAGE_ORDER,
  STAGE_COLOR,
  TYPE_LABEL,
  SOURCE_LABEL,
  ACTIVE_TYPES,
  DIRT_LABEL,
  DIRT_ORDER,
  formatPrice,
  formatDate,
} from '../lib/labels';
import type {
  CleaningType,
  Cleaner,
  DirtLevel,
  FunnelStage,
  Order,
} from '../types';

interface Props {
  orderId: string | null;
  /** Данные заказа из списка/доски — для мгновенного открытия без ожидания */
  initial?: Order;
  onClose: () => void;
  onUpdated: () => void;
  /** Оптимистичное обновление доски до ответа сервера */
  onOptimistic?: (orderId: string, patch: Partial<Order>) => void;
  /** Оптимистичное удаление заказа из списка */
  onDeleted?: (orderId: string) => void;
}

export function OrderModal({
  orderId,
  initial,
  onClose,
  onUpdated,
  onOptimistic,
  onDeleted,
}: Props) {
  const toast = useToast();
  const dialog = useDialog();
  const [order, setOrder] = useState<Order | null>(null);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [stage, setStage] = useState<FunnelStage>('NEW');
  const [rejectionReason, setRejectionReason] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [finalPrice, setFinalPrice] = useState<string>('');
  const [selectedCleaners, setSelectedCleaners] = useState<string[]>([]);
  const [editType, setEditType] = useState<CleaningType>('GENERAL');
  const [editDirt, setEditDirt] = useState<DirtLevel | ''>('');
  const [editArea, setEditArea] = useState('');
  const [editSeats, setEditSeats] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [error, setError] = useState('');
  const seededRef = useRef(false);

  // заполняем редактируемые поля из заказа
  const seedEditable = (o: Order) => {
    setStage(o.stage);
    setRejectionReason(o.rejectionReason ?? '');
    setScheduledDate(o.scheduledDate?.slice(0, 10) ?? '');
    setFinalPrice(o.finalPrice != null ? String(o.finalPrice) : '');
    setSelectedCleaners((o.cleaners ?? []).map((x) => x.id));
    setEditType(o.cleaningType);
    setEditDirt(o.dirtLevel ?? '');
    setEditArea(String(o.area ?? ''));
    setEditSeats(o.seats != null ? String(o.seats) : '');
    setEditAddress(o.address ?? '');
  };

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      seededRef.current = false;
      return;
    }
    setError('');
    seededRef.current = false;

    // 1) мгновенно показываем то, что уже знаем из списка/доски
    if (initial) {
      setOrder(initial);
      seedEditable(initial);
      seededRef.current = true;
    } else {
      setOrder(null);
    }

    // 2) в фоне догружаем полные детали + список клинеров
    Promise.all([
      api.get<Order>(`/orders/${orderId}`),
      api.get<Cleaner[]>('/cleaners'),
    ])
      .then(([o, c]) => {
        setOrder(o.data);
        // редактируемые поля не перетираем, если уже заполнили из initial
        if (!seededRef.current) {
          seedEditable(o.data);
          seededRef.current = true;
        }
        setCleaners(c.data);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const save = async () => {
    if (!order) return;
    if (stage === 'REJECTED' && !rejectionReason.trim()) {
      setError('Укажите причину отказа');
      return;
    }

    // 1) Оптимистично обновляем карточку/доску и закрываем окно — без ожидания
    const toInt = (s: string) => Math.round(Number(s)); // бэкенд принимает только целые
    const newFinal = finalPrice !== '' ? toInt(finalPrice) : order.finalPrice;
    const newArea = editArea !== '' ? toInt(editArea) : order.area;
    const newSeats = editSeats !== '' ? toInt(editSeats) : order.seats;
    const newDirt = editType === 'FURNITURE' ? null : editDirt || null;
    onOptimistic?.(order.id, {
      stage,
      finalPrice: newFinal,
      area: newArea,
      seats: newSeats,
      dirtLevel: newDirt,
      cleaningType: editType,
      address: editAddress || order.address,
      scheduledDate: scheduledDate || order.scheduledDate,
      rejectionReason: stage === 'REJECTED' ? rejectionReason : order.rejectionReason,
      cleaners: cleaners
        .filter((c) => selectedCleaners.includes(c.id))
        .map((c) => ({ id: c.id, fullName: c.fullName })),
    });
    onClose();

    // 2) Запросы уходят в фоне; при ошибке — откат через reload + тост
    try {
      await api.patch(`/orders/${order.id}`, {
        cleaningType: editType,
        // null очищает степень (для мебели); поле шлём всегда
        dirtLevel: newDirt,
        area: newArea,
        ...(editType === 'FURNITURE' && editSeats !== ''
          ? { seats: toInt(editSeats) }
          : {}),
        address: editAddress || undefined,
        ...(finalPrice !== '' ? { finalPrice: toInt(finalPrice) } : {}),
      });
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

  const remove = async () => {
    if (!order) return;
    const ok = await dialog.confirm({
      title: 'Удалить заявку?',
      message: 'Заявка будет удалена безвозвратно.',
      confirmText: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    onDeleted?.(order.id);
    onClose();
    try {
      await withRetry(() => api.delete(`/orders/${order.id}`));
      onUpdated();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Не удалось удалить заявку');
      onUpdated();
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
          {/* Инфо (только чтение) */}
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-navy-50 p-4 text-sm">
            <Info label="Телефон" value={order.client?.phone} />
            <Info label="Источник" value={SOURCE_LABEL[order.source]} />
            <Info label="Расчёт с сайта" value={formatPrice(order.estimatedPrice)} />
            {order.preferredDate && (
              <Info label="Желаемая дата" value={formatDate(order.preferredDate)} />
            )}
            {order.comment && <Info label="Комментарий" value={order.comment} />}
          </div>

          {/* Параметры заявки (редактирование) */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Услуга</label>
              <select
                className="input"
                value={editType}
                onChange={(e) => setEditType(e.target.value as CleaningType)}
              >
                {/* старый заказ с закрытой услугой: опция остаётся на всё время редактирования */}
                {(order.cleaningType === 'MAINTENANCE'
                  ? (['MAINTENANCE', ...ACTIVE_TYPES] as CleaningType[])
                  : ACTIVE_TYPES
                ).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            {editType === 'FURNITURE' ? (
              <div>
                <label className="label">Посадочных мест</label>
                <input
                  type="number"
                  className="input"
                  value={editSeats}
                  onChange={(e) => setEditSeats(e.target.value)}
                />
              </div>
            ) : (
              <div>
                <label className="label">Площадь, м²</label>
                <input
                  type="number"
                  className="input"
                  value={editArea}
                  onChange={(e) => setEditArea(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="label">Адрес</label>
              <input
                className="input"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Адрес объекта"
              />
            </div>
          </div>

          {/* Степень загрязнения (для уборки по м²) */}
          {editType !== 'FURNITURE' && (
            <div>
              <label className="label">Степень загрязнения</label>
              <div className="flex flex-wrap gap-2">
                {DIRT_ORDER.map((d) => (
                  <button
                    key={d}
                    onClick={() => setEditDirt(d)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      editDirt === d
                        ? 'bg-navy-500 text-white ring-2 ring-navy-300'
                        : 'border border-navy-200 bg-white text-navy-500 hover:bg-navy-50'
                    }`}
                  >
                    {DIRT_LABEL[d]}
                  </button>
                ))}
              </div>
            </div>
          )}

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
              <DatePicker value={scheduledDate} onChange={setScheduledDate} />
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
                        ? 'bg-navy-500 text-white'
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

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-navy-100 pt-4">
            <button
              onClick={remove}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Удалить заявку
            </button>
            <div className="flex gap-2">
              <button onClick={onClose} className="btn-ghost">
                Отмена
              </button>
              <button onClick={save} className="btn-primary">
                Сохранить
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
