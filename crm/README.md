# Archidea Sistem — CRM

Закрытая CRM-система для клининговой компании «Arhydeya Cleaning».
Две роли: **Руководитель** и **Менеджер**. Клинеры в систему не заходят.

## Стек

| Слой | Технология | Хостинг |
|------|-----------|---------|
| Frontend | React + TypeScript + Vite + Tailwind | Vercel |
| Backend | NestJS + Prisma | Railway |
| База данных | PostgreSQL | Railway |

## Возможности (по ТЗ)

- **Воронка продаж** — 9 этапов (новая заявка → … → оплачено / отказ), смена статуса, причина отказа.
- **База клиентов** — фиксируется каждое обращение; поиск/фильтр/сортировка, теги (VIP/постоянный/отказник/потенциальный), история заказов, защита от дублей по телефону, экспорт CSV.
- **Кабинет руководителя** — дашборд, вся база, постановка задач, аналитика (доходы день/неделя/месяц/квартал, типы уборки, конверсия, загрузка менеджеров, источники), управление тарифами, все команды.
- **Кабинет менеджера** — свои заявки, добавление клиента вручную, расписание/встречи, своя команда и задания на день, задачи от руководителя, ограниченная аналитика (без финансов компании).
- **Уведомления** — колокольчик внутри CRM (новая заявка, новая задача, смена статуса крупного заказа).
- **Интеграция с сайтом** — заявки с лендинга автоматически создаются в CRM (`POST /api/leads/intake`, защита API-ключом + honeypot + rate-limit).
- **Безопасность** — JWT в httpOnly-cookie, пароли через bcrypt, защита форм, ежедневный бэкап.

---

## Локальный запуск

### 1. База данных (Postgres)
Вариант А — Docker:
```bash
cd crm
docker compose up -d
```
Вариант Б — облачный Postgres (Railway/Neon): получите `DATABASE_URL` и впишите в `crm/backend/.env`.

### 2. Backend
```bash
cd crm/backend
cp .env.example .env          # пропишите DATABASE_URL и секреты
npm install
npm run prisma:push           # создать таблицы
npm run db:seed               # тестовые данные
npm run start:dev             # http://localhost:4000
```

### 3. Frontend
```bash
cd crm/frontend
cp .env.example .env          # VITE_API_URL=http://localhost:4000/api
npm install
npm run dev                   # http://localhost:5174
```

### Тестовые доступы (после сида)
| Роль | Логин | Пароль |
|------|-------|--------|
| Руководитель | `director` | `director123` |
| Менеджер 1 | `manager1` | `manager123` |
| Менеджер 2 | `manager2` | `manager123` |

---

## Деплой

### Backend + БД → Railway
1. Создайте проект на [railway.app](https://railway.app) → **New → Deploy from GitHub** (репозиторий CRM, корень `crm/backend`).
2. Добавьте плагин **PostgreSQL** — Railway создаст переменную `DATABASE_URL`.
3. Переменные окружения сервиса (`crm/backend`):
   - `JWT_SECRET` — длинная случайная строка
   - `LEADS_INTAKE_API_KEY` — ключ для приёма заявок с сайта
   - `FRONTEND_URL` — URL фронта CRM на Vercel
   - `LANDING_URL` — URL лендинга
4. Деплой запустит `prisma db push` (создаст таблицы) и поднимет API.
5. Первичный сид — в Railway Shell: `npm run db:seed`.

### Frontend → Vercel
1. **New Project** → репозиторий CRM, **Root Directory** = `crm/frontend`.
2. Переменная: `VITE_API_URL=https://<backend>.up.railway.app/api`.
3. Deploy.

### Связка лендинга с CRM
В проекте лендинга на Vercel добавьте переменные:
- `VITE_CRM_API_URL=https://<backend>.up.railway.app/api`
- `VITE_CRM_INTAKE_KEY=<тот же LEADS_INTAKE_API_KEY>`

После этого заявки с сайта автоматически попадают в воронку CRM.

---

## Структура

```
crm/
  backend/   NestJS API (модули: auth, users, clients, orders, tasks,
             schedule, cleaners, tariffs, analytics, notifications, leads, backup)
  frontend/  React SPA (страницы: Dashboard, Funnel, Clients, ClientCard,
             Tasks, Schedule, Team, Analytics, Tariffs, Users)
  docker-compose.yml
```
