import { useState } from 'react';
import { Plus, Trash2, UserRound, Users as UsersIcon } from 'lucide-react';
import { api } from '../api/client';
import { useFetch } from '../api/hooks';
import { useToast } from '../components/Toast';
import { useAuth } from '../auth/AuthContext';
import { Spinner, PageHeader, Modal, EmptyState, Badge } from '../components/ui';
import { STAGE_COLOR, STAGE_LABEL, formatDateTime } from '../lib/labels';
import { tempId } from '../lib/util';
import type { Cleaner, Order } from '../types';

export function Team() {
  const toast = useToast();
  const { user } = useAuth();
  const isDirector = user?.role === 'DIRECTOR';
  const { data, loading, reload, setData } = useFetch<Cleaner[]>('/cleaners', {
    pollMs: 20000,
  });
  const { data: dayTasks } = useFetch<Order[]>('/cleaners/team-tasks', {
    pollMs: 20000,
  });
  const [showAdd, setShowAdd] = useState(false);

  const remove = async (id: string) => {
    setData((cl) => (cl ? cl.filter((c) => c.id !== id) : cl));
    try {
      await api.delete(`/cleaners/${id}`);
    } catch {
      toast.error('Не удалось удалить клинера');
      reload();
    }
  };

  const createCleaner = (payload: { fullName: string; phone?: string }) => {
    const id = tempId();
    const optimistic: Cleaner = {
      id,
      fullName: payload.fullName,
      phone: payload.phone,
      isActive: true,
      managerId: user?.id,
      manager: user ? { id: user.id, fullName: user.fullName } : null,
    };
    setData((cl) => (cl ? [...cl, optimistic] : [optimistic]));
    api
      .post('/cleaners', payload)
      .then(() => reload())
      .catch((e) => {
        toast.error(e?.response?.data?.message || 'Не удалось добавить клинера');
        setData((cl) => (cl ? cl.filter((c) => c.id !== id) : cl));
      });
  };

  if (loading || !data) return <Spinner />;

  return (
    <div>
      <PageHeader
        title={isDirector ? 'Команды' : 'Моя команда'}
        subtitle={
          isDirector
            ? 'Команды всех менеджеров и их работа на сегодня'
            : 'Клинеры и их задания на сегодня'
        }
        action={
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            Добавить клинера
          </button>
        }
      />

      {isDirector ? (
        <DirectorTeams cleaners={data} jobs={dayTasks ?? []} onRemove={remove} />
      ) : (
        <ManagerTeam cleaners={data} jobs={dayTasks ?? []} onRemove={remove} />
      )}

      {showAdd && (
        <AddCleanerModal
          onClose={() => setShowAdd(false)}
          onCreate={createCleaner}
        />
      )}
    </div>
  );
}

/** Вид руководителя — команды сгруппированы по менеджерам */
function DirectorTeams({
  cleaners,
  jobs,
  onRemove,
}: {
  cleaners: Cleaner[];
  jobs: Order[];
  onRemove: (id: string) => void;
}) {
  const groups = new Map<
    string,
    { name: string; cleaners: Cleaner[]; jobs: Order[] }
  >();
  const ensure = (id: string, name: string) => {
    if (!groups.has(id)) groups.set(id, { name, cleaners: [], jobs: [] });
    return groups.get(id)!;
  };
  cleaners.forEach((c) =>
    ensure(c.manager?.id ?? c.managerId ?? 'none', c.manager?.fullName ?? 'Без менеджера').cleaners.push(c),
  );
  jobs.forEach((o) =>
    ensure(o.manager?.id ?? 'none', o.manager?.fullName ?? 'Без менеджера').jobs.push(o),
  );

  const list = [...groups.entries()];
  if (list.length === 0) return <EmptyState text="Команд пока нет" />;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {list.map(([id, g]) => (
        <div key={id} className="card p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-100 text-navy-700">
              <UsersIcon className="h-5 w-5" />
            </span>
            <div>
              <div className="font-bold text-navy-900">{g.name}</div>
              <div className="text-xs text-navy-400">
                {g.cleaners.length} клинер(ов) · {g.jobs.length} выезд(ов) сегодня
              </div>
            </div>
          </div>

          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
            Клинеры
          </div>
          <div className="space-y-2">
            {g.cleaners.length === 0 && (
              <div className="text-sm text-navy-400">Нет клинеров</div>
            )}
            {g.cleaners.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-navy-100 p-2.5"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-100 text-navy-700">
                  <UserRound className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-navy-900">
                    {c.fullName}
                  </div>
                  <div className="text-xs text-navy-400">
                    {c.phone || 'телефон не указан'}
                  </div>
                </div>
                <button
                  onClick={() => onRemove(c.id)}
                  className="rounded-lg p-1.5 text-navy-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {g.jobs.length > 0 && (
            <>
              <div className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-navy-400">
                Заняты сегодня
              </div>
              <div className="space-y-2">
                {g.jobs.map((o) => (
                  <div
                    key={o.id}
                    className="rounded-xl border border-navy-100 p-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-navy-900">
                        {o.client?.fullName}
                      </span>
                      <Badge className={STAGE_COLOR[o.stage]}>
                        {STAGE_LABEL[o.stage]}
                      </Badge>
                    </div>
                    <div className="text-xs text-navy-400">
                      {o.area} м² · {formatDateTime(o.scheduledDate)}
                      {o.cleaners && o.cleaners.length > 0 &&
                        ` · ${o.cleaners.map((x) => x.fullName).join(', ')}`}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/** Вид менеджера — своя команда */
function ManagerTeam({
  cleaners,
  jobs,
  onRemove,
}: {
  cleaners: Cleaner[];
  jobs: Order[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card p-5">
        <h3 className="mb-3 font-bold text-navy-900">Клинеры</h3>
        {cleaners.length === 0 ? (
          <EmptyState text="Клинеров нет" />
        ) : (
          <div className="space-y-2">
            {cleaners.map((c) => (
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
                  </div>
                </div>
                <button
                  onClick={() => onRemove(c.id)}
                  className="rounded-lg p-2 text-navy-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h3 className="mb-3 font-bold text-navy-900">Задания на сегодня</h3>
        {jobs.length === 0 ? (
          <EmptyState text="На сегодня выездов нет" />
        ) : (
          <div className="space-y-2">
            {jobs.map((o) => (
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
                  {o.area} м² · {formatDateTime(o.scheduledDate)} ·{' '}
                  {o.address || 'адрес не указан'}
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
  );
}

function AddCleanerModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (payload: { fullName: string; phone?: string }) => void;
}) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const submit = () => {
    onCreate({ fullName, phone: phone || undefined });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Новый клинер">
      <div className="space-y-3">
        <div>
          <label className="label">ФИО *</label>
          <input
            className="input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Телефон</label>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost">
            Отмена
          </button>
          <button onClick={submit} disabled={!fullName} className="btn-primary">
            Добавить
          </button>
        </div>
      </div>
    </Modal>
  );
}
