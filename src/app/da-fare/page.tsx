"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import {
  ListTodo,
  ImageOff,
  FileWarning,
  CircleDashed,
  CalendarPlus,
  Clock,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle2,
  Settings2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import PageHeader from "@/components/app/PageHeader";
import WeekReadiness from "@/components/app/WeekReadiness";
import { createItem, deleteItem, updateItem, useStore } from "@/lib/client-store";
import { buildAutoTasks, type AutoTask } from "@/lib/tasks";
import { saveSettings, useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

const KIND: Record<AutoTask["kind"], { icon: React.ElementType; cls: string }> = {
  immagine: { icon: ImageOff, cls: "bg-red-50 text-red-600" },
  testo: { icon: FileWarning, cls: "bg-orange-50 text-orange-600" },
  stato: { icon: CircleDashed, cls: "bg-slate-100 text-slate-600" },
  slot: { icon: CalendarPlus, cls: "bg-primary/10 text-primary" },
  scaduto: { icon: Clock, cls: "bg-amber-50 text-amber-700" },
};

const DAYS = ["L", "M", "M", "G", "V", "S", "D"];

function dayLabel(key: string) {
  const today = format(new Date(), "yyyy-MM-dd");
  if (key === today) return "Oggi";
  if (key < today) return `Scaduto · ${format(parseISO(key), "d MMM", { locale: it })}`;
  return format(parseISO(key), "EEE d MMM", { locale: it });
}

export default function DaFarePage() {
  const posts = useStore((s) => s.posts);
  const todos = useStore((s) => s.todos);
  const savedSettings = useStore((s) => s.settings[0]);
  const settings = useSettings();
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const auto = buildAutoTasks(posts, settings);
  const open = todos.filter((t) => !t.done).sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  const done = todos.filter((t) => t.done);
  const imageMissing = auto.filter((t) => t.kind === "immagine").length;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    await createItem("todos", { text: text.trim(), done: false, dueDate: due || null, postId: null });
    setText("");
    setDue("");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Da fare"
        subtitle={`${auto.length + open.length} cose aperte${imageMissing ? ` · ${imageMissing} ${imageMissing === 1 ? "immagine mancante" : "immagini mancanti"}` : ""}`}
      >
        <Button variant="outline" onClick={() => setShowSettings((v) => !v)}>
          <Settings2 className="h-4 w-4" /> Ritmo di pubblicazione
        </Button>
      </PageHeader>

      {showSettings && (
        <Card className="py-4">
          <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-4 px-5">
            <label className="flex items-center gap-2 text-sm">
              Post a settimana
              <Input
                type="number"
                min={1}
                max={14}
                value={settings.postsPerWeek}
                onChange={(e) => saveSettings({ postsPerWeek: Math.max(1, Number(e.target.value) || 1) }, savedSettings)}
                className="h-9 w-20"
              />
            </label>
            <div className="flex items-center gap-2 text-sm">
              Giorni di uscita
              <div className="flex gap-1">
                {DAYS.map((d, i) => {
                  const n = i + 1;
                  const on = settings.postingDays.includes(n);
                  return (
                    <button
                      key={n}
                      onClick={() =>
                        saveSettings(
                          { postingDays: on ? settings.postingDays.filter((x) => x !== n) : [...settings.postingDays, n].sort() },
                          savedSettings,
                        )
                      }
                      className={cn(
                        "h-9 w-9 rounded-md text-sm font-medium transition-colors",
                        on ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              Ora predefinita
              <Input
                type="time"
                value={settings.postingTime}
                onChange={(e) => saveSettings({ postingTime: e.target.value || "09:00" }, savedSettings)}
                className="h-9 w-28"
              />
            </label>
          </CardContent>
        </Card>
      )}

      <WeekReadiness offset={1} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg">
              Dai contenuti
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{auto.length}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">Si aggiornano da sole: spariscono quando il post è completo.</p>
          </CardHeader>
          <CardContent>
            {auto.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-500/40" />
                <p className="text-sm text-muted-foreground">Tutto in ordine: ogni post programmato ha testo e immagine.</p>
              </div>
            ) : (
              <ul className="divide-y">
                {auto.map((t) => {
                  const { icon: Icon, cls } = KIND[t.kind];
                  const href = t.postId ? `/contenuti/${t.postId}` : "/piano";
                  return (
                    <li key={t.key}>
                      <Link href={href} className="group flex items-center gap-3 py-3">
                        <span className={cn("rounded-lg p-2", cls)}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{t.text}</p>
                          <p className={cn("text-xs", t.kind === "scaduto" ? "text-amber-700" : "text-muted-foreground")}>
                            {dayLabel(t.date)}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg">
              Le mie cose da fare
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{open.length}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">Fare foto, chiedere un permesso, recuperare un dato…</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={add} className="flex gap-2">
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Aggiungi una cosa da fare…" className="flex-1" />
              <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-40" />
              <Button type="submit" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </form>
            {open.length === 0 && done.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <ListTodo className="mb-3 h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nessuna cosa da fare aggiunta a mano.</p>
              </div>
            ) : (
              <ul className="divide-y">
                {[...open, ...done].map((t) => (
                  <li key={t.id} className="group flex items-center gap-3 py-2.5">
                    <Checkbox checked={t.done} onCheckedChange={(v) => updateItem("todos", t.id, { done: v === true })} />
                    <p className={cn("min-w-0 flex-1 text-sm", t.done && "text-muted-foreground line-through")}>{t.text}</p>
                    {t.dueDate && (
                      <span
                        className={cn(
                          "text-xs",
                          !t.done && t.dueDate < format(new Date(), "yyyy-MM-dd") ? "font-medium text-amber-700" : "text-muted-foreground",
                        )}
                      >
                        {dayLabel(t.dueDate)}
                      </span>
                    )}
                    <button
                      onClick={() => deleteItem("todos", t.id)}
                      title="Sposta nel cestino"
                      className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
