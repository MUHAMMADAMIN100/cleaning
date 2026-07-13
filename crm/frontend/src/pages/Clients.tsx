import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Search } from 'lucide-react';
import { api } from '../api/client';
import { useFetch, mutateCache } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { Spinner, PageHeader, Badge, Modal, EmptyState } from '../components/ui';
import { useToast } from '../components/Toast';
import {
  TAG_LABEL,
  TAG_COLOR,
  SOURCE_LABEL,
  TYPE_LABEL,
  ACTIVE_TYPES,
  DIRT_LABEL,
  DIRT_ORDER,
  formatDate,
} from '../lib/labels';
import { tempId, nowISO } from '../lib/util';
import { userSeesAll } from '../types';
import type {
  BoardColumn,
  CleaningType,
  Client,
  ClientTag,
  DirtLevel,
  LeadSource,
  Manager,
  Order,
} from '../types';

const TAGS: ClientTag[] = ['VIP', 'REGULAR', 'POTENTIAL', 'REFUSED'];
const SOURCES: LeadSource[] = ['SITE', 'INSTAGRAM', 'CALL', 'RECOMMENDATION'];

/** Данные заявки при добавлении клиента (если создаём заявку в воронке) */
export interface NewOrderInput {
  cleaningType: CleaningType;
  dirtLevel?: DirtLevel;
  area: number;
  seats?: number;
  estimatedPrice: number;
}

