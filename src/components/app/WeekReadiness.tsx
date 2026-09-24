"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, isToday, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { CheckCircle2, AlertTriangle, Plus, ImageOff, FileWarning, CircleDashed } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createItem, updateItem, useStore } from "@/lib/client-store";
import { emptyPost } from "@/lib/factories";
import { isoWeekday, postIssues, weekReport } from "@/lib/readiness";
import { useSettings } from "@/lib/settings";
import type { Post } from "@/lib/types";
import { cn } from "@/lib/utils";

const ISSUE_ICON = { immagine: ImageOff, testo: FileWarning, stato: CircleDashed } as const;

function SlotMenu({ dayKey, children }: { dayKey: string; children: React.ReactNode }) {
  const router = useRouter();
  const settings = useSettings();
  const backlog = useStore((s) => s.posts).filter((p) => !p.scheduledFor && p.status !== "pubblicato");
  const at = `${dayKey}T${settings.postingTime}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-72">
        <DropdownMenuLabel>{format(parseISO(dayKey), "EEEE d MMMM", { locale: it })}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {backlog.slice(0, 8).map((p) => (
          <DropdownMenuItem
            key={p.id}
            onClick={() => updateItem("posts", p.id, { scheduledFor: at, status: p.status === "bozza" ? "bozza" : "programmato" })}
          >
            <span className="truncate">{p.title || p.body.slice(0, 40) || "Senza titolo"}</span>
            {postIssues(p).includes("immagine") && <ImageOff className="ml-auto h-3.5 w-3.5 text-red-500" />}
          </DropdownMenuItem>
        ))}
        {backlog.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem
          onClick={async () => {
            const p = await createItem("posts", emptyPost({ scheduledFor: at }));
            router.push(`/contenuti/${p.id}`);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nuovo contenuto per questo giorno
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DayPost({ post }: { post: Post }) {
  const issues = postIssues(post);
  return (
    <Link
      href={`/contenuti/${post.id}`}
      className={cn(
        "block rounded-md border bg-white px-2 py-1.5 text-xs shadow-sm transition-shadow hover:shadow",
        issues.length ? "border-red-200" : "border-emerald-200",
      )}
    >
      <p className="truncate font-medium">{post.title || post.body.slice(0, 40) || "Senza titolo"}</p>
      <div className="mt-1 flex items-center gap-1">
        <span className="text-muted-foreground">{post.scheduledFor?.slice(11, 16)}</span>
        {issues.length === 0 ? (
          <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <span className="ml-auto flex gap-0.5">
            {issues.map((i) => {
              const I = ISSUE_ICON[i];
              return <I key={i} className={cn("h-3.5 w-3.5", i === "immagine" ? "text-red-500" : "text-orange-500")} />;
            })}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function WeekReadiness({ offset = 1, compact = false }: { offset?: number; compact?: boolean }) {
  const posts = useStore((s) => s.posts);
  const settings = useSettings();
  const rep = weekReport(posts, settings, offset);
  const notReady = rep.planned.length - rep.ready.length;
  const label = offset === 0 ? "Questa settimana" : offset === 1 ? "Prossima settimana" : `Tra ${offset} settimane`;

  return (
    <Card className={cn(rep.complete ? "border-emerald-200" : "border-amber-200")}>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="font-heading text-lg">{label}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {format(rep.start, "d MMM", { locale: it })} – {format(rep.end, "d MMM", { locale: it })} · obiettivo {settings.postsPerWeek} post
          </p>
        </div>
        {rep.complete ? (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Pronta
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            {[
              rep.missing > 0 && `${rep.missing} post da programmare`,
              notReady > 0 && `${notReady} ${notReady === 1 ? "post incompleto" : "post incompleti"}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {rep.ready.length} pronti su {Math.max(settings.postsPerWeek, rep.planned.length)}
            </span>
            <span>{rep.planned.length} programmati</span>
          </div>
          <div className="flex h-2 gap-1">
            {Array.from({ length: Math.max(settings.postsPerWeek, rep.planned.length) }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-full",
                  i < rep.ready.length ? "bg-emerald-500" : i < rep.planned.length ? "bg-amber-400" : "bg-muted",
                )}
              />
            ))}
          </div>
        </div>

        {!compact && (
          <div className="grid grid-cols-7 gap-2">
            {rep.days.map((d, i) => {
              const key = rep.keys[i];
              const dayPosts = rep.planned.filter((p) => p.scheduledFor!.startsWith(key));
              const isSlot = settings.postingDays.includes(isoWeekday(d));
              return (
                <div key={key} className={cn("min-h-[108px] rounded-lg p-1.5", isSlot ? "bg-primary/5" : "bg-muted/40")}>
                  <p className={cn("mb-1.5 px-0.5 text-[11px] font-medium uppercase", isToday(d) ? "text-primary" : "text-muted-foreground")}>
                    {format(d, "EEE d", { locale: it })}
                  </p>
                  <div className="space-y-1">
                    {dayPosts.map((p) => (
                      <DayPost key={p.id} post={p} />
                    ))}
                    {isSlot && dayPosts.length === 0 && (
                      <SlotMenu dayKey={key}>
                        <button className="flex w-full flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-primary/40 py-3 text-[11px] font-medium text-primary hover:bg-primary/10">
                          <Plus className="h-3.5 w-3.5" /> Slot libero
                        </button>
                      </SlotMenu>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
