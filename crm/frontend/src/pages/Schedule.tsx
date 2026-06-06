import { useState } from 'react';
import { Plus, Trash2, MapPin, Truck, CalendarClock } from 'lucide-react';
import { api } from '../api/client';
import { useFetch } from '../api/hooks';
import { Spinner, PageHeader, Modal, EmptyState } from '../components/ui';
import { useToast } from '../components/Toast';
import { useAuth } from '../auth/AuthContext';
import { SCHEDULE_LABEL, formatDateTime } from '../lib/labels';
import { tempId } from '../lib/util';
import type { ScheduleEvent, ScheduleType } from '../types';

const TYPE_ICON: Record<ScheduleType, typeof MapPin> = {
  INSPECTION: MapPin,
  CLEANING_VISIT: Truck,
  MEETING: CalendarClock,
};

export function Schedule() {
  const toast = useToast();
  const { user } = useAuth();
  const { data, loading, reload, setData } = useFetch<ScheduleEvent[]>(
    '/schedule',
    { pollMs: 20000 },
  );
  const [showAdd, setShowAdd] = useState(false);

  const remove = async (id: string) => {
    setData((ev) => (ev ? ev.filter((e) => e.id !== id) : ev));
    try {
      await api.delete(`/schedule/${id}`);
    } catch {
      toast.error('Не удалось удалить событие');
      reload();
    }
  };

  // оптимистично: событие появляется сразу
  const createEvent = (payload: {
    title: string;
    type: ScheduleType;
    date: string;
    note?: string;
  }) => {
    const id = tempId();
    const optimistic: ScheduleEvent = {
      id,
      title: payload.title,
      type: payload.type,
      date: new Date(payload.date).toISOString(),
      note: payload.note,
      managerId: user?.id ?? '',
      manager: user ? { id: user.id, fullName: user.fullName } : undefined,
    };
    setData((ev) => (ev ? [...ev, optimistic] : [optimistic]));
    api
      .post('/schedule', payload)
      .then(() => reload())
      .catch((e) => {
        toast.error(e?.response?.data?.message || 'Не удалось создать событие');
        setData((ev) => (ev ? ev.filter((x) => x.id !== id) : ev));
      });
  };

  // группировка по дате
  const groups = (data ?? []).reduce<Record<string, ScheduleEvent[]>>((acc, e) => {
    const key = new Date(e.date).toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
    (acc[key] ||= []).push(e);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Расписание"
        subtitle="Осмотры объектов, выезды команды и встречи"
        action={
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            Добавить
          </button>
        }
      />

      {loading || !data ? (
        <Spinner />
      ) : data.length === 0 ? (
        <EmptyState text="Событий в расписании нет" />
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([day, events]) => (
            <div key={day}>
              <h3 className="mb-2 text-sm font-bold capitalize text-navy-500">
                {day}
              </h3>
              <div className="space-y-2">
                {events.map((e) => {
                  const Icon = TYPE_ICON[e.type];
                  return (
                    <div key={e.id} className="card flex items-center gap-4 p-4">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-100 text-navy-700">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-navy-900">{e.title}</div>
                        <div className="text-xs text-navy-400">
                          {SCHEDULE_LABEL[e.type]} · {formatDateTime(e.date)}
                          {e.manager && ` · ${e.manager.fullName}`}
                        </div>
                        {e.note && (
                          <div className="mt-0.5 text-sm text-navy-500">{e.note}</div>
                        )}
                      </div>
                      <button
                        onClick={() => remove(e.id)}
                        className="rounded-lg p-2 text-navy-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddEventModal
          onClose={() => setShowAdd(false)}
          onCreate={createEvent}
        />
      )}
    </div>
  );
}

function AddEventModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (payload: {
    title: string;
    type: ScheduleType;
    date: string;
    note?: string;
  }) => void;
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ScheduleType>('INSPECTION');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');

  const submit = () => {
    onCreate({ title, type, date, note: note || undefined });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Новое событие">
      <div className="space-y-3">
        <div>
          <label className="label">Название *</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">Тип</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as ScheduleType)}>
            <option value="INSPECTION">Осмотр объекта</option>
            <option value="CLEANING_VISIT">Выезд команды</option>
            <option value="MEETING">Встреча</option>
          </select>
        </div>
        <div>
          <label className="label">Дата и время *</label>
          <input type="datetime-local" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Заметка</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost">Отмена</button>
          <button onClick={submit} disabled={!title || !date} className="btn-primary">
            Добавить
          </button>
        </div>
      </div>
    </Modal>
  );
}
