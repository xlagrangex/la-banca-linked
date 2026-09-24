import { FUNNEL } from "@/lib/labels";
import type { Funnel } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function FunnelBadge({ funnel, className }: { funnel: Funnel | null | undefined; className?: string }) {
  if (!funnel) return null;
  const f = FUNNEL[funnel];
  return (
    <span title={f.hint} className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide ring-1 ring-inset", f.color, className)}>
      {f.label}
    </span>
  );
}
