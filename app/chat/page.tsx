import Link from "next/link";
import { ArrowLeft, Clock3, Lightbulb } from "lucide-react";
import { WebChat } from "@/components/app/web-chat";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ChatPage() {
  return (
    <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Чат с ассистентом клиники
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Спросите про цены, режим работы, подготовку к визиту или оставьте заявку на запись — ассистент ответит сразу.
            </p>
          </div>
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>
            <ArrowLeft className="h-4 w-4" />
            На главную
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="flex gap-4 py-6">
              <div className="rounded-2xl bg-accent p-3 text-accent-foreground">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold">Что можно спросить</h2>
                <p className="text-sm text-muted-foreground">
                  Стоимость приёма, часы работы, как подготовиться к анализам, запись к нужному специалисту.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex gap-4 py-6">
              <div className="rounded-2xl bg-accent p-3 text-accent-foreground">
                <Clock3 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold">Заявка за минуту</h2>
                <p className="text-sm text-muted-foreground">
                  Напишите имя и телефон — администратор клиники свяжется с вами, чтобы подтвердить запись.
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
