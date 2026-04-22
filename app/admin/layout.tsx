import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";
import { AdminSidebar } from "@/components/app/admin-sidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile } = await requireAdmin();

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <AdminSidebar fullName={profile?.full_name} email={profile?.email} />
        <main className="space-y-6 pb-10">{children}</main>
      </div>
    </div>
  );
}
