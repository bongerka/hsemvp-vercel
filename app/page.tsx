import Link from "next/link";
import { ArrowRight, Bot, CalendarClock, ChartNoAxesCombined, MessagesSquare } from "lucide-react";
import { LandingEventTracker, TrackedExternalLink } from "@/components/app/public-event";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { publicEnv } from "@/lib/env";

const features = [
  {
    title: "Круглосуточный Telegram-бот",
    description:
      "Пациенты спрашивают про цены, режим работы и правила записи в любое время. Бот отвечает сразу, голосом или текстом.",
    icon: MessagesSquare,
  },
  {
    title: "Ответы по вашей базе знаний",
    description:
      "Загружаете прайс, FAQ и памятки — бот отвечает строго по этим документам и не выдумывает.",
    icon: Bot,
  },
  {
    title: "Единый кабинет с заявками",
    description:
      "Заявки, диалоги и воронка в одном окне. Администратор видит только то, что важно в работе.",
    icon: ChartNoAxesCombined,
  },
];

const steps = [
  "Пациент пишет в Telegram или открывает чат на сайте клиники.",
  "Ассистент сам отвечает на частые вопросы, собирает имя и телефон.",
  "Готовые заявки появляются в кабинете администратора клиники.",
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
                  Clinic Assistant
                </p>
                <p className="text-sm font-semibold text-foreground">
                  AI-помощник администратора клиники
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/chat" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Демо-чат
              </Link>
              <Link href="/login" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Войти
              </Link>
            </div>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.85fr] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
                <CalendarClock className="h-4 w-4" />
                Отвечает 24/7, собирает заявки автоматически
              </div>
              <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
                AI-помощник администратора клиники — отвечает на вопросы и собирает заявки
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
                Пациенты получают мгновенные ответы про цены, подготовку к визиту и расписание. Администратор видит готовые заявки и историю обращений в удобном кабинете.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/chat" className={buttonVariants({ variant: "default", size: "lg" })}>
                  Попробовать чат
                </Link>
                <TrackedExternalLink
                  href={publicEnv.telegramBotUrl}
                  eventName="telegram_open_click"
                  className={buttonVariants({ variant: "secondary", size: "lg" })}
                >
                  Открыть в Telegram
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
                Пациент задаёт вопрос — администратор получает готовую заявку
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Ассистент подключается к Telegram-боту клиники и к чату на сайте. Каждое обращение сохраняется в кабинете администратора, а заявки попадают туда сразу с именем и телефоном.
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
        </div>
      </section>
    </main>
  );
}
