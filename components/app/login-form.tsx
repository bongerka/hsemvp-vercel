"use client";

import { useState } from "react";
import { LoaderCircle, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/browser";
import { hasSupabaseEnv } from "@/lib/env";

export function LoginForm({
  initialError,
  initialMessage,
}: {
  initialError?: string;
  initialMessage?: string;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError ?? "");
  const [message, setMessage] = useState(initialMessage ?? "");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasSupabaseEnv) {
      setError("Supabase переменные не настроены.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/confirm?next=/admin`;

      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: false,
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      setMessage(
        "Ссылка для входа отправлена. Откройте письмо и вернитесь в панель администратора.",
      );
      setEmail("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email администратора
        </label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@clinic.example"
        />
      </div>

      {error ? (
        <div className="rounded-2xl border border-[#f1c9c9] bg-[#fff4f4] px-4 py-3 text-sm text-[#8c2f2f]">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-[#d6ead6] bg-[#f4fbf4] px-4 py-3 text-sm text-[#1d6a31]">
          {message}
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Отправляем ссылку
          </>
        ) : (
          <>
            <MailCheck className="h-4 w-4" />
            Войти по magic link
          </>
        )}
      </Button>
    </form>
  );
}
