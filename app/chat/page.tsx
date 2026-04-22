import Link from "next/link";
import { ArrowLeft, Headphones, MessageSquareText } from "lucide-react";
import { WebChat } from "@/components/app/web-chat";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ChatPage() {
  return (
    <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Web Chat Demo
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Публичный веб-чат для быстрой демонстрации сценария
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Вызов идет напрямую в n8n webhook. Внутри n8n можно использовать тот же retrieval и тот же LLM flow, что и для Telegram-бота.
            </p>
          </div>
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>
            <ArrowLeft className="h-4 w-4" />
            Вернуться на лендинг
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="flex gap-4 py-6">
              <div className="rounded-2xl bg-accent p-3 text-accent-foreground">
                <MessageSquareText className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold">Только административные ответы</h2>
                <p className="text-sm text-muted-foreground">
                  Ассистент отвечает по ценам, правилам записи, подготовке к визиту и маршрутизации запросов.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex gap-4 py-6">
              <div className="rounded-2xl bg-accent p-3 text-accent-foreground">
                <Headphones className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold">Голосовой сценарий живет в Telegram</h2>
                <p className="text-sm text-muted-foreground">
                  Для speech-to-text n8n получает голосовое сообщение, вызывает OpenAI transcription и продолжает диалог как с обычным текстом.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <WebChat />
      </div>
    </main>
  );
}
