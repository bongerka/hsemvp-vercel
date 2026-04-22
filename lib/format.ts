const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
});

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "—";
  }

  return dateTimeFormatter.format(new Date(value));
}

export function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  return dateFormatter.format(new Date(value));
}

export function formatSource(source?: string | null) {
  if (source === "telegram") {
    return "Telegram";
  }

  if (source === "web") {
    return "Веб-чат";
  }

  return "—";
}

export function formatStatus(status?: string | null) {
  const labels: Record<string, string> = {
    new: "Новая",
    contacted: "Связались",
    in_progress: "В работе",
    qualified: "Квалифицирована",
    closed: "Закрыта",
    cancelled: "Отменена",
  };

  return status ? labels[status] ?? status : "—";
}

export function formatEventName(eventName?: string | null) {
  const labels: Record<string, string> = {
    landing_view: "Просмотр лендинга",
    telegram_open_click: "Переход в Telegram",
    chat_started: "Старт диалога",
    lead_started: "Начало сбора заявки",
    lead_created: "Заявка создана",
    voice_transcribed: "Голос расшифрован",
    telegram_message_received: "Сообщение из Telegram",
  };

  return eventName ? labels[eventName] ?? eventName : "—";
}

export function truncate(value?: string | null, maxLength = 92) {
  if (!value) {
    return "—";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}…`;
}

export function maskUrl(value?: string | null) {
  if (!value) {
    return "Не настроено";
  }

  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value;
  }
}
