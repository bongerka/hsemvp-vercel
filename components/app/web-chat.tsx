"use client";

import { useState } from "react";
import { LoaderCircle, SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
}

function getSessionId() {
  const key = "clinic-admin-chat-session";
  const existing = window.localStorage.getItem(key);

  if (existing) {
    return existing;
  }

  const generated = `${crypto.randomUUID()}`;
  window.localStorage.setItem(key, generated);
  return generated;
}

export function WebChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Здравствуйте. Я AI-помощник администратора клиники. Могу подсказать цены, режим работы, подготовку к визиту и помочь оставить заявку на запись.",
    },
  ]);
  const [sessionId, setSessionId] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isConfigured = true;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!input.trim() || !isConfigured) {
      return;
    }

    const question = input.trim();
    const nextMessages = [
      ...messages,
      {
        id: `${Date.now()}-user`,
        role: "user" as const,
        text: question,
      },
    ];

    const activeSessionId = sessionId || getSessionId();
    if (!sessionId) {
      setSessionId(activeSessionId);
    }

    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/web-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "web",
          sessionId: activeSessionId,
          message: question,
          metadata: {
            page: "/chat",
          },
        }),
      });

      if (!response.ok) {
        throw new Error("n8n webhook вернул ошибку");
      }

      const data = (await response.json()) as {
        answer?: string;
        response?: string;
        reply?: string;
        leadCreated?: boolean;
      };

      const answer =
        data.answer ??
        data.response ??
        data.reply ??
        "Извините, сейчас не получилось подготовить ответ.";

      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          text: answer,
        },
      ]);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Не удалось обратиться к webhook.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {!isConfigured ? (
        <div className="rounded-[24px] border border-dashed border-border bg-white/80 p-5 text-sm text-muted-foreground">
          Укажите `N8N_CHAT_WEBHOOK_URL`, чтобы включить демо веб-чата.
        </div>
      ) : null}

      <div className="space-y-3 rounded-[28px] border border-white/70 bg-white/85 p-4 panel-shadow">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("max-w-[88%] rounded-[24px] px-4 py-3 text-sm leading-6", {
              "bg-accent text-accent-foreground": message.role === "assistant",
              "ml-auto bg-[#16381f] text-white": message.role === "user",
            })}
          >
            {message.text}
          </div>
        ))}

        {loading ? (
          <div className="inline-flex items-center gap-2 rounded-[24px] bg-accent px-4 py-3 text-sm text-accent-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Ассистент думает
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-2xl border border-[#f1c9c9] bg-[#fff4f4] px-4 py-3 text-sm text-[#8c2f2f]">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="rounded-[28px] border border-white/70 bg-white/85 p-4 panel-shadow">
        <div className="flex flex-col gap-3 sm:flex-row">
          <textarea
            className="min-h-[96px] flex-1 rounded-[20px] border border-border bg-white px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Например: сколько стоит первичный прием и как подготовиться к анализам?"
          />
          <Button type="submit" disabled={loading || !isConfigured || !input.trim()} className="sm:self-end">
            <SendHorizonal className="h-4 w-4" />
            Отправить
          </Button>
        </div>
      </form>
    </div>
  );
}
