"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addDays, isAfter, isBefore, parseISO, startOfDay } from "date-fns";
import {
  Lightbulb,
  FileText,
  CheckCircle2,
  CalendarClock,
  Send,
  Image as ImageIcon,
  Palette,
  Plus,
  CalendarDays,
  ArrowRight,
  ImageOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createItem, useStore } from "@/lib/client-store";
import { fmtDate, IDEA_STATUS, pillarColor, POST_STATUS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { emptyPost } from "@/lib/factories";
import { hasVisual } from "@/lib/readiness";
import NextWeekHero from "@/components/app/NextWeekHero";
import { toast } from "sonner";

export default function Dashboard() {
  const router = useRouter();
  const ideas = useStore((s) => s.ideas);
  const posts = useStore((s) => s.posts);
  const images = useStore((s) => s.images);
  const designs = useStore((s) => s.designs);
  const [quick, setQuick] = useState("");

  const today = startOfDay(new Date());
  const weekEnd = addDays(today, 7);
  const upcoming = posts
    .filter((p) => p.scheduledFor && p.status !== "pubblicato" && !isBefore(parseISO(p.scheduledFor), today))
    .sort((a, b) => a.scheduledFor!.localeCompare(b.scheduledFor!));
  const thisWeek = upcoming.filter((p) => !isAfter(parseISO(p.scheduledFor!), weekEnd));

  const stats = [
    { label: "Idee grezze", value: ideas.filter((i) => i.status === "grezza").length, icon: Lightbulb, color: "text-amber-600", href: "/idee" },
    { label: "Contenuti in bozza", value: posts.filter((p) => p.status === "bozza").length, icon: FileText, color: "text-slate-600", href: "/contenuti" },
    { label: "Pronti da pubblicare", value: posts.filter((p) => p.status === "pronto").length, icon: CheckCircle2, color: "text-blue-600", href: "/contenuti" },
    { label: "In uscita questa settimana", value: thisWeek.length, icon: CalendarClock, color: "text-purple-600", href: "/piano" },
    { label: "Pubblicati", value: posts.filter((p) => p.status === "pubblicato").length, icon: Send, color: "text-emerald-600", href: "/contenuti" },
    { label: "Immagini in banca", value: images.length, icon: ImageIcon, color: "text-cyan-600", href: "/immagini" },
    { label: "Grafiche e caroselli", value: designs.length, icon: Palette, color: "text-rose-600", href: "/editor" },
    { label: "Immagini mancanti", value: posts.filter((p) => p.status !== "pubblicato" && !hasVisual(p)).length, icon: ImageOff, color: "text-red-600", href: "/da-fare" },
  ];

  const addIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = quick.trim();
    if (!title) return;
    setQuick("");
    await createItem("ideas", { title, notes: "", pillar: "", tags: [], status: "grezza" });
    toast.success("Idea salvata in banca");
  };

  const newPost = async () => {
    const p = await createItem("posts", emptyPost());
    router.push(`/contenuti/${p.id}`);
  };

  const latestIdeas = ideas.slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-secondary">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Panoramica generale della banca contenuti LinkedIn</p>
      </div>

      <NextWeekHero />

      <Card className="border-primary/20 bg-gradient-to-r from-primary/[0.06] to-transparent py-5">
        <CardContent className="px-5">
          <form onSubmit={addIdea} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 sm:w-56">
              <div className="rounded-lg bg-white p-2.5 text-amber-600 shadow-sm">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-secondary">Cattura al volo</p>
                <p className="text-xs text-muted-foreground">Un&apos;idea, un invio.</p>
              </div>
            </div>
            <Input
              value={quick}
              onChange={(e) => setQuick(e.target.value)}
              placeholder="Scrivi l'idea grezza e premi Invio…"
              className="h-11 flex-1 bg-white"
            />
            <Button type="submit" className="h-11">
              <Plus className="h-4 w-4" /> Salva idea
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="py-0 transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-6">
                <div className={cn("rounded-lg bg-muted p-3", stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading text-lg">Prossime uscite</CardTitle>
            <Link href="/piano" className="text-sm text-primary hover:underline">
              Vai al piano
            </Link>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CalendarDays className="mb-3 h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nessun post programmato.</p>
                <p className="text-xs text-muted-foreground">Trascina un contenuto pronto nel piano editoriale.</p>
              </div>
            ) : (
              <ul className="divide-y">
                {upcoming.slice(0, 6).map((p) => (
                  <li key={p.id}>
                    <Link href={`/contenuti/${p.id}`} className="flex items-center gap-4 py-3 hover:bg-muted/40">
                      <div className="w-14 shrink-0 rounded-md bg-muted py-1.5 text-center">
                        <p className="text-[10px] font-medium uppercase text-muted-foreground">
                          {fmtDate(p.scheduledFor, "EEE")}
                        </p>
                        <p className="font-heading text-lg font-bold leading-none text-secondary">
                          {fmtDate(p.scheduledFor, "d")}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.title || "Senza titolo"}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.body.split("\n")[0] || "—"}</p>
                      </div>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", POST_STATUS[p.status].color)}>
                        {POST_STATUS[p.status].label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading text-lg">Ultime idee</CardTitle>
            <Link href="/idee" className="text-sm text-primary hover:underline">
              Vedi tutte
            </Link>
          </CardHeader>
          <CardContent>
            {latestIdeas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Lightbulb className="mb-3 h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">La banca idee è vuota.</p>
                <p className="text-xs text-muted-foreground">Usa &ldquo;Cattura al volo&rdquo; qui sopra.</p>
              </div>
            ) : (
              <ul className="divide-y">
                {latestIdeas.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 py-3">
                    <Lightbulb className="h-4 w-4 shrink-0 text-amber-500" />
                    <p className="min-w-0 flex-1 truncate text-sm">{i.title}</p>
                    {i.pillar && (
                      <span className={cn("hidden rounded-full px-2 py-0.5 text-xs sm:inline", pillarColor(i.pillar))}>
                        {i.pillar}
                      </span>
                    )}
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", IDEA_STATUS[i.status].color)}>
                      {IDEA_STATUS[i.status].label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Azioni rapide</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Nuovo contenuto", icon: FileText, onClick: newPost },
            { label: "Carica immagini", icon: ImageIcon, href: "/immagini" },
            { label: "Nuova grafica o carosello", icon: Palette, href: "/editor" },
            { label: "Apri il piano editoriale", icon: CalendarDays, href: "/piano" },
          ].map((a) => {
            const inner = (
              <>
                <a.icon className="h-5 w-5 text-primary" />
                <span className="flex-1 text-left text-sm font-medium">{a.label}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </>
            );
            const cls = "group flex w-full items-center gap-3 rounded-lg border bg-white px-4 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5";
            return a.href ? (
              <Link key={a.label} href={a.href} className={cls}>
                {inner}
              </Link>
            ) : (
              <button key={a.label} onClick={a.onClick} className={cls}>
                {inner}
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
