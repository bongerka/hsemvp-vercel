import Link from "next/link";
import { ArrowRight, Bot, ChartNoAxesCombined, MessagesSquare } from "lucide-react";
import { LandingEventTracker, TrackedExternalLink } from "@/components/app/public-event";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { publicEnv } from "@/lib/env";

const features = [
  {
    title: "Telegram-бот для пациентов",
    description:
      "Ассистент отвечает на административные вопросы, принимает текст и голос, собирает заявку на запись.",
  },
  {
    title: "RAG по документам клиники",
    description:
      "FAQ, прайс, подготовка к визиту и правила записи хранятся в базе знаний и подмешиваются в ответ модели.",
  },
  {
    title: "Кабинет администратора",
    description:
      "Все заявки, последние обращения и базовая воронка доступны в одном интерфейсе без отдельного бэкенд-монолита.",
  },
];

const steps = [
  "Пациент пишет в Telegram или веб-чат, а n8n принимает входящее сообщение.",
  "n8n вызывает OpenAI для speech-to-text и ответа с учетом базы знаний в Supabase.",
  "Lead, сообщения и события сохраняются в Supabase и сразу доступны администратору в веб-кабинете.",
];

export default function Home() {
  return (
    <main className="relative flex-1 overflow-hidden">
      <LandingEventTracker />
      <section className="grid-pattern px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-10">
          <div className="flex flex-col gap-4 rounded-[32px] border border-white/60 bg-white/70 p-5 backdrop-blur md:flex-row md:items-center md:justify-between md:p-6">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
                Clinic Admin Assistant
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-4xl">
                AI-помощник администратора клиники для быстрых ответов и сбора заявок
              </h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/login" className={buttonVariants({ variant: "default", size: "lg" })}>
                Войти как администратор
              </Link>
              <TrackedExternalLink
                href={publicEnv.telegramBotUrl}
                eventName="telegram_open_click"
                className={buttonVariants({ variant: "secondary", size: "lg" })}
              >
                Открыть Telegram-бота
              </TrackedExternalLink>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
            <Card className="overflow-hidden">
              <CardContent className="grid gap-8 px-6 py-8 md:grid-cols-[1.2fr_0.8fr] md:px-8">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
                    <Bot className="h-4 w-4" />
                    Быстрый MVP без тяжелого custom backend
                  </div>
                  <div className="space-y-4">
                    <h2 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                      Администратор видит заявки, бот отвечает по базе знаний, а сложная логика живет в n8n
                    </h2>
                    <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                      Продукт решает административные задачи клиники: FAQ, маршрутизация вопросов, цены, подготовка к визиту и сбор контактов. Без медицинских диагнозов и без переусложнения архитектуры.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link href="/chat" className={buttonVariants({ variant: "secondary", size: "lg" })}>
                      Попробовать веб-чат
                    </Link>
                    <Link href="/admin" className={buttonVariants({ variant: "ghost", size: "lg" })}>
                      Открыть кабинет
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                <div className="space-y-4 rounded-[28px] bg-[#16381f] p-6 text-white">
                  <div className="space-y-2">
                    <p className="text-sm uppercase tracking-[0.24em] text-white/65">
                      Что делает продукт
                    </p>
                    <p className="text-2xl font-semibold leading-tight">
                      Оцифровывает рутину администратора без обещаний enterprise CRM.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-3xl bg-white/10 p-4">
                      <p className="text-sm text-white/70">Вопрос пациента</p>
                      <p className="mt-2 font-medium">
                        “Сколько стоит первичный прием и как подготовиться?”
                      </p>
                    </div>
                    <div className="rounded-3xl bg-white/95 p-4 text-[#16381f]">
                      <p className="text-sm text-[#45614c]">Ответ ассистента</p>
                      <p className="mt-2 font-medium">
                        “Первичный прием стоит 3 500 ₽. За 8 часов до анализа не ешьте, а для записи я могу оставить заявку администратору.”
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Для демонстрации</CardTitle>
                  <CardDescription>
                    Нужен быстрый результат, который можно собрать за 1–2 вечера.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-3 rounded-2xl bg-muted/70 p-4">
                    <MessagesSquare className="h-5 w-5 text-primary" />
                    Telegram и веб-чат как входящие каналы
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-muted/70 p-4">
                    <ChartNoAxesCombined className="h-5 w-5 text-primary" />
                    Базовая статистика и простая воронка на Supabase
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ограничения MVP</CardTitle>
                  <CardDescription>Сознательно не делаем лишнее.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>Никаких диагнозов и медицинских рекомендаций как врач.</p>
                  <p>Нет real-time booking engine и сложной CRM.</p>
                  <p>Одна роль администратора и минимальный набор страниц.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[32px] border border-white/70 bg-white/80 p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
                Как это работает
              </p>
              <h2 className="text-3xl font-semibold tracking-tight">
                Вся тяжелая логика в n8n, а web только показывает результат и управляет входом
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Supabase хранит пользователей, обращения, сообщения, лиды, базу знаний и event-логи. Frontend читает данные через RLS после входа администратора.
              </p>
            </div>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className="flex gap-4 rounded-[24px] border border-border bg-secondary p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-foreground">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
