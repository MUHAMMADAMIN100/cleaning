import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Wallet,
  AlertTriangle,
  Trash2,
  Plus,
  Save,
  Check,
  Star,
} from 'lucide-react';
import { api } from '../api/client';
import { useFetch } from '../api/hooks';
import { Spinner, PageHeader, Modal, EmptyState } from '../components/ui';
import { useToast } from '../components/Toast';
import { useDialog } from '../components/Dialog';
import { DatePicker } from '../components/DatePicker';
import { formatPrice, formatDate } from '../lib/labels';
import { withRetry } from '../lib/util';
import type { Brigade, Cleaner, Fine, PayrollSummary, Shift } from '../types';

/** Локальная дата в «YYYY-MM-DD» (без сдвига часового пояса) */
function toISODate(d: Date): string {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function monthRange(base: Date): { from: string; to: string; label: string } {
  const from = new Date(base.getFullYear(), base.getMonth(), 1);
  const to = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  const label = base.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });
  return { from: toISODate(from), to: toISODate(to), label };
}

export function Shifts() {
  return (
    <div>
      <PageHeader
        title="Смены и выплаты"
        subtitle="Отмечайте смены клинеров по датам — выплаты считаются автоматически (смены × ставка − штрафы)"
      />
      <DayMarking />
      <PayrollSection />
    </div>
  );
}

