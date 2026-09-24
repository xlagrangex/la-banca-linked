"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarCheck2, CheckCircle2, AlertTriangle, ImageOff, Plus, ArrowRight } from "lucide-react";
import { imageUrl, useStore } from "@/lib/client-store";
import { MIN_POSTS_PER_WEEK, postIssues, weekReport } from "@/lib/readiness";
import { useSettings } from "@/lib/settings";
import { pillarColor, VISUAL_TYPE } from "@/lib/labels";
import FunnelBadge from "./FunnelBadge";
import type { Post } from "@/lib/types";
import { cn } from "@/lib/utils";
import SlideView, { FORMATS } from "@/components/design/SlideView";
import IssueBadges from "./IssueBadges";
import SlotMenu from "./SlotMenu";

const THUMB_H = 150;

function Visual({ post }: { post: Post }) {
  const design = useStore((s) => (post.designId ? s.designs.find((d) => d.id === post.designId) : undefined));
  const img = useStore((s) => s.images.find((i) => i.id === post.imageIds[0]));
  if (design) {
    const { h } = FORMATS[design.format];
    return (
      <div className="flex h-[150px] items-center justify-center overflow-hidden bg-muted/60">
        <SlideView slide={design.slides[0]} format={design.format} scale={THUMB_H / h} />
      </div>
    );
  }
  if (img)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl(img)} alt="" className="h-[150px] w-full object-cover" />
    );
  return (
    <div className="flex h-[150px] flex-col items-center justify-center gap-1.5 bg-red-50 text-red-600">
      <ImageOff className="h-7 w-7" />
      <span className="text-xs font-semibold">Immagine mancante</span>
      {post.visualType && <span className="text-[11px] text-red-500">serve: {VISUAL_TYPE[post.visualType].label.toLowerCase()}</span>}
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const ready = postIssues(post).length === 0;
  return (
    <Link
      href={`/contenuti/${post.id}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg",
        ready ? "border-emerald-200" : "border-red-200",
      )}
    >
      <div className="relative">
        <Visual post={post} />
        <div className="absolute left-3 top-3 rounded-lg bg-white/95 px-2.5 py-1 text-center shadow">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">
            {format(parseISO(post.scheduledFor!), "EEE", { locale: it })}
          </p>
          <p className="font-heading text-xl font-bold leading-none text-secondary">{format(parseISO(post.scheduledFor!), "d")}</p>
        </div>
        {ready && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow">
            <CheckCircle2 className="h-3.5 w-3.5" /> Pronto
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">ore {post.scheduledFor!.slice(11, 16)}</p>
          <FunnelBadge funnel={post.funnel} />
        </div>
        <p className="line-clamp-2 font-heading font-semibold leading-snug text-secondary">
          {post.title || post.body.split("\n")[0] || "Senza titolo"}
        </p>
        {post.body && <p className="line-clamp-2 text-sm text-muted-foreground">{post.body.replace(/\s+/g, " ")}</p>}
        <div className="mt-auto flex flex-wrap gap-1 pt-1">
          {post.pillar && <span className={cn("rounded-full px-2 py-0.5 text-xs", pillarColor(post.pillar))}>{post.pillar}</span>}
          <IssueBadges post={post} />
        </div>
      </div>
    </Link>
  );
}

export default function NextWeekHero() {
  const posts = useStore((s) => s.posts);
  const settings = useSettings();
  const rep = weekReport(posts, settings, 1);
  const target = Math.max(MIN_POSTS_PER_WEEK, settings.postsPerWeek);
  const notReady = rep.planned.length - rep.ready.length;
  const emptySlots = rep.freeSlots.slice(0, rep.missing);
  const extraEmpty = Math.max(0, rep.missing - emptySlots.length);

  return (
    <section
      className={cn(
        "rounded-2xl border-2 bg-white p-6 shadow-sm",
        rep.complete ? "border-emerald-300" : "border-primary/30",
      )}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary p-3 text-white shadow-sm">
            <CalendarCheck2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold text-secondary">Post della prossima settimana</h2>
            <p className="text-sm text-muted-foreground">
              {format(rep.start, "d MMMM", { locale: it })} – {format(rep.end, "d MMMM", { locale: it })} · almeno {target} post
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-heading text-3xl font-bold text-secondary">
            {rep.planned.length}
            <span className="text-lg text-muted-foreground">/{target}</span>
          </span>
          {rep.complete ? (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Settimana pronta
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              {[rep.missing > 0 && `mancano ${rep.missing} post`, notReady > 0 && `${notReady} da completare`].filter(Boolean).join(" · ")}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {rep.planned.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
        {emptySlots.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          return (
            <SlotMenu key={key} dayKey={key}>
              <button className="flex min-h-[290px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/[0.03] text-primary transition-colors hover:border-primary/60 hover:bg-primary/5">
                <Plus className="h-7 w-7" />
                <span className="font-heading font-semibold capitalize">{format(d, "EEEE d", { locale: it })}</span>
                <span className="text-xs text-muted-foreground">Slot libero · scegli o crea un post</span>
              </button>
            </SlotMenu>
          );
        })}
        {Array.from({ length: extraEmpty }, (_, i) => (
          <Link
            key={`extra-${i}`}
            href="/piano"
            className="flex min-h-[290px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/[0.03] text-primary hover:bg-primary/5"
          >
            <Plus className="h-7 w-7" />
            <span className="font-heading font-semibold">Post da programmare</span>
            <span className="text-xs text-muted-foreground">Aggiungi un giorno di uscita nel piano</span>
          </Link>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <Link href="/da-fare" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          Vedi cosa manca <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
