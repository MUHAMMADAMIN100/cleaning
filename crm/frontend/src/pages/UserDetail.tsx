import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  UserRound,
  Phone,
  Users,
  Loader,
  CheckCircle2,
  UsersRound,
  CheckSquare,
} from 'lucide-react';
import { useFetch } from '../api/hooks';
import { Spinner, PageHeader, Badge } from '../components/ui';
import { formatDate } from '../lib/labels';
import type { Role } from '../types';

interface UserDetailData {
  id: string;
  login: string;
  fullName: string;
  role: Role;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  stats: {
    clients: number;
    ordersActive: number;
    ordersPaid: number;
    cleaners: number;
    tasksOpen: number;
  };
}

export function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useFetch<UserDetailData>(`/users/${id}`, {
    deps: [id],
  });

  if (loading) return <Spinner />;
  if (error || !data) {
    return (
      <div>
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800"
        >
          <ArrowLeft className="h-4 w-4" /> Назад
        </button>
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error || 'Профиль не найден'}
        </div>
      </div>
    );
  }

  const isDirector = data.role === 'DIRECTOR';
  const stats = [
    { label: 'Клиентов', value: data.stats.clients, icon: Users, color: 'bg-navy-100 text-navy-700' },
    { label: 'Активные заказы', value: data.stats.ordersActive, icon: Loader, color: 'bg-indigo-100 text-indigo-700' },
    { label: 'Завершено', value: data.stats.ordersPaid, icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
    { label: 'Клинеров', value: data.stats.cleaners, icon: UsersRound, color: 'bg-amber-100 text-amber-700' },
    { label: 'Открытых задач', value: data.stats.tasksOpen, icon: CheckSquare, color: 'bg-blue-100 text-blue-700' },
  ];

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" /> Назад
      </button>

      <PageHeader title="Профиль сотрудника" />

      <div className="card mb-5 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <span
            className={`flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold ${
              isDirector ? 'bg-navy-500 text-white' : 'bg-navy-100 text-navy-700'
            }`}
          >
            {isDirector ? (
              <ShieldCheck className="h-8 w-8" />
            ) : (
              <UserRound className="h-8 w-8" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xl font-bold text-navy-900">
              {data.fullName}
            </div>
            <div className="text-sm text-navy-400">@{data.login}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge
                className={
                  isDirector
                    ? 'bg-navy-100 text-navy-700'
                    : 'bg-blue-100 text-blue-700'
                }
              >
                {isDirector ? 'Руководитель' : 'Менеджер'}
              </Badge>
              <Badge
                className={
                  data.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-navy-100 text-navy-500'
                }
              >
                {data.isActive ? '● Активен' : '○ Отключён'}
              </Badge>
            </div>
          </div>
        </div>

        <dl className="mt-6 grid gap-x-8 gap-y-3 border-t border-navy-100 pt-5 text-sm sm:grid-cols-2">
          <div className="flex items-center justify-between">
            <dt className="text-navy-400">Телефон</dt>
            <dd className="flex items-center gap-1.5 font-medium text-navy-800">
              <Phone className="h-4 w-4 text-navy-400" />
              {data.phone || '—'}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-navy-400">В системе с</dt>
            <dd className="font-medium text-navy-800">
              {formatDate(data.createdAt)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.color}`}
            >
              <s.icon className="h-5 w-5" />
            </span>
            <div className="mt-3 text-2xl font-extrabold text-navy-900">
              {s.value}
            </div>
            <div className="text-sm text-navy-500">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
