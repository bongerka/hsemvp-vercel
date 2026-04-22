export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export type SourceType = "telegram" | "web";
export type MessageRole = "user" | "assistant" | "system";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  patient_name: string | null;
  phone: string | null;
  telegram_username: string | null;
  source: SourceType;
  service_interest: string | null;
  desired_date: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  source: SourceType;
  external_user_id: string | null;
  patient_name: string | null;
  telegram_username: string | null;
  created_at: string;
}

export interface ConversationWithMessage extends Conversation {
  latest_message: string | null;
  latest_message_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  message_text: string | null;
  message_type: string;
  created_at: string;
}

export interface MessageWithConversation extends Message {
  conversations: Conversation | Conversation[] | null;
}

export interface EventLog {
  id: string;
  event_name: string;
  actor_type: string | null;
  actor_id: string | null;
  properties: Json | null;
  created_at: string;
}

export interface DashboardMetrics {
  totalLeads: number;
  newLeads: number;
  totalConversations: number;
  leadsToday: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  recentLeads: Lead[];
  recentEvents: EventLog[];
  recentConversations: ConversationWithMessage[];
}

export interface DayMetric {
  label: string;
  chats: number;
  leads: number;
  createdLeads: number;
}

export interface StatusMetric {
  label: string;
  value: number;
}

export interface StatsData {
  landingViews: number;
  telegramOpenClicks: number;
  chatStarted: number;
  leadStarted: number;
  leadCreated: number;
  conversionRate: number;
  dailyFunnel: DayMetric[];
  statusBreakdown: StatusMetric[];
}
