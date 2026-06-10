import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../api/client';
import { clearFetchCache } from '../api/hooks';
import type { AuthUser } from '../types';

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<AuthUser>('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (login: string, password: string) => {
    const res = await api.post<{ user: AuthUser }>('/auth/login', {
      login,
      password,
    });
    clearFetchCache(); // чистим возможный кэш прошлой сессии
    setUser(res.data.user);
  };

  const logout = async () => {
    // мгновенный выход; запрос на сервер — в фоне
    clearFetchCache();
    setUser(null);
    api.post('/auth/logout').catch(() => {});
  };

  return (
    <Ctx.Provider value={{ user, loading, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
