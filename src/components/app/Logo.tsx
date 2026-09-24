import { cn } from "@/lib/utils";

export default function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
        <span className="font-heading text-[15px] font-bold leading-none">in</span>
        <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-secondary" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="font-heading text-[15px] font-bold text-secondary">
            La banca <span className="text-primary">Linked</span>
          </p>
          <p className="text-[11px] text-muted-foreground">banca contenuti LinkedIn</p>
        </div>
      )}
    </div>
  );
}
