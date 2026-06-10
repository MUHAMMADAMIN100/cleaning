import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

/**
 * Авторизация — только через httpOnly-cookie (withCredentials).
 * Токен НЕ хранится в JS/localStorage → недоступен для XSS.
 */
export const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Чистим возможный старый небезопасный токен из прошлых версий
try {
  localStorage.removeItem('archidea_token');
} catch {
  /* ignore */
}
