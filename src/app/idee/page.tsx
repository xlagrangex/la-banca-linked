"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, Plus, Search, Trash2, ArrowRightCircle, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader, { EmptyState } from "@/components/app/PageHeader";
import PillarInput from "@/components/app/PillarInput";
import { createItem, deleteItem, updateItem, useStore } from "@/lib/client-store";
import { emptyPost } from "@/lib/factories";
import { fmtDate, IDEA_STATUS, PILLARS, pillarColor } from "@/lib/labels";
import type { Idea, IdeaStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS: (IdeaStatus | "tutte")[] = ["tutte", "grezza", "in-lavorazione", "usata", "scartata"];

export default function IdeePage() {
  const router = useRouter();
  const ideas = useStore((s) => s.ideas);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("grezza");
  const [pillar, setPillar] = useState("tutti");
  const [quick, setQuick] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const open = ideas.find((i) => i.id === openId) ?? null;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ideas.filter(
      (i) =>
        (tab === "tutte" || i.status === tab) &&
        (pillar === "tutti" || i.pillar === pillar) &&
        (!s || `${i.title} ${i.notes} ${i.tags.join(" ")}`.toLowerCase().includes(s)),
    );
  }, [ideas, q, tab, pillar]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = quick.trim();
    if (!title) return;
    setQuick("");
    await createItem("ideas", {
      title,
      notes: "",
      pillar: pillar === "tutti" ? "" : pillar,
      tags: [],
      status: "grezza",
    });
  };

  const toPost = async (idea: Idea) => {
    const post = await createItem(
      "posts",
      emptyPost({ title: idea.title, body: idea.notes, pillar: idea.pillar, ideaId: idea.id }),
    );
    await updateItem("ideas", idea.id, { status: "in-lavorazione" });
    toast.success("Contenuto creato dall'idea");
    router.push(`/contenuti/${post.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Idee grezze"
        subtitle={`Il serbatoio: tutto quello che potrebbe diventare un post (${ideas.length} totali)`}
      />

      <form onSubmit={add} className="flex gap-2">
        <div className="relative flex-1">
          <Lightbulb className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500" />
          <Input
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            placeholder="Nuova idea grezza… (Invio per salvare)"
            className="h-11 bg-white pl-9"
          />
        </div>
        <Button type="submit" className="h-11">
          <Plus className="h-4 w-4" /> Aggiungi
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex max-w-full overflow-x-auto rounded-lg border bg-white p-1">
          {TABS.map((t) => {
            const count = t === "tutte" ? ideas.length : ideas.filter((i) => i.status === t).length;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "tutte" ? "Tutte" : IDEA_STATUS[t].label}
                <span className="ml-1.5 text-xs opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
        <Select value={pillar} onValueChange={setPillar}>
          <SelectTrigger className="w-full bg-white sm:w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti i pilastri</SelectItem>
            {PILLARS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca nelle idee…" className="bg-white pl-9" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="Nessuna idea qui"
          text={q ? "Prova a cambiare la ricerca o i filtri." : "Scrivi la prima idea nel campo qui sopra: basta una riga."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((i) => (
            <button
              key={i.id}
              onClick={() => setOpenId(i.id)}
              className="group flex flex-col rounded-xl border bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", IDEA_STATUS[i.status].color)}>
                  {IDEA_STATUS[i.status].label}
                </span>
                <span className="text-xs text-muted-foreground">{fmtDate(i.createdAt, "d MMM")}</span>
              </div>
              <p className="font-heading text-[15px] font-semibold leading-snug text-secondary">{i.title}</p>
              {i.notes && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{i.notes}</p>}
              <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                {i.pillar && (
                  <span className={cn("rounded-full px-2 py-0.5 text-xs", pillarColor(i.pillar))}>{i.pillar}</span>
                )}
                {i.tags.map((t) => (
                  <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    #{t}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
        <DialogContent className="sm:max-w-2xl">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-secondary">Idea</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Titolo / gancio</Label>
                  <Input
                    value={open.title}
                    onChange={(e) => updateItem("ideas", open.id, { title: e.target.value }, 600)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Appunti</Label>
                  <Textarea
                    rows={7}
                    value={open.notes}
                    placeholder="Contesto, la storia vera, dettagli, link…"
                    onChange={(e) => updateItem("ideas", open.id, { notes: e.target.value }, 600)}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Pilastro</Label>
                    <PillarInput value={open.pillar} onChange={(v) => updateItem("ideas", open.id, { pillar: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Stato</Label>
                    <Select
                      value={open.status}
                      onValueChange={(v) => updateItem("ideas", open.id, { status: v as IdeaStatus })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(IDEA_STATUS) as IdeaStatus[]).map((s) => (
                          <SelectItem key={s} value={s}>
                            {IDEA_STATUS[s].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" /> Tag (separati da virgola)
                  </Label>
                  <Input
                    defaultValue={open.tags.join(", ")}
                    onBlur={(e) =>
                      updateItem("ideas", open.id, {
                        tags: e.target.value.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean),
                      })
                    }
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={async () => {
                    await deleteItem("ideas", open.id);
                    setOpenId(null);
                    toast("Idea spostata nel cestino", { description: "Recuperabile da Backup e dati." });
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Sposta nel cestino
                </Button>
                <Button onClick={() => toPost(open)}>
                  <ArrowRightCircle className="h-4 w-4" /> Trasforma in contenuto
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
