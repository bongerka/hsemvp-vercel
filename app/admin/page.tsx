import { CalendarRange, MessageSquareMore, Sparkles, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardData } from "@/lib/dashboard";
import { formatDateTime, formatEventName, formatSource, truncate } from "@/lib/format";

export default async function AdminDashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Дашборд"
        description="Общий обзор по входящим обращениям, заявкам и ключевым событиям продукта."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Всего заявок"
          value={data.metrics.totalLeads}
          hint="Все leads из Supabase"
          icon={<UsersRound className="h-5 w-5" />}
        />
        <StatCard
          label="Новые заявки"
          value={data.metrics.newLeads}
          hint="Статус new"
          icon={<Sparkles className="h-5 w-5" />}
        />
        <StatCard
          label="Диалоги"
          value={data.metrics.totalConversations}
          hint="Telegram и web"
          icon={<MessageSquareMore className="h-5 w-5" />}
        />
        <StatCard
          label="Заявки сегодня"
          value={data.metrics.leadsToday}
          hint="По текущему дню"
          icon={<CalendarRange className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Последние заявки</CardTitle>
            <CardDescription>Свежие лиды, которые уже попали в систему.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentLeads.length === 0 ? (
              <EmptyState
                title="Заявок пока нет"
                description="После первого лида из Telegram или веб-чата записи появятся здесь."
              />
            ) : (
              <div className="overflow-hidden rounded-[24px] border border-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/70 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Пациент</th>
                      <th className="px-4 py-3 font-medium">Услуга</th>
                      <th className="px-4 py-3 font-medium">Статус</th>
                      <th className="px-4 py-3 font-medium">Создана</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {data.recentLeads.map((lead) => (
                      <tr key={lead.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{lead.patient_name || "Без имени"}</div>
                          <div className="text-xs text-muted-foreground">
                            {lead.phone || lead.telegram_username || "Контакт не указан"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {lead.service_interest || "Не уточнено"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={lead.status} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDateTime(lead.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Последние события</CardTitle>
            <CardDescription>
              Базовая воронка и технические действия, которые пишет n8n.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentEvents.length === 0 ? (
              <EmptyState
                title="Пока пусто"
                description="Когда в систему начнут приходить события, они отобразятся здесь."
              />
            ) : (
              data.recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between gap-4 rounded-[22px] border border-border bg-white px-4 py-3"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{formatEventName(event.event_name)}</p>
                    <p className="text-sm text-muted-foreground">
                      {truncate(JSON.stringify(event.properties ?? {}), 80)}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(event.created_at)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Последние обращения</CardTitle>
          <CardDescription>
            Последние пользовательские сообщения, которые попали в conversations/messages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentConversations.length === 0 ? (
            <EmptyState
              title="Обращений пока нет"
              description="После первых диалогов из Telegram или веб-чата здесь появится история последних вопросов."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {data.recentConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="rounded-[24px] border border-border bg-white px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">
                        {conversation.patient_name ||
                          conversation.telegram_username ||
                          conversation.external_user_id ||
                          "Неизвестный пользователь"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatSource(conversation.source)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(conversation.latest_message_at)}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {truncate(conversation.latest_message, 140)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
