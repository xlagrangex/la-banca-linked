"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  isWeekend,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { it } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, GripVertical, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/app/PageHeader";
import { createItem, updateItem, useStore } from "@/lib/client-store";
import { emptyPost } from "@/lib/factories";
import { POST_STATUS, pillarColor } from "@/lib/labels";
import type { Post } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

function Chip({ post, compact = false }: { post: Post; compact?: boolean }) {
  const time = post.scheduledFor?.slice(11, 16);
  return (
    <Link
      href={`/contenuti/${post.id}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/post-id", post.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "group flex items-center gap-1.5 rounded-md border bg-white px-2 py-1.5 text-xs shadow-sm transition-shadow hover:shadow",
        post.status === "pubblicato" && "opacity-70",
      )}
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", POST_STATUS[post.status].dot)} />
      {!compact && time && <span className="shrink-0 font-medium text-muted-foreground">{time}</span>}
      <span className="truncate font-medium">{post.title || post.body.slice(0, 40) || "Senza titolo"}</span>
    </Link>
  );
}

export default function PianoPage() {
  const router = useRouter();
  const posts = useStore((s) => s.posts);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [over, setOver] = useState<string | null>(null);

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
      }),
    [month],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const p of posts) {
      if (!p.scheduledFor) continue;
      const key = p.scheduledFor.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), p].sort((a, b) => a.scheduledFor!.localeCompare(b.scheduledFor!)));
    }
    return map;
  }, [posts]);

  const backlog = posts.filter((p) => !p.scheduledFor && p.status !== "pubblicato");
  const monthKey = format(month, "yyyy-MM");
  const inMonth = posts.filter((p) => p.scheduledFor?.startsWith(monthKey));

  const dropOn = (dayKey: string | null, id: string) => {
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    if (!dayKey) {
      updateItem("posts", id, { scheduledFor: null, status: post.status === "programmato" ? "pronto" : post.status });
      return;
    }
    const time = post.scheduledFor?.slice(11, 16) || "09:00";
    updateItem("posts", id, {
      scheduledFor: `${dayKey}T${time}`,
      status: post.status === "bozza" || post.status === "pronto" ? "programmato" : post.status,
    });
  };

  const addOn = async (dayKey: string) => {
    const p = await createItem("posts", emptyPost({ scheduledFor: `${dayKey}T09:00`, status: "programmato" }));
    router.push(`/contenuti/${p.id}`);
  };

  const dropProps = (key: string | null) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(key ?? "backlog");
    },
    onDragLeave: () => setOver(null),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(null);
      const id = e.dataTransfer.getData("text/post-id");
      if (id) dropOn(key, id);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Piano editoriale"
        subtitle={`${inMonth.length} ${inMonth.length === 1 ? "uscita" : "uscite"} a ${format(month, "MMMM yyyy", { locale: it })} · trascina i contenuti sui giorni`}
      >
        <Button variant="outline" onClick={() => setMonth(startOfMonth(new Date()))}>
          Oggi
        </Button>
        <div className="flex items-center rounded-lg border bg-white">
          <Button variant="ghost" size="icon" onClick={() => setMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="w-36 text-center font-heading text-sm font-semibold capitalize text-secondary">
            {format(month, "MMMM yyyy", { locale: it })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_300px]">
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="grid grid-cols-7 border-b bg-muted/40">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const items = byDay.get(key) ?? [];
              return (
                <div
                  key={key}
                  {...dropProps(key)}
                  className={cn(
                    "group relative min-h-[118px] border-b border-r p-1.5 transition-colors [&:nth-child(7n)]:border-r-0",
                    !isSameMonth(day, month) && "bg-muted/30",
                    isWeekend(day) && isSameMonth(day, month) && "bg-slate-50/60",
                    over === key && "bg-primary/10 ring-2 ring-inset ring-primary/40",
                  )}
                >
                  <div className="mb-1 flex items-center justify-between px-1">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                        isToday(day) ? "bg-primary text-white" : isSameMonth(day, month) ? "text-foreground" : "text-muted-foreground/60",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    <button
                      onClick={() => addOn(key)}
                      title="Nuovo contenuto in questo giorno"
                      className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-primary group-hover:opacity-100"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {items.map((p) => (
                      <Chip key={p.id} post={p} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <Card
            {...dropProps(null)}
            className={cn("transition-colors", over === "backlog" && "bg-primary/5 ring-2 ring-primary/40")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-base">
                <Inbox className="h-4 w-4 text-primary" /> Da programmare
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {backlog.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {backlog.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Tutto programmato. Trascina qui un post per toglierlo dal calendario.
                </p>
              ) : (
                backlog.map((p) => (
                  <div key={p.id} className="flex items-center gap-1">
                    <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/50" />
                    <div className="min-w-0 flex-1">
                      <Chip post={p} compact />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">Mix del mese</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {inMonth.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessuna uscita questo mese.</p>
              ) : (
                Object.entries(
                  inMonth.reduce<Record<string, number>>((acc, p) => {
                    const k = p.pillar || "Senza pilastro";
                    acc[k] = (acc[k] ?? 0) + 1;
                    return acc;
                  }, {}),
                )
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, n]) => (
                    <div key={k} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className={cn("rounded-full px-2 py-0.5", pillarColor(k))}>{k}</span>
                        <span className="text-muted-foreground">{n}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(n / inMonth.length) * 100}%` }} />
                      </div>
                    </div>
                  ))
              )}
              <div className="flex flex-wrap gap-3 border-t pt-3">
                {Object.values(POST_STATUS).map((s) => (
                  <span key={s.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={cn("h-2 w-2 rounded-full", s.dot)} /> {s.label}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
