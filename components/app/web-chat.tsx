"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Здравствуйте. Я AI-помощник администратора клиники. Могу подсказать цены, режим работы, подготовку к визиту и помочь оставить заявку на запись.",
};

function getSessionId() {
  const key = "clinic-admin-chat-session";
  const existing = window.localStorage.getItem(key);

  if (existing) {
    return existing;
  }

  const generated = crypto.randomUUID();
  window.localStorage.setItem(key, generated);
  return generated;
}

export function WebChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [sessionId, setSessionId] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function sendMessage(question: string) {
    const activeSessionId = sessionId || getSessionId();
    if (!sessionId) {
      setSessionId(activeSessionId);
    }

    setMessages((current) => [
      ...current,
      {
        id: `${Date.now()}-user`,
        role: "user" as const,
        text: question,
      },
    ]);
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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input.trim();
    if (!question || loading) {
      return;
    }
    void sendMessage(question);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const question = input.trim();
      if (!question || loading) {
        return;
      }
      void sendMessage(question);
    }
  }

  function handleReset() {
    setMessages([WELCOME_MESSAGE]);
    setInput("");
    setError("");
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="max-h-[520px] space-y-3 overflow-y-auto rounded-[28px] border border-white/70 bg-white/85 p-4 panel-shadow">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "max-w-[88%] whitespace-pre-wrap rounded-[24px] px-4 py-3 text-sm leading-6",
                {
                  "bg-accent text-accent-foreground": message.role === "assistant",
                  "ml-auto bg-[#16381f] text-white": message.role === "user",
                },
              )}
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

          <div ref={messagesEndRef} />
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-[#f1c9c9] bg-[#fff4f4] px-4 py-3 text-sm text-[#8c2f2f]">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="rounded-[28px] border border-white/70 bg-white/85 p-4 panel-shadow"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <textarea
            className="min-h-[96px] flex-1 resize-none rounded-[20px] border border-border bg-white px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Например: сколько стоит первичный прием и как подготовиться к анализам?"
            disabled={loading}
          />
          <div className="flex flex-col gap-2 sm:self-end">
            <Button type="submit" disabled={loading || !input.trim()}>
              <SendHorizonal className="h-4 w-4" />
              Отправить
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleReset}
              disabled={loading || messages.length <= 1}
            >
              Очистить
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Enter — отправить, Shift+Enter — новая строка.
        </p>
      </form>
    </div>
  );
}
