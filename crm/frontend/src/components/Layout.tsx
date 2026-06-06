import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { prefetch } from '../api/hooks';
import {
  LayoutDashboard,
  Filter,
  Users,
  CheckSquare,
  CalendarDays,
  UsersRound,
  BarChart3,
  Tags,
  UserCog,
  LogOut,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { NotificationsBell } from './NotificationsBell';
import type { Role } from '../types';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: Role[]; // если не указано — доступно всем
}

const NAV: NavItem[] = [
  { to: '/', label: 'Дашборд', icon: LayoutDashboard },
  { to: '/funnel', label: 'Воронка', icon: Filter },
  { to: '/clients', label: 'Клиенты', icon: Users },
  { to: '/tasks', label: 'Задачи', icon: CheckSquare },
  { to: '/schedule', label: 'Расписание', icon: CalendarDays },
  { to: '/team', label: 'Команда', icon: UsersRound },
  { to: '/analytics', label: 'Аналитика', icon: BarChart3 },
  { to: '/tariffs', label: 'Тарифы', icon: Tags, roles: ['DIRECTOR'] },
  { to: '/users', label: 'Сотрудники', icon: UserCog, roles: ['DIRECTOR'] },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = NAV.filter(
    (i) => !i.roles || (user && i.roles.includes(user.role)),
  );

  // Прогрев кэша всех разделов после входа — переходы будут мгновенными
  useEffect(() => {
    if (!user) return;
    const urls = [
      '/orders/board',
      '/clients?sort=recent',
      '/analytics/summary',
      '/analytics/full',
      '/tasks',
      '/schedule',
      '/cleaners',
      '/cleaners/team-tasks',
      '/users/managers',
    ];
    if (user.role === 'DIRECTOR') urls.push('/tariffs', '/users');
    urls.forEach(prefetch);
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-navy-900 text-white transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2.5 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
            <Sparkles className="h-5 w-5 text-navy-200" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-extrabold">Archidea</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-navy-300">
              Sistem
            </div>
          </div>
        </div>

        <nav className="mt-4 space-y-1 px-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white text-navy-900'
                    : 'text-navy-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute inset-x-0 bottom-0 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-navy-200 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Выйти
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-navy-950/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-navy-100 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            className="rounded-lg p-2 text-navy-600 hover:bg-navy-50 lg:hidden"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="hidden text-sm text-navy-500 sm:block">
            {user?.role === 'DIRECTOR' ? 'Кабинет руководителя' : 'Кабинет менеджера'}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <NotificationsBell />
            <div className="flex items-center gap-2.5">
              <div className="hidden text-right sm:block">
                <div className="text-sm font-semibold text-navy-900">
                  {user?.fullName}
                </div>
                <div className="text-xs text-navy-400">
                  {user?.role === 'DIRECTOR' ? 'Руководитель' : 'Менеджер'}
                </div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-800 text-sm font-bold text-white">
                {user?.fullName?.[0] ?? '?'}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
