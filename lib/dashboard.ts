import "server-only";
import type {
  Conversation,
  ConversationWithMessage,
  DashboardData,
  DayMetric,
  EventLog,
  Lead,
  MessageWithConversation,
  StatsData,
  StatusMetric,
} from "@/types/database";
import { createClient } from "@/lib/supabase/server";

const funnelEvents = [
  "landing_view",
  "telegram_open_click",
  "chat_started",
  "lead_started",
  "lead_created",
] as const;

function getStartOfTodayIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function getIsoDaysAgo(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function ensureNoError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

function getConversation(
  conversation: Conversation | Conversation[] | null,
): Conversation | null {
  if (!conversation) {
    return null;
  }

  return Array.isArray(conversation) ? conversation[0] ?? null : conversation;
}

function buildDayLabels(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - index - 1));
    date.setHours(0, 0, 0, 0);

    return {
      key: date.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "2-digit",
      }).format(date),
    };
  });
}

function mapDailyFunnel(events: EventLog[], days = 7): DayMetric[] {
  const buckets = new Map(
    buildDayLabels(days).map((entry) => [
      entry.key,
      {
        label: entry.label,
        chats: 0,
        leads: 0,
        createdLeads: 0,
      },
    ]),
  );

  for (const event of events) {
    const key = event.created_at.slice(0, 10);
    const bucket = buckets.get(key);

    if (!bucket) {
      continue;
    }

    if (event.event_name === "chat_started") {
      bucket.chats += 1;
    }

    if (event.event_name === "lead_started") {
      bucket.leads += 1;
    }

    if (event.event_name === "lead_created") {
      bucket.createdLeads += 1;
    }
  }

  return Array.from(buckets.values());
}

function mapStatusBreakdown(leads: Lead[]): StatusMetric[] {
  const counts = new Map<string, number>();

  leads.forEach((lead) => {
    counts.set(lead.status, (counts.get(lead.status) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([label, value]) => ({
      label,
      value,
    }));
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();

  const [
    totalLeadsResult,
    newLeadsResult,
    totalConversationsResult,
    leadsTodayResult,
    recentLeadsResult,
    recentEventsResult,
    recentMessagesResult,
  ] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    supabase.from("conversations").select("id", { count: "exact", head: true }),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", getStartOfTodayIso()),
    supabase
      .from("leads")
      .select(
        "id, patient_name, phone, telegram_username, source, service_interest, desired_date, notes, status, created_at, updated_at",
      )
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("event_logs")
      .select("id, event_name, actor_type, actor_id, properties, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("messages")
      .select(
        "id, conversation_id, role, message_text, message_type, created_at, conversations(id, source, external_user_id, patient_name, telegram_username, created_at)",
      )
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  [
    totalLeadsResult,
    newLeadsResult,
    totalConversationsResult,
    leadsTodayResult,
    recentLeadsResult,
    recentEventsResult,
    recentMessagesResult,
  ].forEach((result) => ensureNoError(result.error));

  const recentConversationsMap = new Map<string, ConversationWithMessage>();

  ((recentMessagesResult.data ?? []) as MessageWithConversation[]).forEach(
    (message) => {
      if (recentConversationsMap.has(message.conversation_id)) {
        return;
      }

      const conversation = getConversation(message.conversations);

      if (!conversation) {
        return;
      }

      recentConversationsMap.set(message.conversation_id, {
        ...conversation,
        latest_message: message.message_text,
        latest_message_at: message.created_at,
      });
    },
  );

  return {
    metrics: {
      totalLeads: totalLeadsResult.count ?? 0,
      newLeads: newLeadsResult.count ?? 0,
      totalConversations: totalConversationsResult.count ?? 0,
      leadsToday: leadsTodayResult.count ?? 0,
    },
    recentLeads: (recentLeadsResult.data ?? []) as Lead[],
    recentEvents: (recentEventsResult.data ?? []) as EventLog[],
    recentConversations: Array.from(recentConversationsMap.values()).slice(0, 6),
  };
}

export async function getLeads(status?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select(
      "id, patient_name, phone, telegram_username, source, service_interest, desired_date, notes, status, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const result = await query;
  ensureNoError(result.error);

  return (result.data ?? []) as Lead[];
}

export async function getStatsData(): Promise<StatsData> {
  const supabase = await createClient();

  const [
    landingViewsResult,
    telegramOpenClicksResult,
    chatStartedResult,
    leadStartedResult,
    leadCreatedResult,
    recentEventsResult,
    leadsResult,
  ] = await Promise.all([
    supabase
      .from("event_logs")
      .select("id", { count: "exact", head: true })
      .eq("event_name", "landing_view"),
    supabase
      .from("event_logs")
      .select("id", { count: "exact", head: true })
      .eq("event_name", "telegram_open_click"),
    supabase
      .from("event_logs")
      .select("id", { count: "exact", head: true })
      .eq("event_name", "chat_started"),
    supabase
      .from("event_logs")
      .select("id", { count: "exact", head: true })
      .eq("event_name", "lead_started"),
    supabase
      .from("event_logs")
      .select("id", { count: "exact", head: true })
      .eq("event_name", "lead_created"),
    supabase
      .from("event_logs")
      .select("id, event_name, actor_type, actor_id, properties, created_at")
      .in("event_name", [...funnelEvents])
      .gte("created_at", getIsoDaysAgo(6))
      .order("created_at", { ascending: true })
      .limit(1000),
    supabase
      .from("leads")
      .select(
        "id, patient_name, phone, telegram_username, source, service_interest, desired_date, notes, status, created_at, updated_at",
      )
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  [
    landingViewsResult,
    telegramOpenClicksResult,
    chatStartedResult,
    leadStartedResult,
    leadCreatedResult,
    recentEventsResult,
    leadsResult,
  ].forEach((result) => ensureNoError(result.error));

  const chatStarted = chatStartedResult.count ?? 0;
  const leadCreated = leadCreatedResult.count ?? 0;

  return {
    landingViews: landingViewsResult.count ?? 0,
    telegramOpenClicks: telegramOpenClicksResult.count ?? 0,
    chatStarted,
    leadStarted: leadStartedResult.count ?? 0,
    leadCreated,
    conversionRate:
      chatStarted > 0 ? Math.round((leadCreated / chatStarted) * 100) : 0,
    dailyFunnel: mapDailyFunnel((recentEventsResult.data ?? []) as EventLog[]),
    statusBreakdown: mapStatusBreakdown((leadsResult.data ?? []) as Lead[]),
  };
}
