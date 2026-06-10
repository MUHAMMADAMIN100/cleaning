import { useState } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import { api } from '../api/client';
import { useFetch } from '../api/hooks';
import { useToast } from '../components/Toast';
import { Spinner, PageHeader, Badge } from '../components/ui';
import { OrderModal } from '../components/OrderModal';
import { STAGE_COLOR, TYPE_LABEL, formatPrice } from '../lib/labels';
import type { BoardColumn, FunnelStage, Order } from '../types';

export function Funnel() {
  const toast = useToast();
  const { data, loading, reload, setData } = useFetch<BoardColumn[]>(
    '/orders/board',
    { pollMs: 10000 },
  );
  const [openOrder, setOpenOrder] = useState<Order | null>(null);

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

  // Перетаскивание карточки в другую колонку = смена этапа
  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    const newStage = destination.droppableId as FunnelStage;
    let rejectionReason: string | undefined;

    if (newStage === 'REJECTED') {
      const reason = window.prompt('Причина отказа клиента:');
      if (!reason || !reason.trim()) return; // отмена — не двигаем
      rejectionReason = reason.trim();
    }

    applyPatch(draggableId, { stage: newStage, rejectionReason });
    api
      .patch(`/orders/${draggableId}/stage`, { stage: newStage, rejectionReason })
      .then(() => reload())
      .catch((e) => {
        toast.error(e?.response?.data?.message || 'Не удалось сменить этап');
        reload();
      });
  };

  if (loading || !data) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Воронка продаж"
        subtitle="Перетаскивайте карточки между этапами или нажмите для деталей"
      />

      <DragDropContext onDragEnd={onDragEnd}>
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
                            onClick={() => setOpenOrder(o)}
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
      />
    </div>
  );
}
