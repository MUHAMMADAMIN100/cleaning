import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { useFetch } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { Spinner, PageHeader, Badge, Modal, EmptyState } from '../components/ui';
import { useToast } from '../components/Toast';
import {
  PRIORITY_LABEL,
  PRIORITY_COLOR,
  TASK_STATUS_LABEL,
  formatDate,
} from '../lib/labels';
import { tempId, nowISO } from '../lib/util';
import type { Manager, Task, TaskPriority, TaskStatus } from '../types';

const STATUSES: TaskStatus[] = ['OPEN', 'IN_PROGRESS', 'DONE'];

export function Tasks() {
  const { user } = useAuth();
  const toast = useToast();
  const isDirector = user?.role === 'DIRECTOR';
  const { data, loading, reload, setData } = useFetch<Task[]>('/tasks', {
    pollMs: 20000,
  });
  const [showAdd, setShowAdd] = useState(false);

  // оптимистично: меняем статус сразу, запрос в фоне
  const setStatus = async (id: string, status: TaskStatus) => {
    setData((tasks) =>
      tasks ? tasks.map((t) => (t.id === id ? { ...t, status } : t)) : tasks,
    );
    try {
      await api.patch(`/tasks/${id}/status`, { status });
    } catch {
      toast.error('Не удалось изменить статус задачи');
      reload();
    }
  };

  // оптимистично: убираем задачу сразу
  const remove = async (id: string) => {
    setData((tasks) => (tasks ? tasks.filter((t) => t.id !== id) : tasks));
    try {
      await api.delete(`/tasks/${id}`);
    } catch {
      toast.error('Не удалось удалить задачу');
      reload();
    }
  };

  // оптимистично: задача появляется в списке сразу
  const createTask = (
    payload: {
      title: string;
      description?: string;
      assigneeId: string;
      priority: TaskPriority;
      deadline?: string;
    },
    assigneeName: string,
  ) => {
    const id = tempId();
    const optimistic: Task = {
      id,
      title: payload.title,
      description: payload.description,
      priority: payload.priority,
      status: 'OPEN',
      deadline: payload.deadline || null,
      assigneeId: payload.assigneeId,
      creatorId: user?.id ?? '',
      assignee: { id: payload.assigneeId, fullName: assigneeName },
      creator: { id: user?.id ?? '', fullName: user?.fullName ?? '' },
      createdAt: nowISO(),
    };
    setData((t) => (t ? [optimistic, ...t] : [optimistic]));
    api
      .post('/tasks', payload)
      .then(() => reload())
      .catch((e) => {
        toast.error(e?.response?.data?.message || 'Не удалось создать задачу');
        setData((t) => (t ? t.filter((x) => x.id !== id) : t));
      });
  };

  return (
    <div>
      <PageHeader
        title="Задачи"
        subtitle={isDirector ? 'Постановка задач менеджерам' : 'Задачи от руководителя'}
        action={
          isDirector && (
            <button onClick={() => setShowAdd(true)} className="btn-primary">
              <Plus className="h-4 w-4" />
              Новая задача
            </button>
          )
        }
      />

      {loading || !data ? (
        <Spinner />
      ) : data.length === 0 ? (
        <EmptyState text="Задач нет" />
      ) : (
        <div className="space-y-3">
          {data.map((t) => (
            <div key={t.id} className="card flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-navy-900">{t.title}</span>
                  <Badge className={PRIORITY_COLOR[t.priority]}>
                    {PRIORITY_LABEL[t.priority]}
                  </Badge>
                </div>
                {t.description && (
                  <p className="mt-1 text-sm text-navy-500">{t.description}</p>
                )}
                <div className="mt-1 text-xs text-navy-400">
                  Исполнитель: {t.assignee.fullName}
                  {t.deadline && ` · дедлайн ${formatDate(t.deadline)}`}
                </div>
              </div>

              <select
                className="input max-w-[160px]"
                value={t.status}
                onChange={(e) => setStatus(t.id, e.target.value as TaskStatus)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>
                ))}
              </select>

              {isDirector && (
                <button
                  onClick={() => remove(t.id)}
                  className="rounded-lg p-2 text-navy-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddTaskModal
          onClose={() => setShowAdd(false)}
          onCreate={createTask}
        />
      )}
    </div>
  );
}

function AddTaskModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (
    payload: {
      title: string;
      description?: string;
      assigneeId: string;
      priority: TaskPriority;
      deadline?: string;
    },
    assigneeName: string,
  ) => void;
}) {
  const { data: managers } = useFetch<Manager[]>('/users/managers');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [deadline, setDeadline] = useState('');

  const submit = () => {
    const assigneeName =
      (managers ?? []).find((m) => m.id === assigneeId)?.fullName ?? '';
    onCreate(
      {
        title,
        description: description || undefined,
        assigneeId,
        priority,
        deadline: deadline || undefined,
      },
      assigneeName,
    );
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Новая задача">
      <div className="space-y-3">
        <div>
          <label className="label">Название *</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">Описание</label>
          <textarea className="input min-h-[80px] resize-none" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label">Исполнитель *</label>
          <select className="input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">— выберите менеджера —</option>
            {(managers ?? []).map((m) => (
              <option key={m.id} value={m.id}>{m.fullName}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Приоритет</label>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              <option value="LOW">Низкий</option>
              <option value="MEDIUM">Средний</option>
              <option value="HIGH">Высокий</option>
            </select>
          </div>
          <div>
            <label className="label">Дедлайн</label>
            <input type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost">Отмена</button>
          <button onClick={submit} disabled={!title || !assigneeId} className="btn-primary">
            Поставить задачу
          </button>
        </div>
      </div>
    </Modal>
  );
}