/** ── Блок 1: отметка смен за день ── */
function DayMarking() {
  const toast = useToast();
  const [date, setDate] = useState(() => toISODate(new Date()));
  const { data: brigades } = useFetch<Brigade[]>('/brigades');
  const { data: cleaners } = useFetch<Cleaner[]>('/cleaners');
  const {
    data: dayShifts,
    loading,
    reload,
  } = useFetch<Shift[]>(`/payroll/shifts?from=${date}&to=${date}`, {
    deps: [date],
  });

  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Галочки заполняем с сервера ОДИН раз на дату (и после сохранения) —
  // фоновые обновления не должны затирать несохранённые отметки.
  // baseline — что именно видел пользователь: сервер удалит только эти смены.
  const syncedFor = useRef<string | null>(null);
  const baselineRef = useRef<string[]>([]);
  useEffect(() => {
    syncedFor.current = null;
  }, [date]);
  useEffect(() => {
    if (dayShifts && syncedFor.current !== date) {
      const ids = dayShifts.map((s) => s.cleanerId);
      setChecked(new Set(ids));
      baselineRef.current = ids;
      syncedFor.current = date;
    }
  }, [dayShifts, date]);

  const serverIds = useMemo(
    () => new Set((dayShifts ?? []).map((s) => s.cleanerId)),
    [dayShifts],
  );
  const dirty =
    checked.size !== serverIds.size ||
    [...checked].some((id) => !serverIds.has(id));

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      await withRetry(() =>
        api.post('/payroll/shifts/day', {
          date,
          cleanerIds: [...checked],
          baseline: baselineRef.current,
        }),
      );
      toast.success('Смены сохранены');
      syncedFor.current = null; // после сохранения принять свежее состояние сервера
      reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Не удалось сохранить смены');
    } finally {
      setSaving(false);
    }
  };

  const unassigned = (cleaners ?? []).filter((c) => !c.brigadeId && c.isActive);
  const groups: { title: string; leaderId?: string | null; list: Cleaner[] }[] = [
    ...(brigades ?? []).map((b) => ({
      title: b.name,
      leaderId: b.leaderId,
      list: b.cleaners.filter((c) => c.isActive) as Cleaner[],
    })),
    ...(unassigned.length > 0
      ? [{ title: 'Без бригады', leaderId: null, list: unassigned }]
      : []),
  ];

  return (
    <div className="card mb-6 p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-100 text-navy-700">
            <CalendarCheck className="h-5 w-5" />
          </span>
          <div>
            <div className="font-bold text-navy-900">Отметка смен</div>
            <div className="text-xs text-navy-400">
              Кто вышел на работу в этот день
            </div>
          </div>
        </div>
        <div className="w-full max-w-[220px]">
          <DatePicker value={date} onChange={setDate} />
        </div>
      </div>

      {loading && !dayShifts ? (
        <Spinner />
      ) : groups.length === 0 ? (
        <EmptyState text="Добавьте клинеров в разделе «Команда»" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((g) => {
            const allOn =
              g.list.length > 0 && g.list.every((c) => checked.has(c.id));
            return (
              <div key={g.title} className="rounded-2xl border border-navy-100 p-3.5">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-sm font-bold text-navy-900">{g.title}</span>
                  {g.list.length > 0 && (
                    <button
                      onClick={() =>
                        setChecked((prev) => {
                          const next = new Set(prev);
                          g.list.forEach((c) =>
                            allOn ? next.delete(c.id) : next.add(c.id),
                          );
                          return next;
                        })
                      }
                      className="text-xs font-medium text-navy-500 hover:text-navy-800"
                    >
                      {allOn ? 'Снять всех' : 'Отметить всех'}
                    </button>
                  )}
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {g.list.map((c) => {
                    const on = checked.has(c.id);
                    const isLeader = c.id === g.leaderId;
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggle(c.id)}
                        className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-sm transition ${
                          on
                            ? 'border-navy-500 bg-navy-50 ring-1 ring-navy-200'
                            : 'border-navy-100 bg-white hover:border-navy-300'
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                            on
                              ? 'border-navy-500 bg-navy-500 text-white'
                              : 'border-navy-300 text-transparent'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium text-navy-900">
                          {c.fullName}
                          {isLeader && (
                            <Star className="ml-1 inline h-3 w-3 text-amber-500" />
                          )}
                        </span>
                        <span className="shrink-0 text-xs text-navy-400">
                          {c.rate} с
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-sm text-navy-500">
          Отмечено: <b className="text-navy-900">{checked.size}</b> ·{' '}
          {formatPrice(
            [...checked].reduce((sum, id) => {
              const c = (cleaners ?? []).find((x) => x.id === id);
              return sum + (c?.rate ?? 0);
            }, 0),
          )}{' '}
          за день
        </div>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className={dirty ? 'btn-primary' : 'btn-ghost !text-navy-400'}
        >
          {dirty ? (
            <>
              <Save className="h-4 w-4" />
              {saving ? 'Сохранение…' : 'Сохранить смены'}
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Сохранено
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/** ── Блок 2: выплаты за месяц + штрафы ── */
function PayrollSection() {
  const toast = useToast();
  const dialog = useDialog();
  const [month, setMonth] = useState(() => new Date());
  const { from, to, label } = useMemo(() => monthRange(month), [month]);

  const {
    data: payroll,
    loading,
    reload: reloadPayroll,
  } = useFetch<PayrollSummary>(`/payroll?from=${from}&to=${to}`, {
    deps: [from, to],
  });
  const { data: fines, reload: reloadFines } = useFetch<Fine[]>(
    `/payroll/fines?from=${from}&to=${to}`,
    { deps: [from, to] },
  );
  const { data: cleaners } = useFetch<Cleaner[]>('/cleaners');

  const [fineFor, setFineFor] = useState<string | 'any' | null>(null);

  const reload = () => {
    reloadPayroll();
    reloadFines();
  };

  const removeFine = async (f: Fine) => {
    const ok = await dialog.confirm({
      title: 'Удалить штраф?',
      message: `Штраф ${formatPrice(f.amount)} (${f.reason}) будет удалён.`,
      confirmText: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    try {
      await withRetry(() => api.delete(`/payroll/fines/${f.id}`));
      toast.success('Штраф удалён');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Не удалось удалить штраф');
    }
    reload();
  };

  const shiftMonth = (delta: number) =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const rows = (payroll?.rows ?? []).filter(
    (r) => r.shifts > 0 || r.fines > 0,
  );
  const idle = (payroll?.rows ?? []).filter(
    (r) => r.shifts === 0 && r.fines === 0,
  );

  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 text-green-700">
            <Wallet className="h-5 w-5" />
          </span>
          <div>
            <div className="font-bold text-navy-900">Выплаты за период</div>
            <div className="text-xs text-navy-400">
              Смены × ставка − штрафы = к выплате
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => shiftMonth(-1)}
            className="rounded-lg p-2 text-navy-500 hover:bg-navy-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[140px] text-center text-sm font-bold capitalize text-navy-900">
            {label}
          </span>
          <button
            onClick={() => shiftMonth(1)}
            className="rounded-lg p-2 text-navy-500 hover:bg-navy-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setFineFor('any')}
            className="ml-3 inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <AlertTriangle className="h-4 w-4" />
            Штраф
          </button>
        </div>
      </div>

      {loading && !payroll ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState text="В этом месяце смен ещё не отмечено" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
                <th className="py-2.5 pr-3 font-semibold">Клинер</th>
                <th className="py-2.5 pr-3 font-semibold">Бригада</th>
                <th className="py-2.5 pr-3 text-right font-semibold">Смены</th>
                <th className="py-2.5 pr-3 text-right font-semibold">Начислено</th>
                <th className="py-2.5 pr-3 text-right font-semibold">Штрафы</th>
                <th className="py-2.5 pr-3 text-right font-semibold">К выплате</th>
                <th className="py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.cleanerId} className="border-b border-navy-50">
                  <td className="py-2.5 pr-3 font-medium text-navy-900">
                    {r.fullName}
                  </td>
                  <td className="py-2.5 pr-3 text-navy-500">{r.brigade ?? '—'}</td>
                  <td className="py-2.5 pr-3 text-right text-navy-800">
                    {r.shifts}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-navy-800">
                    {formatPrice(r.accrued)}
                  </td>
                  <td
                    className={`py-2.5 pr-3 text-right ${
                      r.fines > 0 ? 'font-medium text-red-600' : 'text-navy-300'
                    }`}
                  >
                    {r.fines > 0 ? `− ${formatPrice(r.fines)}` : '—'}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-bold text-navy-900">
                    {formatPrice(r.total)}
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => setFineFor(r.cleanerId)}
                      className="rounded-lg p-1.5 text-navy-300 hover:bg-red-50 hover:text-red-600"
                      title="Оштрафовать"
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {payroll && (
              <tfoot>
                <tr className="text-sm font-bold text-navy-900">
                  <td className="py-3 pr-3">Итого</td>
                  <td />
                  <td className="py-3 pr-3 text-right">{payroll.totals.shifts}</td>
                  <td className="py-3 pr-3 text-right">
                    {formatPrice(payroll.totals.accrued)}
                  </td>
                  <td className="py-3 pr-3 text-right text-red-600">
                    {payroll.totals.fines > 0
                      ? `− ${formatPrice(payroll.totals.fines)}`
                      : '—'}
                  </td>
                  <td className="py-3 pr-3 text-right text-green-700">
                    {formatPrice(payroll.totals.total)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
          {idle.length > 0 && (
            <p className="mt-2 text-xs text-navy-400">
              Без смен в этом месяце: {idle.map((r) => r.fullName).join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Штрафы за период */}
      {fines && fines.length > 0 && (
        <>
          <h4 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-navy-400">
            Штрафы за период
          </h4>
          <div className="space-y-2">
            {fines.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/40 px-3.5 py-2.5"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-navy-900">
                    {f.cleaner?.fullName}
                  </span>
                  <span className="ml-2 text-sm text-navy-500">{f.reason}</span>
                </div>
                <span className="shrink-0 text-xs text-navy-400">
                  {formatDate(f.date)}
                </span>
                <span className="shrink-0 text-sm font-bold text-red-600">
                  − {formatPrice(f.amount)}
                </span>
                <button
                  onClick={() => removeFine(f)}
                  className="shrink-0 rounded-lg p-1.5 text-navy-300 hover:bg-red-100 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {fineFor !== null && (
        <FineModal
          cleaners={cleaners ?? []}
          initialCleanerId={fineFor === 'any' ? undefined : fineFor}
          onClose={() => setFineFor(null)}
          onSaved={() => {
            setFineFor(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

/** Модалка назначения штрафа */
function FineModal({
  cleaners,
  initialCleanerId,
  onClose,
  onSaved,
}: {
  cleaners: Cleaner[];
  initialCleanerId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [cleanerId, setCleanerId] = useState(initialCleanerId ?? '');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await api.post('/payroll/fines', {
        cleanerId,
        amount: Number(amount),
        reason: reason.trim(),
        date,
      });
      toast.success('Штраф назначен');
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Не удалось назначить штраф');
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Штраф клинеру">
      <div className="space-y-3">
        <div>
          <label className="label">Клинер *</label>
          <select
            className="input"
            value={cleanerId}
            onChange={(e) => setCleanerId(e.target.value)}
          >
            <option value="">— выберите клинера —</option>
            {cleaners.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
                {c.brigade ? ` · ${c.brigade.name}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Сумма, сомони *</label>
            <input
              type="text"
              inputMode="numeric"
              className="input"
              value={amount}
              onChange={(e) =>
                setAmount(
                  e.target.value.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, ''),
                )
              }
              placeholder="50"
            />
          </div>
          <div>
            <label className="label">Дата</label>
            <DatePicker value={date} onChange={setDate} />
          </div>
        </div>
        <div>
          <label className="label">Причина *</label>
          <input
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Например: опоздание на объект"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost">
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={saving || !cleanerId || !Number(amount) || !reason.trim()}
            className="btn-primary"
          >
            {saving ? 'Сохранение…' : 'Назначить штраф'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
