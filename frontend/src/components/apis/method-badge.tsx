import { METHOD_COLORS } from "@/lib/api";
import { cn } from "@/lib/utils";

interface MethodBadgeProps {
  method: string;
  className?: string;
}

export function MethodBadge({ method, className }: MethodBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-xs font-semibold",
        METHOD_COLORS[method] || "bg-muted text-muted-foreground",
        className
      )}
    >
      {method}
    </span>
  );
}
