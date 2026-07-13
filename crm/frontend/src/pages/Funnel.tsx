import { useRef, useState } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import { api } from '../api/client';
import { useFetch } from '../api/hooks';
import { useToast } from '../components/Toast';
import { useDialog } from '../components/Dialog';
import { Spinner, PageHeader, Badge } from '../components/ui';
import { OrderModal } from '../components/OrderModal';
import {
  STAGE_COLOR,
  TYPE_LABEL,
  formatPrice,
  formatVolume,
} from '../lib/labels';
import type { BoardColumn, FunnelStage, Order } from '../types';

export function Funnel() {
  const toast = useToast();
  const dialog = useDialog();
  const { data, loading, reload, setData } = useFetch<BoardColumn[]>(
    '/orders/board',
    { pollMs: 10000 },
  );
  const [openOrder, setOpenOrder] = useState<Order | null>(null);
  // true во время и сразу после перетаскивания — чтобы «клик», который
  // браузер шлёт после отпускания карточки, не открывал модалку (двойное срабатывание)
  const draggingRef = useRef(false);

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

  const onDragStart = () => {
    draggingRef.current = true;
  };

  // Перетаскивание карточки в другую колонку = смена этапа
  const onDragEnd = async (result: DropResult) => {
    // сбрасываем флаг на следующий тик: клик после отпускания приходит
    // раньше таймера и будет подавлен, а обычный клик не тронут
    setTimeout(() => {
      draggingRef.current = false;
    }, 0);
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    const newStage = destination.droppableId as FunnelStage;
    let rejectionReason: string | undefined;

    if (newStage === 'REJECTED') {
      const reason = await dialog.prompt({
        title: 'Причина отказа',
        message: 'Укажите, почему клиент отказался.',
        placeholder: 'Например: дорого, выбрали другую компанию',
        confirmText: 'Сохранить',
      });
      if (!reason) return; // отмена — не двигаем
      rejectionReason = reason;
    }

    // Оптимистично: карточка переезжает мгновенно, запрос уходит в фон.
    // На успехе НЕ перезапрашиваем доску (иначе карточка «оседает» после
    // ответа сервера) — фоновое авто-обновление сверит состояние само.
    // Откат — только при ошибке.
    applyPatch(draggableId, { stage: newStage, rejectionReason });
    try {
      await api.patch(`/orders/${draggableId}/stage`, {
        stage: newStage,
        rejectionReason,
      });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Не удалось сменить этап');
      reload(); // вернуть серверное состояние
    }
  };

  if (loading || !data) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Воронка продаж"
        subtitle="Перетаскивайте карточки между этапами или нажмите для деталей"
      />

      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {data.map((col) => (
            <div key={col.stage} className="flex w-72 shrink-0 flex-col">
              <div className="mb-3 flex items-center justify-between">
                <Badge className={STAGE_COLOR[col.stage]}>{col.label}</Badge>
                <span className="text-sm font-bold text-navy-400">
                  {col.orders.length}
                </span>
              </div>

              <Droppable droppableId={col.stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 space-y-2.5 rounded-2xl p-1 transition-colors ${
                      snapshot.isDraggingOver ? 'bg-navy-100/60' : ''
                    }`}
                  >
                    {col.orders.map((o, index) => (
                      <Draggable key={o.id} draggableId={o.id} index={index}>
                        {(p, snap) => (
                          <div
                            ref={p.innerRef}
                            {...p.draggableProps}
                            {...p.dragHandleProps}
                            onClick={() => {
                              // это был драг, а не клик — модалку не открываем
                              if (draggingRef.current) return;
                              setOpenOrder(o);
                            }}
                            className={`card cursor-pointer p-3.5 text-left transition-shadow hover:shadow-lg ${
                              snap.isDragging ? 'shadow-xl ring-2 ring-navy-300' : ''
                            }`}
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
                              {TYPE_LABEL[o.cleaningType]} · {formatVolume(o)}
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
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {col.orders.length === 0 && !snapshot.isDraggingOver && (
                      <div className="rounded-xl border border-dashed border-navy-200 py-6 text-center text-xs text-navy-300">
                        Перетащите сюда
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      <OrderModal
        orderId={openOrder?.id ?? null}
        initial={openOrder ?? undefined}
        onClose={() => setOpenOrder(null)}
        onUpdated={reload}
        onOptimistic={applyPatch}
        onDeleted={(oid) =>
          setData((cols) =>
            cols
              ? cols.map((c) => ({
                  ...c,
                  orders: c.orders.filter((o) => o.id !== oid),
                }))
              : cols,
          )
        }
      />
    </div>
  );
}
