import { Badge } from "@/components/ui/badge";
import { formatStatus } from "@/lib/format";

export function StatusBadge({ status }: { status?: string | null }) {
  const variant =
    status === "new"
      ? "warning"
      : status === "closed" || status === "qualified"
        ? "success"
        : "neutral";

  return <Badge variant={variant}>{formatStatus(status)}</Badge>;
}
