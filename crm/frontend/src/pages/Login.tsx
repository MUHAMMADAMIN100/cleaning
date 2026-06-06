import { useState } from 'react';
import { Sparkles, LogIn } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export function Login() {
  const { login } = useAuth();
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(loginValue, password);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Неверный логин или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <Sparkles className="h-7 w-7 text-navy-200" />
          </div>
          <h1 className="text-2xl font-extrabold">Archidea Sistem</h1>
          <p className="mt-1 text-sm text-navy-300">
            CRM для клининговой компании
          </p>
        </div>

        <form onSubmit={submit} className="card p-6">
          <div className="mb-4">
            <label className="label">Логин</label>
            <input
              className="input"
              value={loginValue}
              onChange={(e) => setLoginValue(e.target.value)}
              placeholder="director"
              autoFocus
            />
          </div>
          <div className="mb-5">
            <label className="label">Пароль</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            <LogIn className="h-4 w-4" />
            {loading ? 'Вход…' : 'Войти'}
          </button>

          <div className="mt-5 rounded-xl bg-navy-50 p-3 text-xs text-navy-500">
            <div className="mb-1 font-semibold text-navy-700">
              Тестовые доступы:
            </div>
            director / director123 (руководитель)
            <br />
            manager1 / manager123 (менеджер)
          </div>
        </form>
      </div>
    </div>
  );
}
