import { cn } from "@/lib/utils";

interface Series {
  label: string;
  value: number;
  tone?: "primary" | "secondary" | "muted";
}

export function SimpleBarChart({
  title,
  description,
  series,
}: {
  title: string;
  description: string;
  series: Series[];
}) {
  const maxValue = Math.max(...series.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-3">
        {series.map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium text-foreground">{item.value}</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className={cn("h-2 rounded-full", {
                  "bg-[var(--chart-1)]": item.tone === "primary" || !item.tone,
                  "bg-[var(--chart-2)]": item.tone === "secondary",
                  "bg-[var(--chart-3)]": item.tone === "muted",
                })}
                style={{ width: `${Math.max((item.value / maxValue) * 100, 6)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
