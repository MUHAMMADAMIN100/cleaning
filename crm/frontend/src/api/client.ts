import axios from 'axios';

const baseURL =
  import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

const TOKEN_KEY = 'archidea_token';

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem(TOKEN_KEY);
    delete api.defaults.headers.common.Authorization;
  }
}

// При старте подхватываем токен из localStorage (на случай, если cookie недоступна)
const saved = localStorage.getItem(TOKEN_KEY);
if (saved) api.defaults.headers.common.Authorization = `Bearer ${saved}`;
