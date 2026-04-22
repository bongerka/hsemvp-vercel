export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "",
  telegramBotUrl: process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ?? "",
};

export const hasSupabaseEnv = Boolean(
  publicEnv.supabaseUrl && publicEnv.supabaseAnonKey,
);

export function assertSupabaseEnv() {
  if (!hasSupabaseEnv) {
    throw new Error(
      "Не заполнены NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
}

export const serverEnv = {
  n8nChatWebhookUrl:
    process.env.N8N_CHAT_WEBHOOK_URL ??
    process.env.NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL ??
    "",
  n8nEventWebhookUrl:
    process.env.N8N_EVENT_WEBHOOK_URL ??
    process.env.NEXT_PUBLIC_N8N_EVENT_WEBHOOK_URL ??
    "",
};
