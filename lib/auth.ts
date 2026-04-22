import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export async function getCurrentSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null as User | null, profile: null as Profile | null };
  }

  const profileResult = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileResult.error) {
    throw new Error(`Не удалось загрузить профиль: ${profileResult.error.message}`);
  }

  return {
    user,
    profile: (profileResult.data ?? null) as Profile | null,
  };
}

export async function requireAdmin() {
  const session = await getCurrentSession();

  if (!session.user) {
    redirect("/login");
  }

  if (!session.profile || session.profile.role !== "admin") {
    redirect("/login?error=Нет доступа к панели администратора");
  }

  return session;
}
