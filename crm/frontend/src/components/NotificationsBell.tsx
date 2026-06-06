import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from '../api/client';
import type { NotificationItem } from '../types';
import { formatDateTime } from '../lib/labels';

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const [list, count] = await Promise.all([
        api.get<NotificationItem[]>('/notifications'),
        api.get<{ count: number }>('/notifications/unread-count'),
      ]);
      setItems(list.data);
      setUnread(count.data.count);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // опрос каждые 30 сек
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const openAndRead = async () => {
    setOpen((o) => !o);
    if (!open && unread > 0) {
      await api.patch('/notifications/read-all');
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={openAndRead}
        className="relative rounded-xl border border-navy-200 bg-white p-2.5 text-navy-600 hover:bg-navy-50"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 max-h-[420px] w-80 overflow-y-auto rounded-2xl border border-navy-100 bg-white p-2 shadow-card">
          <div className="px-3 py-2 text-sm font-bold text-navy-900">
            Уведомления
          </div>
          {items.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-navy-400">
              Уведомлений нет
            </div>
          )}
          {items.map((n) => (
            <div
              key={n.id}
              className="rounded-xl px-3 py-2.5 hover:bg-navy-50"
            >
              <div className="text-sm font-semibold text-navy-800">
                {n.title}
              </div>
              <div className="text-sm text-navy-600">{n.message}</div>
              <div className="mt-0.5 text-xs text-navy-400">
                {formatDateTime(n.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
