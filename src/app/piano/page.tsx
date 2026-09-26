"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, Plus, GripVertical, Inbox, ImageOff, CheckCircle2, Send, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { hasVisual, isoWeekday } from "@/lib/readiness";
import { useSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/app/PageHeader";
import { RobinReachDialog } from "@/components/app/RobinReach";
import { createItem, updateItem, useStore } from "@/lib/client-store";
import { emptyPost } from "@/lib/factories";
import { POST_STATUS, pillarColor } from "@/lib/labels";
import { isQueued, rescheduleOnRobinReach, syncRobinReach } from "@/lib/robinreach-client";
import type { Post } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const BACKLOG = "backlog";

const isLate = (p: Post) => p.status !== "pubblicato" && !!p.scheduledFor && new Date(p.scheduledFor).getTime() < Date.now();

function StatusIcon({ post }: { post: Post }) {
  if (post.status === "pubblicato") return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label="Pubblicato" />;
  if (isLate(post)) return <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-label="Data passata, non risulta uscito" />;
  if (isQueued(post)) return <Send className="h-3.5 w-3.5 shrink-0 text-indigo-600" aria-label="In coda su LinkedIn" />;
  return <span className={cn("h-2 w-2 shrink-0 rounded-full", POST_STATUS[post.status].dot)} />;
}

function ChipBody({ post, compact = false }: { post: Post; compact?: boolean }) {
  const time = post.scheduledFor?.slice(11, 16);
  return (
    <>
      <StatusIcon post={post} />
      {!compact && time && <span className="hidden shrink-0 font-medium text-muted-foreground sm:inline">{time}</span>}
      <span className={cn("truncate font-medium", post.status === "pubblicato" && "line-through decoration-emerald-600/40")}>
        {post.title || post.body.slice(0, 40) || "Senza titolo"}
      </span>
      {post.status !== "pubblicato" && !hasVisual(post) && (
        <ImageOff className="ml-auto h-3.5 w-3.5 shrink-0 text-red-500" aria-label="Immagine mancante" />
      )}
    </>
  );
}

const chipClass = (post: Post) =>
  cn(
    "group flex items-center gap-1.5 rounded-md border bg-white px-2 py-1.5 text-xs shadow-sm transition-shadow hover:shadow",
    post.status === "pubblicato" && "border-emerald-200 bg-emerald-50/60",
    isLate(post) && "border-amber-300 bg-amber-50",
    post.status !== "pubblicato" && !isLate(post) && !hasVisual(post) && "border-red-200 bg-red-50/50",
  );

function Chip({ post, compact = false }: { post: Post; compact?: boolean }) {
  const locked = post.status === "pubblicato";
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: post.id, disabled: locked });
  return (
    <Link
      ref={setNodeRef}
      href={`/contenuti/${post.id}`}
      {...listeners}
      {...attributes}
      title={locked ? "Pubblicato" : "Trascina per cambiare giorno"}
      className={cn(chipClass(post), "touch-manipulation", isDragging && "opacity-30", !locked && "cursor-grab")}
    >
      <ChipBody post={post} compact={compact} />
    </Link>
  );
}

function DayCell({ id, className, children }: { id: string; className?: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn(className, isOver && "bg-primary/10 ring-2 ring-inset ring-primary/40")}>
      {children}
    </div>
  );
}

