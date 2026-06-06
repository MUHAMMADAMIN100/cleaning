import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Search } from 'lucide-react';
import { api } from '../api/client';
import { useFetch } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { Spinner, PageHeader, Badge, Modal, EmptyState } from '../components/ui';
import {
  TAG_LABEL,
  TAG_COLOR,
  SOURCE_LABEL,
  formatDate,
} from '../lib/labels';
import type { Client, ClientTag, LeadSource, Manager } from '../types';

const TAGS: ClientTag[] = ['VIP', 'REGULAR', 'POTENTIAL', 'REFUSED'];
const SOURCES: LeadSource[] = ['SITE', 'INSTAGRAM', 'CALL', 'RECOMMENDATION'];

export function Clients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [source, setSource] = useState('');
  const [sort, setSort] = useState<'recent' | 'name'>('recent');
  const [showAdd, setShowAdd] = useState(false);

  const query = new URLSearchParams();
  if (search) query.set('search', search);
  if (tag) query.set('tag', tag);
  if (source) query.set('source', source);
  query.set('sort', sort);

  const { data, loading, reload } = useFetch<Client[]>(
    `/clients?${query.toString()}`,
    { deps: [search, tag, source, sort], pollMs: 15000 },
  );

  const exportCsv = async () => {
    const res = await api.get('/clients/export', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clients.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="База клиентов"
        subtitle="Все обращения фиксируются здесь"
        action={
          <div className="flex gap-2">
            <button onClick={exportCsv} className="btn-ghost">
              <Download className="h-4 w-4" />
              Экспорт
            </button>
            <button onClick={() => setShowAdd(true)} className="btn-primary">
              <Plus className="h-4 w-4" />
              Добавить
            </button>
          </div>
        }
      />

      {/* Фильтры */}
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
          <input
            className="input !pl-9"
            placeholder="Поиск по имени или телефону"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input max-w-[180px]" value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">Все теги</option>
          {TAGS.map((t) => (
            <option key={t} value={t}>{TAG_LABEL[t]}</option>
          ))}
        </select>
        <select className="input max-w-[180px]" value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">Все источники</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
          ))}
        </select>
        <select className="input max-w-[180px]" value={sort} onChange={(e) => setSort(e.target.value as any)}>
          <option value="recent">Сначала недавние</option>
          <option value="name">По имени</option>
        </select>
      </div>

      {loading || !data ? (
        <Spinner />
      ) : data.length === 0 ? (
        <EmptyState text="Клиенты не найдены" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Клиент</th>
                  <th className="px-4 py-3 font-semibold">Телефон</th>
                  <th className="px-4 py-3 font-semibold">Источник</th>
                  <th className="px-4 py-3 font-semibold">Теги</th>
                  {user?.role === 'DIRECTOR' && (
                    <th className="px-4 py-3 font-semibold">Менеджер</th>
                  )}
                  <th className="px-4 py-3 font-semibold">Заказов</th>
                  <th className="px-4 py-3 font-semibold">Контакт</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {data.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/clients/${c.id}`)}
                    className="cursor-pointer hover:bg-navy-50"
                  >
                    <td className="px-4 py-3 font-semibold text-navy-900">
                      {c.fullName}
                    </td>
                    <td className="px-4 py-3 text-navy-600">{c.phone}</td>
                    <td className="px-4 py-3 text-navy-600">
                      {SOURCE_LABEL[c.source]}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.map((t) => (
                          <Badge key={t} className={TAG_COLOR[t]}>
                            {TAG_LABEL[t]}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    {user?.role === 'DIRECTOR' && (
                      <td className="px-4 py-3 text-navy-600">
                        {c.manager?.fullName ?? '—'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-navy-600">
                      {c._count?.orders ?? 0}
                    </td>
                    <td className="px-4 py-3 text-navy-400">
                      {formatDate(c.lastContactAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && (
        <AddClientModal
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            reload();
          }}
          isDirector={user?.role === 'DIRECTOR'}
        />
      )}
    </div>
  );
}

function AddClientModal({
  onClose,
  onCreated,
  isDirector,
}: {
  onClose: () => void;
  onCreated: () => void;
  isDirector: boolean;
}) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState<LeadSource>('CALL');
  const [managerId, setManagerId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { data: managers } = useFetch<Manager[]>(
    isDirector ? '/users/managers' : null,
  );

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post('/clients', {
        fullName,
        phone,
        source,
        managerId: managerId || undefined,
      });
      onCreated();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Новый клиент">
      <div className="space-y-3">
        <div>
          <label className="label">ФИО *</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label">Телефон *</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+992 ..." />
        </div>
        <div>
          <label className="label">Источник</label>
          <select className="input" value={source} onChange={(e) => setSource(e.target.value as LeadSource)}>
            {SOURCES.map((s) => (
              <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
            ))}
          </select>
        </div>
        {isDirector && (
          <div>
            <label className="label">Ответственный менеджер</label>
            <select className="input" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">— не назначен —</option>
              {(managers ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.fullName}</option>
              ))}
            </select>
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost">Отмена</button>
          <button onClick={submit} disabled={saving || !fullName || !phone} className="btn-primary">
            {saving ? 'Сохранение…' : 'Создать'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
