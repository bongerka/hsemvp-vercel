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
    icon: MessagesSquare,
  },
  {
    title: "RAG по документам клиники",
    description:
      "FAQ, прайс, подготовка к визиту и правила записи хранятся в базе знаний и подмешиваются в ответ модели.",
    icon: Bot,
  },
  {
    title: "Кабинет администратора",
    description:
      "Все заявки, последние обращения и базовая воронка доступны в одном интерфейсе без отдельного backend-монолита.",
    icon: ChartNoAxesCombined,
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

      <section className="grid-pattern px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-10">
          <nav className="flex flex-col gap-4 rounded-[32px] border border-white/60 bg-white/75 px-5 py-4 backdrop-blur md:flex-row md:items-center md:justify-between md:px-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  Clinic Admin Assistant
                </p>
                <p className="text-sm font-semibold text-foreground">
                  MVP для административной рутины клиники
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/chat" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Веб-чат
              </Link>
              <Link href="/login" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Войти
              </Link>
            </div>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.85fr] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
                <Bot className="h-4 w-4" />
                Без тяжелого custom backend
              </div>
              <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
                AI-помощник администратора клиники для быстрых ответов и сбора заявок
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
                Продукт решает административные задачи: FAQ, маршрутизация вопросов, цены, подготовка к визиту и сбор контактов. Вся оркестрация живет в n8n, а данные — в Supabase.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/chat" className={buttonVariants({ variant: "default", size: "lg" })}>
                  Попробовать веб-чат
                </Link>
                <TrackedExternalLink
                  href={publicEnv.telegramBotUrl}
                  eventName="telegram_open_click"
                  className={buttonVariants({ variant: "secondary", size: "lg" })}
                >
                  Telegram-бот
                </TrackedExternalLink>
                <Link href="/admin" className={buttonVariants({ variant: "ghost", size: "lg" })}>
                  Кабинет
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="space-y-4 rounded-[28px] bg-[#16381f] p-6 text-white panel-shadow">
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">
                Как выглядит ответ ассистента
              </p>
              <div className="rounded-3xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Пациент</p>
                <p className="mt-2 font-medium leading-6">
                  Сколько стоит первичный прием и как подготовиться?
                </p>
              </div>
              <div className="rounded-3xl bg-white p-4 text-[#16381f]">
                <p className="text-xs uppercase tracking-[0.2em] text-[#45614c]">Ассистент</p>
                <p className="mt-2 font-medium leading-6">
                  Первичный прием стоит 3 500 ₽. За 8 часов до анализа не ешьте — если хотите, я оставлю заявку администратору.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title}>
                <CardHeader>
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-[32px] border border-white/70 bg-white/80 p-6 panel-shadow md:p-8">
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
            <ol className="space-y-3">
              {steps.map((step, index) => (
                <li
                  key={step}
                  className="flex gap-4 rounded-[24px] border border-border bg-secondary p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-foreground">{step}</p>
                </li>
              ))}
            </ol>
          </div>

          <Card className="mt-8 bg-muted/60">
            <CardHeader>
              <CardTitle>Ограничения MVP</CardTitle>
              <CardDescription>Сознательно не делаем лишнее.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm leading-6 text-muted-foreground md:grid-cols-3">
              <p>Никаких диагнозов и медицинских рекомендаций как врач.</p>
              <p>Нет real-time booking engine и сложной CRM.</p>
              <p>Одна роль администратора и минимальный набор страниц.</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
