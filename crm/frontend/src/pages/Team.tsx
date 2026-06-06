import { useState } from 'react';
import { Plus, Trash2, UserRound } from 'lucide-react';
import { api } from '../api/client';
import { useFetch } from '../api/hooks';
import { Spinner, PageHeader, Modal, EmptyState, Badge } from '../components/ui';
import { STAGE_COLOR, STAGE_LABEL, formatDateTime } from '../lib/labels';
import type { Cleaner, Order } from '../types';

export function Team() {
  const { data, loading, reload } = useFetch<Cleaner[]>('/cleaners');
  const { data: dayTasks } = useFetch<Order[]>('/cleaners/team-tasks');
  const [showAdd, setShowAdd] = useState(false);

  const remove = async (id: string) => {
    await api.delete(`/cleaners/${id}`);
    reload();
  };

  return (
    <div>
      <PageHeader
        title="Моя команда"
        subtitle="Клинеры и их задания на сегодня"
        action={
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            Добавить клинера
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Список клинеров */}
        <div className="card p-5">
          <h3 className="mb-3 font-bold text-navy-900">Клинеры</h3>
          {loading || !data ? (
            <Spinner />
          ) : data.length === 0 ? (
            <EmptyState text="Клинеров нет" />
          ) : (
            <div className="space-y-2">
              {data.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl border border-navy-100 p-3"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100 text-navy-700">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-navy-900">{c.fullName}</div>
                    <div className="text-xs text-navy-400">
                      {c.phone || 'телефон не указан'}
                      {c.manager && ` · ${c.manager.fullName}`}
                    </div>
                  </div>
                  <button
                    onClick={() => remove(c.id)}
                    className="rounded-lg p-2 text-navy-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Задания на день */}
        <div className="card p-5">
          <h3 className="mb-3 font-bold text-navy-900">Задания на сегодня</h3>
          {!dayTasks || dayTasks.length === 0 ? (
            <EmptyState text="На сегодня выездов нет" />
          ) : (
            <div className="space-y-2">
              {dayTasks.map((o) => (
                <div key={o.id} className="rounded-xl border border-navy-100 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-navy-900">
                      {o.client?.fullName}
                    </span>
                    <Badge className={STAGE_COLOR[o.stage]}>
                      {STAGE_LABEL[o.stage]}
                    </Badge>
                  </div>
                  <div className="text-xs text-navy-400">
                    {o.area} м² · {formatDateTime(o.scheduledDate)} · {o.address || 'адрес не указан'}
                  </div>
                  {o.cleaners && o.cleaners.length > 0 && (
                    <div className="mt-1 text-xs text-navy-500">
                      Команда: {o.cleaners.map((c) => c.fullName).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <AddCleanerModal
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            reload();
          }}
        />
      )}
    </div>
  );
}

function AddCleanerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await api.post('/cleaners', { fullName, phone: phone || undefined });
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Новый клинер">
      <div className="space-y-3">
        <div>
          <label className="label">ФИО *</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label">Телефон</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost">Отмена</button>
          <button onClick={submit} disabled={saving || !fullName} className="btn-primary">
            {saving ? 'Сохранение…' : 'Добавить'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
