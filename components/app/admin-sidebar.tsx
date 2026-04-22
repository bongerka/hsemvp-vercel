"use client";

import Link from "next/link";
import { LayoutGrid, LogOut, MessageSquareText, PlugZap, Rows3, Shield } from "lucide-react";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Дашборд", icon: LayoutGrid },
  { href: "/admin/leads", label: "Заявки", icon: Rows3 },
  { href: "/admin/stats", label: "Статистика", icon: MessageSquareText },
  { href: "/admin/integrations", label: "Интеграции", icon: PlugZap },
];

export function AdminSidebar({
  fullName,
  email,
}: {
  fullName?: string | null;
  email?: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="panel-shadow h-fit rounded-[32px] border border-white/70 bg-white/90 p-4 lg:sticky lg:top-4">
      <div className="rounded-[24px] bg-[#16381f] p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white/10 p-3">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">
              Admin Panel
            </p>
            <p className="font-semibold">{fullName || "Администратор"}</p>
            <p className="text-sm text-white/70">{email || "admin@clinic"}</p>
          </div>
        </div>
      </div>

      <nav className="mt-4 space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/admin"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[20px] px-4 py-3 text-sm font-medium text-muted-foreground",
                isActive && "bg-accent text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <form action={signOutAction} className="mt-6">
        <Button type="submit" variant="secondary" className="w-full justify-center">
          <LogOut className="h-4 w-4" />
          Выйти
        </Button>
      </form>
    </aside>
  );
}
