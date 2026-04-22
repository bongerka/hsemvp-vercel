# clinic-admin-assistant-web

Frontend MVP для учебного задания “AI-помощник администратора клиники”.

Стек:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style primitives
- Supabase Auth + RLS
- деплой на Vercel

## Что есть в проекте

- `/` — лендинг
- `/login` — вход через Supabase magic link
- `/chat` — публичный demo web chat, который ходит в n8n webhook
- `/admin` — дашборд
- `/admin/leads` — список заявок
- `/admin/stats` — базовая статистика и воронка
- `/admin/integrations` — ссылки на Telegram и web chat

## Быстрый запуск

1. Установить зависимости:

```bash
npm install
```

2. Скопировать env:

```bash
cp .env.example .env.local
```

3. Заполнить переменные:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_TELEGRAM_BOT_URL=
N8N_CHAT_WEBHOOK_URL=
N8N_EVENT_WEBHOOK_URL=
```

`N8N_EVENT_WEBHOOK_URL` опционален. Он нужен только для публичных событий с лендинга: `landing_view` и `telegram_open_click`.

4. Применить SQL из [supabase/migrations/0001_init.sql](./supabase/migrations/0001_init.sql) в Supabase SQL Editor.

5. Запустить проект:

```bash
npm run dev
```

6. Для продакшн-сборки:

```bash
npm run build
```

## Magic Link в Supabase

Для стабильного входа через email link настройте шаблон письма так, чтобы редирект шел в:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/admin
```

Также:

- добавьте локальный URL `http://localhost:3000` в Redirect URLs
- добавьте домен Vercel в Redirect URLs
- заранее создайте администратора в `Authentication -> Users`
- для MVP лучше отключить public signups, потому что вход рассчитан на заранее заведенного admin user

## Как работает доступ

- frontend не вызывает OpenAI напрямую
- frontend читает Supabase только после логина администратора
- middleware обновляет auth cookie и не пускает анонимного пользователя на `/admin`
- финальная проверка роли `admin` идет на сервере через таблицу `profiles`
- RLS на таблицах разрешает чтение заявок, диалогов и событий только админу

## Структура

```text
app/
  admin/
  auth/confirm/
  chat/
  login/
components/
  app/
  ui/
lib/
  auth.ts
  dashboard.ts
  env.ts
  supabase/
supabase/
  migrations/
  query-examples.sql
types/
```

## Что читать напрямую из Supabase

Из frontend после логина администратора:

- `profiles`
- `leads`
- `conversations`
- `messages`
- `event_logs`

Вся генерация AI-ответов, embeddings, speech-to-text, сохранение chat logs и создание lead из диалога вынесены в n8n.

## SQL и RAG

В migration уже есть:

- включение `pgvector`
- таблицы `knowledge_documents` и `knowledge_chunks`
- индекс для `embedding`
- функция `match_knowledge_chunks(...)`

Примеры similarity search лежат в [supabase/query-examples.sql](./supabase/query-examples.sql).

## Деплой на Vercel

1. Создайте новый проект из этой репы.
2. Заполните env переменные из `.env.example`.
3. Убедитесь, что Supabase Redirect URLs включают ваш Vercel domain.
4. После деплоя проверьте:
   - `/login`
   - `/chat`
   - `/admin`

## Ограничения MVP

- нет медицинских диагнозов
- нет real booking engine
- одна роль `admin`
- нет сложной CRM и сложного RBAC
- web chat — демонстрационный, основная логика ассистента живет в n8n
