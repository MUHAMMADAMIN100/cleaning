import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { Spinner } from './components/ui';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import type { Role } from './types';

// Разделы грузятся по требованию (code-splitting) — тяжёлые библиотеки
// (recharts, dnd) не попадают в стартовый бандл и на страницу логина.
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Funnel = lazy(() => import('./pages/Funnel').then((m) => ({ default: m.Funnel })));
const Clients = lazy(() => import('./pages/Clients').then((m) => ({ default: m.Clients })));
const ClientCard = lazy(() => import('./pages/ClientCard').then((m) => ({ default: m.ClientCard })));
const Tasks = lazy(() => import('./pages/Tasks').then((m) => ({ default: m.Tasks })));
const Schedule = lazy(() => import('./pages/Schedule').then((m) => ({ default: m.Schedule })));
const Team = lazy(() => import('./pages/Team').then((m) => ({ default: m.Team })));
const Shifts = lazy(() => import('./pages/Shifts').then((m) => ({ default: m.Shifts })));
const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })));
const ReportEdit = lazy(() => import('./pages/ReportEdit').then((m) => ({ default: m.ReportEdit })));
const ReportView = lazy(() => import('./pages/ReportView').then((m) => ({ default: m.ReportView })));
const Analytics = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Analytics })));
const Tariffs = lazy(() => import('./pages/Tariffs').then((m) => ({ default: m.Tariffs })));
const UsersPage = lazy(() => import('./pages/Users').then((m) => ({ default: m.UsersPage })));
const UserDetail = lazy(() => import('./pages/UserDetail').then((m) => ({ default: m.UserDetail })));

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RoleOnly({
  roles,
  children,
}: {
  roles: Role[];
  children: JSX.Element;
}) {
  const { user } = useAuth();
  if (user && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route
          path="/login"
          element={
            loading ? (
              <Spinner />
            ) : user ? (
              <Navigate to="/" replace />
            ) : (
              <Login />
            )
          }
        />

        <Route
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/funnel" element={<Funnel />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientCard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/team" element={<Team />} />
          <Route path="/shifts" element={<Shifts />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/new" element={<ReportEdit />} />
          <Route path="/reports/:id" element={<ReportView />} />
          <Route path="/reports/:id/edit" element={<ReportEdit />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route
            path="/tariffs"
            element={
              <RoleOnly roles={['DIRECTOR']}>
                <Tariffs />
              </RoleOnly>
            }
          />
          <Route
            path="/users"
            element={
              <RoleOnly roles={['DIRECTOR']}>
                <UsersPage />
              </RoleOnly>
            }
          />
          {/* Профиль/детали сотрудника — доступ контролирует бэкенд (руководитель или сам) */}
          <Route path="/profile/:id" element={<UserDetail />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
