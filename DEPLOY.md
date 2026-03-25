# Deploy на Vercel

## Что нужно в переменных окружения

Скопируйте `.env.example` в локальный `.env` и затем перенесите те же значения в Vercel Project Settings -> Environment Variables.

- `APP_URL` — production URL приложения.
- `DATABASE_URL` — PostgreSQL DSN.
- `OPENAI_API_KEY` — ключ OpenAI.
- `OPENAI_CHAT_MODEL` — по умолчанию `gpt-4o-mini`.
- `OPENAI_TRANSCRIBE_MODEL` — по умолчанию `gpt-4o-mini-transcribe`.
- `TELEGRAM_BOT_TOKEN` — токен Telegram-бота.
- `TELEGRAM_BOT_USERNAME` — username бота без `@`.
- `TELEGRAM_WEBHOOK_SECRET` — секрет для проверки webhook.
- `YANDEX_METRICA_ID` — опционально.

## Локальный запуск

```bash
env GOCACHE=/tmp/go-build-cache GOPATH=/tmp/go GOPROXY=file:///Users/aarsmirnov/go/pkg/mod/cache/download GOSUMDB=off go run cmd/app/main.go
```

Если у вас нормальный интернет и обычный Go proxy, хватит и стандартного:

```bash
go run cmd/app/main.go
```

## Деплой

1. Запушьте репозиторий в GitHub.
2. Импортируйте его в Vercel.
3. Добавьте env-переменные.
4. После первого деплоя настройте Telegram webhook:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://your-project.vercel.app/telegram/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

## Что и где находится

- `/` — лендинг
- `/register` и `/login` — авторизация
- `/app/chat` — чат и голосовой ввод
- `/app/files` — загрузка документов для RAG
- `/app/dashboard` — usage-статистика и воронка
- `/telegram/webhook` — webhook Telegram-бота
