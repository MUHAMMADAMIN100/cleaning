import { useMemo, useState } from 'react';
import { Plus, Trash2, MapPin, Truck, CalendarClock } from 'lucide-react';
import { api } from '../api/client';
import { useFetch } from '../api/hooks';
import { Spinner, PageHeader, Modal, EmptyState } from '../components/ui';
import { useToast } from '../components/Toast';
import { DatePicker } from '../components/DatePicker';
import { useAuth } from '../auth/AuthContext';
import { SCHEDULE_LABEL, formatDateTime } from '../lib/labels';
import { tempId } from '../lib/util';
import type { ScheduleEvent, ScheduleType } from '../types';

const TYPE_ICON: Record<ScheduleType, typeof MapPin> = {
  INSPECTION: MapPin,
  CLEANING_VISIT: Truck,
  MEETING: CalendarClock,
};

type Preset = 'upcoming' | 'today' | 'week' | 'month' | 'past' | 'all';
const PRESETS: { key: Preset; label: string }[] = [
  { key: 'upcoming', label: 'Предстоящие' },
  { key: 'today', label: 'Сегодня' },
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: 'past', label: 'Прошедшие' },
  { key: 'all', label: 'Все' },
];
const DAY_MS = 24 * 60 * 60 * 1000;

export function Schedule() {
  const toast = useToast();
  const { user } = useAuth();
  const { data, loading, reload, setData } = useFetch<ScheduleEvent[]>(
    '/schedule',
    { pollMs: 20000 },
  );
  const [showAdd, setShowAdd] = useState(false);
  const [preset, setPreset] = useState<Preset>('upcoming');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const rangeActive = Boolean(from || to);

  // фильтрация на клиенте — мгновенно, без запроса к серверу
  const filtered = useMemo(() => {
    const list = data ?? [];
    let res: ScheduleEvent[];
    if (rangeActive) {
      // диапазон дат приоритетнее пресетов
      const fromMs = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
      const toMs = to ? new Date(`${to}T23:59:59.999`).getTime() : Infinity;
      res = list.filter((e) => {
        const t = new Date(e.date).getTime();
        return t >= fromMs && t <= toMs;
      });
    } else {
      const now = new Date();
      const startToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      ).getTime();
      const endToday = startToday + DAY_MS - 1;
      res = list.filter((e) => {
        const t = new Date(e.date).getTime();
        switch (preset) {
          case 'upcoming':
            return t >= startToday;
          case 'today':
            return t >= startToday && t <= endToday;
          case 'week':
            return t >= startToday && t <= startToday + 7 * DAY_MS;
          case 'month':
            return t >= startToday && t <= startToday + 30 * DAY_MS;
          case 'past':
            return t < startToday;
          default:
            return true;
        }
      });
    }
    // прошедшие — от свежих к старым, остальное — по возрастанию (ближайшие сверху)
    const desc = !rangeActive && preset === 'past';
    return [...res].sort((a, b) => {
      const d = new Date(a.date).getTime() - new Date(b.date).getTime();
      return desc ? -d : d;
    });
  }, [data, preset, from, to, rangeActive]);

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

  // группировка по дате (по отфильтрованному списку)
  const groups = filtered.reduce<Record<string, ScheduleEvent[]>>((acc, e) => {
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

      {/* Фильтр по времени: пресеты + диапазон дат */}
      <div className="mb-5 space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => {
                setPreset(p.key);
                setFrom('');
                setTo('');
              }}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                !rangeActive && preset === p.key
                  ? 'bg-navy-500 text-white'
                  : 'bg-navy-100 text-navy-600 hover:bg-navy-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-navy-400">Диапазон:</span>
          <div className="w-40">
            <DatePicker value={from} onChange={setFrom} placeholder="с даты" />
          </div>
          <span className="text-navy-300">—</span>
          <div className="w-40">
            <DatePicker value={to} onChange={setTo} placeholder="по дату" />
          </div>
          {rangeActive && (
            <button
              onClick={() => {
                setFrom('');
                setTo('');
              }}
              className="text-xs font-medium text-navy-400 underline-offset-2 hover:text-navy-600 hover:underline"
            >
              Сбросить
            </button>
          )}
        </div>
      </div>

      {loading || !data ? (
        <Spinner />
      ) : data.length === 0 ? (
        <EmptyState text="Событий в расписании нет" />
      ) : filtered.length === 0 ? (
        <EmptyState text="Нет событий в выбранном периоде" />
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
  const [day, setDay] = useState('');
  const [time, setTime] = useState('10:00');
  const [note, setNote] = useState('');

  const submit = () => {
    const date = day ? `${day}T${time || '10:00'}` : '';
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Дата *</label>
            <DatePicker value={day} onChange={setDay} />
          </div>
          <div>
            <label className="label">Время</label>
            <input
              type="time"
              className="input [color-scheme:light]"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">Заметка</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost">Отмена</button>
          <button onClick={submit} disabled={!title || !day} className="btn-primary">
            Добавить
          </button>
        </div>
      </div>
    </Modal>
  );
}
