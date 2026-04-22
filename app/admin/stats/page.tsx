import { Percent, PhoneCall, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { SimpleBarChart } from "@/components/app/simple-bar-chart";
import { StatCard } from "@/components/app/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { getStatsData } from "@/lib/dashboard";
import { formatStatus } from "@/lib/format";

export default async function StatsPage() {
  const stats = await getStatsData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Статистика и воронка"
        description="Считаем базовую конверсию без внешней BI: все опирается на leads и event_logs в Supabase."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Chat started"
          value={stats.chatStarted}
          hint="Сколько диалогов дошло до старта"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Lead started"
          value={stats.leadStarted}
          hint="Пользователь дошел до сбора заявки"
          icon={<PhoneCall className="h-5 w-5" />}
        />
        <StatCard
          label="Lead created"
          value={stats.leadCreated}
          hint="Заявки, сохраненные в Supabase"
          icon={<PhoneCall className="h-5 w-5" />}
        />
        <StatCard
          label="Конверсия"
          value={`${stats.conversionRate}%`}
          hint="chat_started → lead_created"
          icon={<Percent className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardContent className="pt-6">
            <SimpleBarChart
              title="Дневная динамика диалогов"
              description="Событие chat_started за последние 7 дней."
              series={stats.dailyFunnel.map((day) => ({
                label: day.label,
                value: day.chats,
                tone: "primary",
              }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <SimpleBarChart
              title="Статусы заявок"
              description="Как распределяются leads по статусам."
              series={stats.statusBreakdown.map((item, index) => ({
                label: formatStatus(item.label),
                value: item.value,
                tone: index === 0 ? "primary" : index === 1 ? "secondary" : "muted",
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <SimpleBarChart
              title="Переход к сбору заявки"
              description="Событие lead_started за последние 7 дней."
              series={stats.dailyFunnel.map((day) => ({
                label: day.label,
                value: day.leads,
                tone: "secondary",
              }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <SimpleBarChart
              title="Созданные заявки"
              description="Событие lead_created за последние 7 дней."
              series={stats.dailyFunnel.map((day) => ({
                label: day.label,
                value: day.createdLeads,
                tone: "muted",
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">Landing views</p>
            <p className="mt-2 text-3xl font-semibold">{stats.landingViews}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">Telegram open clicks</p>
            <p className="mt-2 text-3xl font-semibold">{stats.telegramOpenClicks}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
