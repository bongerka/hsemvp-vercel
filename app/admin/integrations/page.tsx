import Link from "next/link";
import { CheckCircle2, Globe, MessagesSquare, PlugZap, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { publicEnv, serverEnv } from "@/lib/env";
import { maskUrl } from "@/lib/format";

function IntegrationState({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <div className="inline-flex items-center gap-2 rounded-full bg-[#dff3e4] px-3 py-1 text-xs font-semibold text-[#1d6a31]">
      <CheckCircle2 className="h-4 w-4" />
      Настроено
    </div>
  ) : (
    <div className="inline-flex items-center gap-2 rounded-full bg-[#fff0d9] px-3 py-1 text-xs font-semibold text-[#915a00]">
      <TriangleAlert className="h-4 w-4" />
      Нужна настройка
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Интеграции"
        description="Здесь собраны ссылки на пользовательские каналы и базовая информация о текущих webhook-ах."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-accent p-3 text-accent-foreground">
                  <MessagesSquare className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Telegram Bot</CardTitle>
                  <CardDescription>
                    Основной пользовательский канал для вопросов и заявок.
                  </CardDescription>
                </div>
              </div>
              <IntegrationState enabled={Boolean(publicEnv.telegramBotUrl)} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[22px] bg-muted/70 p-4 text-sm text-muted-foreground">
              {maskUrl(publicEnv.telegramBotUrl)}
            </div>
            <a
              href={publicEnv.telegramBotUrl || "#"}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "default" })}
            >
              Открыть Telegram-бота
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-accent p-3 text-accent-foreground">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Web Chat + n8n webhook</CardTitle>
                  <CardDescription>
                    Публичный демо-чат, который вызывает n8n напрямую.
                  </CardDescription>
                </div>
              </div>
              <IntegrationState enabled={Boolean(serverEnv.n8nChatWebhookUrl)} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[22px] bg-muted/70 p-4 text-sm text-muted-foreground">
              {maskUrl(serverEnv.n8nChatWebhookUrl)}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/chat" className={buttonVariants({ variant: "default" })}>
                Открыть чат
              </Link>
              <a
                href={serverEnv.n8nChatWebhookUrl || "#"}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "secondary" })}
              >
                Открыть webhook
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Что еще живет в n8n</CardTitle>
          <CardDescription>
            Это не custom backend. n8n хранит основную оркестрацию процесса.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[24px] border border-border bg-white p-4 text-sm text-muted-foreground">
            <PlugZap className="mb-3 h-5 w-5 text-primary" />
            Telegram incoming workflow с ветками для текста и голосовых сообщений.
          </div>
          <div className="rounded-[24px] border border-border bg-white p-4 text-sm text-muted-foreground">
            <PlugZap className="mb-3 h-5 w-5 text-primary" />
            Lead capture workflow с записью в `leads`, `messages` и `event_logs`.
          </div>
          <div className="rounded-[24px] border border-border bg-white p-4 text-sm text-muted-foreground">
            <PlugZap className="mb-3 h-5 w-5 text-primary" />
            Knowledge ingestion workflow с embeddings и similarity search по `knowledge_chunks`.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
