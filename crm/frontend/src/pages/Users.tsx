import { useState } from 'react';
import { Plus, ShieldCheck, UserRound } from 'lucide-react';
import { api } from '../api/client';
import { useFetch } from '../api/hooks';
import { Spinner, PageHeader, Badge, Modal, PasswordInput } from '../components/ui';
import type { Manager, Role } from '../types';

export function UsersPage() {
  const { data, loading, reload } = useFetch<Manager[]>('/users');
  const [showAdd, setShowAdd] = useState(false);

  const toggleActive = async (id: string, isActive: boolean) => {
    await api.patch(`/users/${id}/active`, { isActive });
    reload();
  };

  return (
    <div>
      <PageHeader
        title="Сотрудники"
        subtitle="Руководители и менеджеры системы"
        action={
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            Добавить сотрудника
          </button>
        }
      />

      {loading || !data ? (
        <Spinner />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((u) => (
            <div key={u.id} className="card p-5">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    u.role === 'DIRECTOR'
                      ? 'bg-navy-800 text-white'
                      : 'bg-navy-100 text-navy-700'
                  }`}
                >
                  {u.role === 'DIRECTOR' ? (
                    <ShieldCheck className="h-5 w-5" />
                  ) : (
                    <UserRound className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-navy-900">{u.fullName}</div>
                  <div className="text-xs text-navy-400">@{u.login}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Badge
                  className={
                    u.role === 'DIRECTOR'
                      ? 'bg-navy-100 text-navy-700'
                      : 'bg-blue-100 text-blue-700'
                  }
                >
                  {u.role === 'DIRECTOR' ? 'Руководитель' : 'Менеджер'}
                </Badge>
                <button
                  onClick={() => toggleActive(u.id, !u.isActive)}
                  className={`text-xs font-semibold ${
                    u.isActive ? 'text-green-600' : 'text-navy-400'
                  }`}
                >
                  {u.isActive ? '● Активен' : '○ Отключён'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddUserModal
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

function AddUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('MANAGER');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post('/users', { fullName, login, password, role });
      onCreated();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Новый сотрудник">
      <div className="space-y-3">
        <div>
          <label className="label">ФИО *</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label">Логин *</label>
          <input className="input" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="например, manager3" />
        </div>
        <div>
          <label className="label">Пароль * (мин. 4 символа)</label>
          <PasswordInput value={password} onChange={setPassword} placeholder="••••••••" />
        </div>
        <div>
          <label className="label">Роль</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="MANAGER">Менеджер</option>
            <option value="DIRECTOR">Руководитель</option>
          </select>
        </div>
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost">Отмена</button>
          <button
            onClick={submit}
            disabled={saving || !fullName || !login || password.length < 4}
            className="btn-primary"
          >
            {saving ? 'Создание…' : 'Создать'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