export function Clients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [source, setSource] = useState('');
  const [sort, setSort] = useState<'recent' | 'name'>('recent');
  const [showAdd, setShowAdd] = useState(false);

  const query = new URLSearchParams();
  if (search) query.set('search', search);
  if (tag) query.set('tag', tag);
  if (source) query.set('source', source);
  query.set('sort', sort);

  const { data, loading, reload, setData } = useFetch<Client[]>(
    `/clients?${query.toString()}`,
    { deps: [search, tag, source, sort], pollMs: 15000 },
  );
  const toast = useToast();

  // оптимистично: клиент появляется в списке сразу; при необходимости
  // создаём и заявку в воронке (этап «Новая заявка»)
  const createClient = async (
    payload: {
      fullName: string;
      phone: string;
      source: LeadSource;
      managerId?: string;
    },
    managerName: string | null,
    order: NewOrderInput | null,
  ) => {
    const id = tempId();
    const optimistic: Client = {
      id,
      fullName: payload.fullName,
      phone: payload.phone,
      source: payload.source,
      tags: [],
      lastContactAt: nowISO(),
      managerId: payload.managerId,
      manager: managerName
        ? { id: payload.managerId ?? '', fullName: managerName }
        : null,
      _count: { orders: order ? 1 : 0 },
    };
    setData((list) => (list ? [optimistic, ...list] : [optimistic]));
    try {
      const client = (await api.post<Client>('/clients', payload)).data;
      if (order) {
        const created = (
          await api.post<Order>('/orders', {
            clientId: client.id,
            source: payload.source,
            managerId: payload.managerId,
            ...order,
          })
        ).data;
        // мгновенно показать заявку в кэше воронки (если он уже загружен)
        mutateCache<BoardColumn[]>('/orders/board', (cols) =>
          cols.map((c) =>
            c.stage === 'NEW' ? { ...c, orders: [created, ...c.orders] } : c,
          ),
        );
      }
      reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Не удалось создать клиента');
      setData((list) => (list ? list.filter((c) => c.id !== id) : list));
    }
  };

  // Пагинация по 10 строк
  const PER_PAGE = 10;
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [search, tag, source, sort]);
  const total = data?.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const pageData = (data ?? []).slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE,
  );

  const exportCsv = async () => {
    const res = await api.get('/clients/export', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clients.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="База клиентов"
        subtitle="Все обращения фиксируются здесь"
        action={
          <div className="flex gap-2">
            <button onClick={exportCsv} className="btn-ghost">
              <Download className="h-4 w-4" />
              Экспорт
            </button>
            <button onClick={() => setShowAdd(true)} className="btn-primary">
              <Plus className="h-4 w-4" />
              Добавить
            </button>
          </div>
        }
      />

      {/* Фильтры */}
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
          <input
            className="input !pl-9"
            placeholder="Поиск по имени или телефону"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input max-w-[180px]" value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">Все теги</option>
          {TAGS.map((t) => (
            <option key={t} value={t}>{TAG_LABEL[t]}</option>
          ))}
        </select>
        <select className="input max-w-[180px]" value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">Все источники</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
          ))}
        </select>
        <select className="input max-w-[180px]" value={sort} onChange={(e) => setSort(e.target.value as any)}>
          <option value="recent">Сначала недавние</option>
          <option value="name">По имени</option>
        </select>
      </div>

      {loading || !data ? (
        <Spinner />
      ) : data.length === 0 ? (
        <EmptyState text="Клиенты не найдены" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Клиент</th>
                  <th className="px-4 py-3 font-semibold">Телефон</th>
                  <th className="px-4 py-3 font-semibold">Источник</th>
                  <th className="px-4 py-3 font-semibold">Теги</th>
                  {userSeesAll(user) && (
                    <th className="px-4 py-3 font-semibold">Менеджер</th>
                  )}
                  <th className="px-4 py-3 font-semibold">Заказов</th>
                  <th className="px-4 py-3 font-semibold">Контакт</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {pageData.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/clients/${c.id}`)}
                    className="cursor-pointer hover:bg-navy-50"
                  >
                    <td className="px-4 py-3 font-semibold text-navy-900">
                      {c.fullName}
                    </td>
                    <td className="px-4 py-3 text-navy-600">{c.phone}</td>
                    <td className="px-4 py-3 text-navy-600">
                      {SOURCE_LABEL[c.source]}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.map((t) => (
                          <Badge key={t} className={TAG_COLOR[t]}>
                            {TAG_LABEL[t]}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    {userSeesAll(user) && (
                      <td className="px-4 py-3 text-navy-600">
                        {c.manager?.fullName ?? '—'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-navy-600">
                      {c._count?.orders ?? 0}
                    </td>
                    <td className="px-4 py-3 text-navy-400">
                      {formatDate(c.lastContactAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Пагинация */}
          {pageCount > 1 && (
            <div className="flex items-center justify-between border-t border-navy-50 px-4 py-3 text-sm">
              <span className="text-navy-400">
                Стр. {currentPage} из {pageCount} · всего {total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="rounded-lg border border-navy-200 px-3 py-1.5 text-navy-600 transition hover:bg-navy-50 disabled:opacity-40"
                >
                  Назад
                </button>
                {Array.from({ length: pageCount }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === pageCount ||
                      Math.abs(p - currentPage) <= 1,
                  )
                  .map((p, idx, arr) => (
                    <span key={p} className="flex items-center">
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-1 text-navy-300">…</span>
                      )}
                      <button
                        onClick={() => setPage(p)}
                        className={`min-w-[34px] rounded-lg px-2.5 py-1.5 font-medium transition ${
                          p === currentPage
                            ? 'bg-navy-500 text-white'
                            : 'border border-navy-200 text-navy-600 hover:bg-navy-50'
                        }`}
                      >
                        {p}
                      </button>
                    </span>
                  ))}
                <button
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={currentPage >= pageCount}
                  className="rounded-lg border border-navy-200 px-3 py-1.5 text-navy-600 transition hover:bg-navy-50 disabled:opacity-40"
                >
                  Вперёд
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <AddClientModal
          onClose={() => setShowAdd(false)}
          onCreate={createClient}
          isDirector={userSeesAll(user)}
        />
      )}
    </div>
  );
}

function AddClientModal({
  onClose,
  onCreate,
  isDirector,
}: {
  onClose: () => void;
  onCreate: (
    payload: {
      fullName: string;
      phone: string;
      source: LeadSource;
      managerId?: string;
    },
    managerName: string | null,
    order: NewOrderInput | null,
  ) => void;
  isDirector: boolean;
}) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState<LeadSource>('CALL');
  const [managerId, setManagerId] = useState('');
  // заявка в воронке
  const [makeOrder, setMakeOrder] = useState(true);
  const [cleaningType, setCleaningType] = useState<CleaningType>('GENERAL');
  const [dirtLevel, setDirtLevel] = useState<DirtLevel>('LIGHT');
  const [area, setArea] = useState('');
  const [seats, setSeats] = useState('');
  const [price, setPrice] = useState('');
  const { data: managers } = useFetch<Manager[]>(
    isDirector ? '/users/managers' : null,
  );
  const isFurniture = cleaningType === 'FURNITURE';

  const submit = () => {
    const managerName =
      (managers ?? []).find((m) => m.id === managerId)?.fullName ?? null;
    const toInt = (s: string) => Math.round(Number(s)) || 0;
    const order: NewOrderInput | null = makeOrder
      ? {
          cleaningType,
          dirtLevel: isFurniture ? undefined : dirtLevel,
          area: isFurniture ? 0 : toInt(area),
          seats: isFurniture ? toInt(seats) : undefined,
          estimatedPrice: toInt(price),
        }
      : null;
    onCreate(
      { fullName, phone, source, managerId: managerId || undefined },
      managerName,
      order,
    );
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Новый клиент">
      <div className="space-y-3">
        <div>
          <label className="label">ФИО *</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label">Телефон *</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+992 ..." />
        </div>
        <div>
          <label className="label">Источник</label>
          <select className="input" value={source} onChange={(e) => setSource(e.target.value as LeadSource)}>
            {SOURCES.map((s) => (
              <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
            ))}
          </select>
        </div>
        {isDirector && (
          <div>
            <label className="label">Ответственный менеджер</label>
            <select className="input" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">— не назначен —</option>
              {(managers ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.fullName}</option>
              ))}
            </select>
          </div>
        )}

        {/* Заявка в воронке */}
        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-navy-100 bg-navy-50/50 px-3 py-2.5">
          <input
            type="checkbox"
            checked={makeOrder}
            onChange={(e) => setMakeOrder(e.target.checked)}
            className="h-4 w-4 accent-navy-500"
          />
          <span className="text-sm font-medium text-navy-800">
            Создать заявку в воронке (этап «Новая заявка»)
          </span>
        </label>

        {makeOrder && (
          <div className="space-y-3 rounded-xl border border-navy-100 p-3">
            <div>
              <label className="label">Услуга</label>
              <select
                className="input"
                value={cleaningType}
                onChange={(e) => setCleaningType(e.target.value as CleaningType)}
              >
                {ACTIVE_TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                ))}
              </select>
            </div>
            {!isFurniture && (
              <div>
                <label className="label">Степень загрязнения</label>
                <div className="flex flex-wrap gap-2">
                  {DIRT_ORDER.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDirtLevel(d)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        dirtLevel === d
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
            <div className="grid grid-cols-2 gap-3">
              {isFurniture ? (
                <div>
                  <label className="label">Посадочных мест</label>
                  <input type="number" className="input" value={seats} onChange={(e) => setSeats(e.target.value)} />
                </div>
              ) : (
                <div>
                  <label className="label">Площадь, м²</label>
                  <input type="number" className="input" value={area} onChange={(e) => setArea(e.target.value)} />
                </div>
              )}
              <div>
                <label className="label">Ориент. цена</label>
                <input type="number" className="input" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost">Отмена</button>
          <button onClick={submit} disabled={!fullName || !phone} className="btn-primary">
            Создать
          </button>
        </div>
      </div>
    </Modal>
  );
}
