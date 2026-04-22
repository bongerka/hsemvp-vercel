import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";

export async function POST(request: Request) {
  if (!serverEnv.n8nChatWebhookUrl) {
    return NextResponse.json(
      { error: "N8N_CHAT_WEBHOOK_URL не настроен" },
      { status: 500 },
    );
  }

  const payload = await request.json();

  const response = await fetch(serverEnv.n8nChatWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("content-type") ?? "application/json; charset=utf-8",
    },
  });
}