export default function PianoPage() {
  const router = useRouter();
  const posts = useStore((s) => s.posts);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [dragging, setDragging] = useState<Post | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [sending, setSending] = useState<Post[] | null>(null);
  const { postingTime, postingDays } = useSettings();
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  useEffect(() => {
    syncRobinReach();
  }, []);

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
  const toQueue = inMonth.filter((p) => p.status !== "pubblicato" && !isQueued(p) && !isLate(p));
  const counts = {
    usciti: inMonth.filter((p) => p.status === "pubblicato").length,
    coda: inMonth.filter((p) => p.status !== "pubblicato" && isQueued(p)).length,
    saltati: inMonth.filter(isLate).length,
  };

  const dropOn = async (dayKey: string | null, id: string) => {
    const post = posts.find((p) => p.id === id);
    if (!post || post.status === "pubblicato") return;
    if (!dayKey) {
      if (isQueued(post)) {
        toast.error("È già in coda su LinkedIn", { description: "Spostalo su un altro giorno: toglierlo dal calendario non lo toglie da RobinReach." });
        return;
      }
      updateItem("posts", id, { scheduledFor: null, status: post.status === "programmato" ? "pronto" : post.status });
      return;
    }
    const time = post.scheduledFor?.slice(11, 16) || postingTime;
    const next = `${dayKey}T${time}`;
    if (next === post.scheduledFor) return;
    if (isQueued(post) && new Date(next).getTime() < Date.now()) {
      toast.error("Non si può spostare nel passato un post in coda su LinkedIn");
      return;
    }
    await updateItem("posts", id, {
      scheduledFor: next,
      status: post.status === "pronto" ? "programmato" : post.status,
    });
    if (isQueued(post)) {
      setMoving(id);
      const r = await rescheduleOnRobinReach(id);
      setMoving(null);
      if (r.ok) toast.success("Spostato anche su LinkedIn", { description: format(new Date(next), "EEEE d MMMM, HH:mm", { locale: it }) });
      else toast.error("Spostato qui, ma non su RobinReach", { description: r.error });
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    if (!e.over) return;
    dropOn(e.over.id === BACKLOG ? null : String(e.over.id), String(e.active.id));
  };

  const addOn = async (dayKey: string) => {
    const p = await createItem("posts", emptyPost({ scheduledFor: `${dayKey}T${postingTime}` }));
    router.push(`/contenuti/${p.id}`);
  };

  const freeSlot = (day: Date, key: string, items: Post[]) =>
    items.length === 0 && key >= todayKey && isSameMonth(day, month) && postingDays.includes(isoWeekday(day));

  const monthDays = days.filter((d) => isSameMonth(d, month));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={(e) => setDragging(posts.find((p) => p.id === e.active.id) ?? null)}
      onDragCancel={() => setDragging(null)}
      onDragEnd={onDragEnd}
    >
      <div className="space-y-6">
        <PageHeader
          title="Piano editoriale"
          subtitle={`${inMonth.length} ${inMonth.length === 1 ? "uscita" : "uscite"} a ${format(month, "MMMM yyyy", { locale: it })} · trascina i post sui giorni (dal telefono: tieni premuto e trascina)`}
        >
          {toQueue.length > 0 && (
            <Button onClick={() => setSending(toQueue)}>
              <Send className="h-4 w-4" /> Programma il mese su LinkedIn ({toQueue.length})
            </Button>
          )}
          <Button variant="outline" onClick={() => setMonth(startOfMonth(new Date()))}>
            Oggi
          </Button>
          <div className="flex items-center rounded-lg border bg-white">
            <Button variant="ghost" size="icon" onClick={() => setMonth((m) => subMonths(m, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="w-32 text-center font-heading text-sm font-semibold capitalize text-secondary sm:w-36">
              {format(month, "MMMM yyyy", { locale: it })}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setMonth((m) => addMonths(m, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </PageHeader>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> {counts.usciti} usciti
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700">
            <Send className="h-3.5 w-3.5" /> {counts.coda} in coda su LinkedIn
          </span>
          {counts.saltati > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
              <Clock className="h-3.5 w-3.5" /> {counts.saltati} con data passata, non risultano usciti
            </span>
          )}
          {moving && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sposto su RobinReach…
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_300px]">
          {/* Da telefono: un giorno per riga invece della griglia a 7 colonne. */}
          <div className="space-y-1.5 md:hidden">
            {monthDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const items = byDay.get(key) ?? [];
              const slot = freeSlot(day, key, items);
              if (!items.length && !slot && !isToday(day)) return null;
              return (
                <DayCell key={key} id={key} className="flex gap-3 rounded-lg border bg-white p-2.5">
                  <div className={cn("w-11 shrink-0 text-center", isToday(day) && "text-primary")}>
                    <p className="text-[10px] font-medium uppercase text-muted-foreground">{format(day, "EEE", { locale: it })}</p>
                    <p className="font-heading text-lg font-semibold leading-tight">{format(day, "d")}</p>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {items.map((p) => (
                      <Chip key={p.id} post={p} />
                    ))}
                    {slot && (
                      <button
                        onClick={() => addOn(key)}
                        className="w-full rounded-md border border-dashed border-primary/30 py-2 text-xs font-medium text-primary/70"
                      >
                        Slot libero
                      </button>
                    )}
                    {!items.length && !slot && <p className="py-2 text-xs text-muted-foreground">Oggi</p>}
                  </div>
                </DayCell>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-xl border bg-white shadow-sm md:block">
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
                  <DayCell
                    key={key}
                    id={key}
                    className={cn(
                      "group relative min-h-[118px] min-w-0 border-b border-r p-1.5 transition-colors [&:nth-child(7n)]:border-r-0",
                      !isSameMonth(day, month) && "bg-muted/30",
                      isWeekend(day) && isSameMonth(day, month) && "bg-slate-50/60",
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
                      {freeSlot(day, key, items) && (
                        <button
                          onClick={() => addOn(key)}
                          className="w-full rounded-md border border-dashed border-primary/30 py-1.5 text-[11px] font-medium text-primary/70 hover:bg-primary/5 hover:text-primary"
                        >
                          Slot libero
                        </button>
                      )}
                    </div>
                  </DayCell>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <DayCell id={BACKLOG} className="rounded-xl">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-heading text-base">
                    <Inbox className="h-4 w-4 text-primary" /> Da programmare
                    <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{backlog.length}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {backlog.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Tutto programmato. Trascina qui un post per toglierlo dal calendario.</p>
                  ) : (
                    backlog.map((p) => (
                      <div key={p.id} className="flex items-center gap-1">
                        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                        <div className="min-w-0 flex-1">
                          <Chip post={p} compact />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </DayCell>

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
                <div className="flex flex-wrap gap-3 border-t pt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", POST_STATUS.bozza.dot)} /> Bozza
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", POST_STATUS.pronto.dot)} /> Pronto
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", POST_STATUS.programmato.dot)} /> Programmato qui
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Send className="h-3 w-3 text-indigo-600" /> In coda su LinkedIn
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Pubblicato
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-amber-600" /> Data passata, non uscito
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div className={cn(chipClass(dragging), "w-56 rotate-2 shadow-lg")}>
            <ChipBody post={dragging} />
          </div>
        )}
      </DragOverlay>

      <RobinReachDialog posts={sending ?? []} open={sending !== null} onOpenChange={(v) => !v && setSending(null)} />
    </DndContext>
  );
}
