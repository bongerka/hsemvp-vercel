import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";

export async function POST(request: Request) {
  if (!serverEnv.n8nEventWebhookUrl) {
    return new NextResponse(null, { status: 204 });
  }

  const body = await request.text();

  const response = await fetch(serverEnv.n8nEventWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": request.headers.get("content-type") ?? "application/json",
    },
    body,
    cache: "no-store",
  });

  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("content-type") ?? "application/json; charset=utf-8",
    },
  });
}
