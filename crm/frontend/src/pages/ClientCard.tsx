import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Phone, Plus, Save } from 'lucide-react';
import { api } from '../api/client';
import { useFetch } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { Spinner, PageHeader, Badge, Modal } from '../components/ui';
import { OrderModal } from '../components/OrderModal';
import {
  TAG_LABEL,
  TAG_COLOR,
  SOURCE_LABEL,
  STAGE_LABEL,
  STAGE_COLOR,
  TYPE_LABEL,
  formatPrice,
  formatDate,
} from '../lib/labels';
import type {
  CleaningType,
  Client,
  ClientTag,
  Manager,
} from '../types';

const ALL_TAGS: ClientTag[] = ['VIP', 'REGULAR', 'POTENTIAL', 'REFUSED'];
const TYPES: CleaningType[] = ['MAINTENANCE', 'GENERAL', 'POST_RENOVATION'];

export function ClientCard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, reload } = useFetch<Client>(`/clients/${id}`, [id]);
  const [notes, setNotes] = useState<string | null>(null);
  const [tags, setTags] = useState<ClientTag[] | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [openOrder, setOpenOrder] = useState<string | null>(null);
  const [showAddOrder, setShowAddOrder] = useState(false);

  if (loading || !data) return <Spinner />;

  const curNotes = notes ?? data.notes ?? '';
  const curTags = tags ?? data.tags;

  const toggleTag = (t: ClientTag) =>
    setTags((prev) => {
      const base = prev ?? data.tags;
      return base.includes(t) ? base.filter((x) => x !== t) : [...base, t];
    });

  const saveMeta = async () => {
    setSavingMeta(true);
    try {
      await api.patch(`/clients/${id}`, { notes: curNotes, tags: curTags });
      await reload();
      setNotes(null);
      setTags(null);
    } finally {
      setSavingMeta(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" /> Назад
      </button>

      <PageHeader
        title={data.fullName}
        subtitle={SOURCE_LABEL[data.source] + ' · клиент'}
        action={
          <a href={`tel:${data.phone}`} className="btn-primary">
            <Phone className="h-4 w-4" />
            {data.phone}
          </a>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Левая колонка — инфо + теги + заметки */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="mb-3 font-bold text-navy-900">Информация</h3>
            <dl className="space-y-2 text-sm">
              <Row label="Телефон" value={data.phone} />
              <Row label="Источник" value={SOURCE_LABEL[data.source]} />
              <Row label="Менеджер" value={data.manager?.fullName ?? '—'} />
              <Row label="Последний контакт" value={formatDate(data.lastContactAt)} />
              <Row label="Всего заказов" value={String(data.orders?.length ?? 0)} />
            </dl>
          </div>

          <div className="card p-5">
            <h3 className="mb-3 font-bold text-navy-900">Теги</h3>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    curTags.includes(t)
                      ? TAG_COLOR[t] + ' ring-2 ring-navy-200'
                      : 'border border-navy-200 bg-white text-navy-500'
                  }`}
                >
                  {TAG_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-3 font-bold text-navy-900">Заметки менеджера</h3>
            <textarea
              className="input min-h-[100px] resize-none"
              value={curNotes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Комментарии о клиенте…"
            />
            <button
              onClick={saveMeta}
              disabled={savingMeta}
              className="btn-primary mt-3 w-full"
            >
              <Save className="h-4 w-4" />
              {savingMeta ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </div>

        {/* Правая колонка — история заказов */}
        <div className="lg:col-span-2">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-navy-900">История заказов</h3>
              <button onClick={() => setShowAddOrder(true)} className="btn-ghost">
                <Plus className="h-4 w-4" />
                Новый заказ
              </button>
            </div>

            <div className="space-y-3">
              {(data.orders ?? []).map((o) => (
                <button
                  key={o.id}
                  onClick={() => setOpenOrder(o.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-navy-100 p-4 text-left hover:bg-navy-50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-navy-900">
                        {TYPE_LABEL[o.cleaningType]}
                      </span>
                      <Badge className={STAGE_COLOR[o.stage]}>
                        {STAGE_LABEL[o.stage]}
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-navy-400">
                      {o.area} м² · {formatDate(o.createdAt)}
                      {o.rejectionReason && ` · Отказ: ${o.rejectionReason}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-navy-800">
                      {formatPrice(o.finalPrice ?? o.estimatedPrice)}
                    </div>
                    {o.cleaners && o.cleaners.length > 0 && (
                      <div className="text-xs text-navy-400">
                        👥 {o.cleaners.map((c) => c.fullName).join(', ')}
                      </div>
                    )}
                  </div>
                </button>
              ))}
              {(!data.orders || data.orders.length === 0) && (
                <div className="py-8 text-center text-sm text-navy-400">
                  Заказов пока нет
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <OrderModal
        orderId={openOrder}
        onClose={() => setOpenOrder(null)}
        onUpdated={reload}
      />
      {showAddOrder && (
        <AddOrderModal
          clientId={data.id}
          isDirector={user?.role === 'DIRECTOR'}
          onClose={() => setShowAddOrder(false)}
          onCreated={() => {
            setShowAddOrder(false);
            reload();
          }}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-navy-400">{label}</dt>
      <dd className="font-medium text-navy-800">{value}</dd>
    </div>
  );
}

function AddOrderModal({
  clientId,
  isDirector,
  onClose,
  onCreated,
}: {
  clientId: string;
  isDirector: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [cleaningType, setCleaningType] = useState<CleaningType>('GENERAL');
  const [area, setArea] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [managerId, setManagerId] = useState('');
  const [saving, setSaving] = useState(false);
  const { data: managers } = useFetch<Manager[]>(
    isDirector ? '/users/managers' : null,
  );

  const submit = async () => {
    setSaving(true);
    try {
      await api.post('/orders', {
        clientId,
        cleaningType,
        area: Number(area) || 0,
        estimatedPrice: Number(estimatedPrice) || 0,
        managerId: managerId || undefined,
        source: 'CALL',
      });
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Новый заказ">
      <div className="space-y-3">
        <div>
          <label className="label">Тип уборки</label>
          <select className="input" value={cleaningType} onChange={(e) => setCleaningType(e.target.value as CleaningType)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_LABEL[t]}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Площадь, м²</label>
            <input type="number" className="input" value={area} onChange={(e) => setArea(e.target.value)} />
          </div>
          <div>
            <label className="label">Стоимость</label>
            <input type="number" className="input" value={estimatedPrice} onChange={(e) => setEstimatedPrice(e.target.value)} />
          </div>
        </div>
        {isDirector && (
          <div>
            <label className="label">Менеджер</label>
            <select className="input" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">— не назначен —</option>
              {(managers ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.fullName}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost">Отмена</button>
          <button onClick={submit} disabled={saving} className="btn-primary">
            {saving ? 'Создание…' : 'Создать заказ'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
