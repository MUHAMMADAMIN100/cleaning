import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { Spinner } from './components/ui';
import { Layout } from './components/Layout';
import type { Role } from './types';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Funnel } from './pages/Funnel';
import { Clients } from './pages/Clients';
import { ClientCard } from './pages/ClientCard';
import { Tasks } from './pages/Tasks';
import { Schedule } from './pages/Schedule';
import { Team } from './pages/Team';
import { Analytics } from './pages/Analytics';
import { Tariffs } from './pages/Tariffs';
import { UsersPage } from './pages/Users';
import { UserDetail } from './pages/UserDetail';

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
  );
}
