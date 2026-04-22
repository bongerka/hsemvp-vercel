"use client";

import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="rounded-[28px] border border-[#f1c9c9] bg-white/90 p-6 panel-shadow">
      <h2 className="text-xl font-semibold">Не удалось загрузить раздел</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={reset} className="mt-4">
        Попробовать снова
      </Button>
    </div>
  );
}
