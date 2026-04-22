import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLeads } from "@/lib/dashboard";
import { formatDateTime, formatSource, truncate } from "@/lib/format";
import { cn } from "@/lib/utils";

const statuses = [
  { value: "all", label: "Все" },
  { value: "new", label: "Новые" },
  { value: "contacted", label: "Связались" },
  { value: "in_progress", label: "В работе" },
  { value: "qualified", label: "Квалифицированы" },
  { value: "closed", label: "Закрыты" },
  { value: "cancelled", label: "Отменены" },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const currentStatus =
    typeof params.status === "string" ? params.status : "all";
  const leads = await getLeads(currentStatus);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Заявки"
        description="Фильтруйте лиды по статусу и быстро просматривайте основные контактные данные."
      />

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {statuses.map((status) => {
            const isActive = currentStatus === status.value;
            return (
              <Link
                key={status.value}
                href={status.value === "all" ? "/admin/leads" : `/admin/leads?status=${status.value}`}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium",
                  isActive
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-white text-muted-foreground hover:bg-accent",
                )}
              >
                {status.label}
              </Link>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Список заявок</CardTitle>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <EmptyState
              title="Нет заявок с таким статусом"
              description="Попробуйте другой фильтр или создайте лид через Telegram-бота / веб-чат."
            />
          ) : (
            <div className="overflow-hidden rounded-[24px] border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/70 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Пациент</th>
                    <th className="px-4 py-3 font-medium">Контакт</th>
                    <th className="px-4 py-3 font-medium">Источник</th>
                    <th className="px-4 py-3 font-medium">Интерес</th>
                    <th className="px-4 py-3 font-medium">Комментарий</th>
                    <th className="px-4 py-3 font-medium">Статус</th>
                    <th className="px-4 py-3 font-medium">Создана</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {leads.map((lead) => (
                    <tr key={lead.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{lead.patient_name || "Без имени"}</div>
                        <div className="text-xs text-muted-foreground">
                          Желаемая дата: {lead.desired_date || "Не указана"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div>{lead.phone || "Телефон не указан"}</div>
                        <div className="text-xs">{lead.telegram_username || "Telegram не указан"}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatSource(lead.source)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {lead.service_interest || "Не уточнено"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {truncate(lead.notes, 72)}
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
    </div>
  );
}
