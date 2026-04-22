import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/app/login-form";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasSupabaseEnv, publicEnv } from "@/lib/env";
import { getCurrentSession } from "@/lib/auth";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const error =
    typeof params.error === "string" ? decodeURIComponent(params.error) : "";
  const message =
    typeof params.message === "string" ? decodeURIComponent(params.message) : "";

  if (hasSupabaseEnv) {
    const session = await getCurrentSession();

    if (session.user && session.profile?.role === "admin") {
      redirect("/admin");
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="overflow-hidden">
          <CardContent className="space-y-6 px-6 py-8 md:px-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
              <ShieldCheck className="h-4 w-4" />
              Только для администратора клиники
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight">
                Вход в кабинет
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                Для MVP используем magic link через Supabase. Это самый быстрый путь
                без отдельного управления паролями и лишнего backend-кода.
              </p>
            </div>
            <LoginForm initialError={error} initialMessage={message} />
            <p className="text-sm text-muted-foreground">
              В письме должна быть ссылка на
              {" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /auth/confirm
              </code>
              . Это настраивается в Supabase шаблоне magic link.
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden bg-[#16381f] text-white">
          <CardHeader>
            <CardTitle className="text-3xl text-white">Что внутри кабинета</CardTitle>
            <CardDescription className="text-white/70">
              Минимальный, но аккуратный интерфейс для быстрой демонстрации.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-white/85">
            <div className="rounded-[24px] bg-white/10 p-4">
              Заявки с фильтром по статусам и основными контактными данными.
            </div>
            <div className="rounded-[24px] bg-white/10 p-4">
              Последние обращения, event-логи и базовая статистика по воронке.
            </div>
            <div className="rounded-[24px] bg-white/10 p-4">
              Кнопки быстрого перехода в Telegram-бота и публичный веб-чат.
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/" className={buttonVariants({ variant: "secondary" })}>
                Вернуться на лендинг
              </Link>
              <a
                href={publicEnv.telegramBotUrl || "#"}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "ghost" })}
              >
                Открыть Telegram
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
