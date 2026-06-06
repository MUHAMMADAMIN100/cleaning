import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFetch } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { Spinner, PageHeader } from '../components/ui';
import { formatPrice } from '../lib/labels';
import type { Analytics as AnalyticsData } from '../types';

const COLORS = ['#16297a', '#2e54c4', '#5376d6', '#7e98e0', '#a9bbeb'];

export function Analytics() {
  const { user } = useAuth();
  const isDirector = user?.role === 'DIRECTOR';
  const { data, loading } = useFetch<AnalyticsData>('/analytics/full');

  if (loading || !data) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Аналитика и отчёты"
        subtitle={isDirector ? 'Полная аналитика компании' : 'Аналитика по вашим заказам'}
      />

      {/* Доходы по периодам — только руководителю */}
      {isDirector && data.revenue && (
        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['За день', data.revenue.day],
            ['За неделю', data.revenue.week],
            ['За месяц', data.revenue.month],
            ['За квартал', data.revenue.quarter],
          ].map(([label, val]) => (
            <div key={label as string} className="card p-5">
              <div className="text-sm text-navy-500">{label}</div>
              <div className="mt-1 text-2xl font-extrabold text-navy-900">
                {formatPrice(val as number)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Конверсия */}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="text-sm text-navy-500">Конверсия в заказы</div>
          <div className="mt-1 text-3xl font-extrabold text-green-600">
            {data.conversion.rate}%
          </div>
          <div className="text-xs text-navy-400">
            {data.conversion.paid} оплачено из {data.conversion.total}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-navy-500">Всего обращений</div>
          <div className="mt-1 text-3xl font-extrabold text-navy-900">
            {data.conversion.total}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-navy-500">Отказы</div>
          <div className="mt-1 text-3xl font-extrabold text-red-500">
            {data.conversion.rejected}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Доход по дням */}
        {isDirector && data.revenueSeries && (
          <div className="card p-5 lg:col-span-2">
            <h3 className="mb-4 font-bold text-navy-900">Доход за 14 дней</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.revenueSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2fb" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#7e98e0' }} />
                <YAxis tick={{ fontSize: 12, fill: '#7e98e0' }} />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Bar dataKey="revenue" fill="#2e54c4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Заказы по типам уборки */}
        <div className="card p-5">
          <h3 className="mb-4 font-bold text-navy-900">Заказы по типам уборки</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.byType}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2fb" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#7e98e0' }} />
              <YAxis tick={{ fontSize: 12, fill: '#7e98e0' }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#16297a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Источники заявок */}
        <div className="card p-5">
          <h3 className="mb-4 font-bold text-navy-900">Источники заявок</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data.sources}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={(e: any) => e.label}
              >
                {data.sources.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Загрузка менеджеров — только руководителю */}
        {isDirector && data.managerWorkload && (
          <div className="card p-5 lg:col-span-2">
            <h3 className="mb-4 font-bold text-navy-900">Загруженность менеджеров</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.managerWorkload}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2fb" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#7e98e0' }} />
                <YAxis tick={{ fontSize: 12, fill: '#7e98e0' }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="active" name="Активные заказы" fill="#2e54c4" radius={[6, 6, 0, 0]} />
                <Bar dataKey="paid" name="Завершено" fill="#7e98e0" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
