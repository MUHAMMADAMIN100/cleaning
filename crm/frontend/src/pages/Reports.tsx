import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, ChevronRight, Send, CheckCircle2 } from 'lucide-react';
import { useFetch } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { Spinner, PageHeader, Badge, EmptyState } from '../components/ui';
import {
  REPORT_STATUS_LABEL,
  REPORT_STATUS_COLOR,
  formatPrice,
  formatDate,
} from '../lib/labels';
import type { Report } from '../types';

/** Сумма выплат работникам по ведомости */
export function workersTotal(r: Report): number {
  return r.workers.reduce(
    (s, w) => s + w.days * w.rate - w.fine + w.extra,
    0,
  );
}

/** Сумма доп. расходов по ведомости */
export function expensesTotal(r: Report): number {
  return r.expenses.reduce((s, e) => s + e.amount, 0);
}

export function Reports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDirector = user?.role === 'DIRECTOR';
  const { data, loading } = useFetch<Report[]>('/reports', { pollMs: 20000 });

  if (loading || !data) return <Spinner />;

  const waiting = isDirector ? data.filter((r) => r.status === 'SENT').length : 0;

  return (
    <div>
      <PageHeader
        title="Отчёты"
        subtitle={
          isDirector
            ? waiting > 0
              ? `Платёжные ведомости по объектам · ${waiting} ожидает принятия`
              : 'Платёжные ведомости по объектам'
            : 'Платёжные ведомости по объектам — отправляются основателю'
        }
        action={
          <button onClick={() => navigate('/reports/new')} className="btn-primary">
            <Plus className="h-4 w-4" />
            Новый отчёт
          </button>
        }
      />

      {data.length === 0 ? (
        <EmptyState text="Отчётов пока нет — создайте первый по кнопке «Новый отчёт»" />
      ) : (
        <div className="space-y-3">
          {data.map((r) => (
            <Link
              key={r.id}
              to={`/reports/${r.id}`}
              className="card flex flex-wrap items-center gap-4 p-4 transition-shadow hover:shadow-lg"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  r.status === 'ACCEPTED'
                    ? 'bg-green-100 text-green-700'
                    : r.status === 'SENT'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-navy-100 text-navy-600'
                }`}
              >
                {r.status === 'ACCEPTED' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : r.status === 'SENT' ? (
                  <Send className="h-5 w-5" />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-navy-900">
                    {r.clientName}
                  </span>
                  <Badge className={REPORT_STATUS_COLOR[r.status]}>
                    {REPORT_STATUS_LABEL[r.status]}
                  </Badge>
                </div>
                <div className="mt-0.5 text-xs text-navy-400">
                  {r.workDate ? formatDate(r.workDate) : formatDate(r.createdAt)}
                  {r.address && ` · ${r.address}`}
                  {isDirector && r.managerName && ` · ${r.managerName}`}
                </div>
              </div>

              <div className="text-right text-sm">
                <div className="font-bold text-navy-900">
                  {formatPrice(r.totalPrice)}
                </div>
                <div className="text-xs text-navy-400">
                  выплаты {formatPrice(workersTotal(r))}
                  {expensesTotal(r) > 0 && ` · расходы ${formatPrice(expensesTotal(r))}`}
                </div>
              </div>

              <ChevronRight className="h-4 w-4 shrink-0 text-navy-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
