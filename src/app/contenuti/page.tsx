"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, Search, Pencil, Trash2, Copy, Image as ImageIcon, Layers, ImageOff, Send, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RobinReachBadge, RobinReachDialog } from "@/components/app/RobinReach";
import { syncRobinReach } from "@/lib/robinreach-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageHeader, { EmptyState } from "@/components/app/PageHeader";
import { createItem, deleteItem, imageUrl, useStore } from "@/lib/client-store";
import { emptyPost, withoutMeta } from "@/lib/factories";
import { fmtDate, FUNNEL, pillarColor, POST_STATUS, VISUAL_TYPE } from "@/lib/labels";
import FunnelBadge from "@/components/app/FunnelBadge";
import type { Funnel, Post, PostStatus } from "@/lib/types";
import { hasVisual } from "@/lib/readiness";
import IssueBadges from "@/components/app/IssueBadges";
import { cn } from "@/lib/utils";

const TABS: (PostStatus | "tutti" | "senza-immagine")[] = ["tutti", "bozza", "pronto", "programmato", "pubblicato", "senza-immagine"];

export default function ContenutiPage() {
  const router = useRouter();
  const posts = useStore((s) => s.posts);
  const images = useStore((s) => s.images);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("tutti");
  const [funnel, setFunnel] = useState<Funnel | "tutti">("tutti");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<Post[] | null>(null);

  useEffect(() => {
    syncRobinReach();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return posts.filter(
      (p) =>
        (tab === "tutti" || p.status === tab || (tab === "senza-immagine" && p.status !== "pubblicato" && !hasVisual(p))) &&
        (funnel === "tutti" || p.funnel === funnel) && (!s || `${p.title} ${p.body} ${p.pillar}`.toLowerCase().includes(s)),
    );
  }, [posts, q, tab, funnel]);

  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map((p) => p.id)));
  const selectedPosts = posts.filter((p) => selected.has(p.id));

  const cover = (p: Post) => {
    const img = images.find((i) => i.id === p.imageIds[0]);
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl(img)} alt="" className="h-full w-full object-cover" />
        ) : p.visualType === "carosello" ? (
          <Layers className="h-5 w-5 text-muted-foreground/50" />
        ) : (
          <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
        )}
      </div>
    );
  };

  const newPost = async () => {
    const p = await createItem("posts", emptyPost());
    router.push(`/contenuti/${p.id}`);
  };

  const duplicate = async (id: string) => {
    const src = posts.find((p) => p.id === id);
    if (!src) return;
    await createItem("posts", { ...withoutMeta(src), title: `${src.title} (copia)`, status: "bozza", scheduledFor: null, publishedAt: null, url: "" });
    toast.success("Contenuto duplicato");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Contenuti" subtitle={`La banca dei post già scritti (${posts.length} totali)`}>
        <Button
          variant="outline"
          onClick={() => setSending(posts.filter((p) => p.scheduledFor && p.status !== "pubblicato" && !p.robinreach))}
          title="Tutti i post con una data di uscita che non sono ancora in coda"
        >
          <Send className="h-4 w-4" /> Programma tutti su LinkedIn
        </Button>
        <Button onClick={newPost}>
          <Plus className="h-4 w-4" /> Nuovo contenuto
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <div className="-mx-4 flex max-w-[calc(100%+2rem)] overflow-x-auto px-4 sm:mx-0 sm:max-w-full sm:px-0">
        <div className="flex shrink-0 rounded-lg border bg-white p-1">
          {TABS.map((t) => {
            const count =
              t === "tutti"
                ? posts.length
                : t === "senza-immagine"
                  ? posts.filter((p) => p.status !== "pubblicato" && !hasVisual(p)).length
                  : posts.filter((p) => p.status === t).length;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "senza-immagine" ? (
                  <span className={cn("inline-flex items-center gap-1", tab !== t && count > 0 && "text-red-600")}>
                    <ImageOff className="h-3.5 w-3.5" /> Senza immagine
                  </span>
                ) : t === "tutti" ? (
                  "Tutti"
                ) : (
                  POST_STATUS[t].label
                )}
                <span className="ml-1.5 text-xs opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
        </div>
        <div className="flex rounded-lg border bg-white p-1">
          {(["tutti", "tofu", "mofu", "bofu"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFunnel(f)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-bold tracking-wide transition-colors",
                funnel === f ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "tutti" ? "Tutto il funnel" : FUNNEL[f].label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:ml-auto sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per titolo, testo o pilastro…" className="bg-white pl-9" />
        </div>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm backdrop-blur">
          <span className="font-medium">{selected.size === 1 ? "1 post selezionato" : `${selected.size} post selezionati`}</span>
          <Button size="sm" className="ml-auto" onClick={() => setSending(selectedPosts)}>
            <Send className="h-4 w-4" /> Programma su LinkedIn
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} title="Deseleziona">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nessun contenuto trovato"
          text={q ? "Prova a modificare la ricerca." : "Scrivi il primo post o trasforma un'idea in contenuto."}
        >
          {!q && (
            <Button size="sm" onClick={newPost}>
              <Plus className="h-4 w-4" /> Nuovo contenuto
            </Button>
          )}
        </EmptyState>
      ) : (
        <>
        <div className="space-y-2 md:hidden">
          <label className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} /> Seleziona tutti ({filtered.length})
          </label>
          {filtered.map((p) => (
            <div key={p.id} className="flex items-start gap-3 rounded-lg border bg-white p-3">
              <Checkbox className="mt-1" checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} aria-label="Seleziona" />
              <Link href={`/contenuti/${p.id}`} className="flex min-w-0 flex-1 gap-3">
                {cover(p)}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium">{p.title || "Senza titolo"}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", POST_STATUS[p.status].color)}>{POST_STATUS[p.status].label}</span>
                    <FunnelBadge funnel={p.funnel} />
                    <RobinReachBadge post={p} />
                    <span className="text-xs text-muted-foreground">{fmtDate(p.status === "pubblicato" ? p.publishedAt : p.scheduledFor, "d MMM")}</span>
                  </div>
                  <IssueBadges post={p} only={["immagine", "testo"]} />
                </div>
              </Link>
            </div>
          ))}
        </div>
        <div className="hidden rounded-lg border bg-white md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[36px]">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Seleziona tutti" />
                </TableHead>
                <TableHead className="w-[64px]">Visual</TableHead>
                <TableHead>Titolo</TableHead>
                <TableHead>Anteprima</TableHead>
                <TableHead>Pilastro</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Uscita</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                return (
                  <TableRow key={p.id} className="cursor-pointer" data-state={selected.has(p.id) ? "selected" : undefined} onClick={() => router.push(`/contenuti/${p.id}`)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} aria-label="Seleziona" />
                    </TableCell>
                    <TableCell>{cover(p)}</TableCell>
                    <TableCell className="max-w-[240px]">
                      <p className="truncate font-medium">{p.title || "Senza titolo"}</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <FunnelBadge funnel={p.funnel} />
                        <span className="text-xs text-muted-foreground">{p.visualType ? VISUAL_TYPE[p.visualType].label : "Immagine da scegliere"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[320px]">
                      <p className="truncate text-sm text-muted-foreground">{p.body.replace(/\s+/g, " ") || "—"}</p>
                    </TableCell>
                    <TableCell>
                      {p.pillar ? (
                        <span className={cn("rounded-full px-2 py-0.5 text-xs", pillarColor(p.pillar))}>{p.pillar}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", POST_STATUS[p.status].color)}>
                          {POST_STATUS[p.status].label}
                        </span>
                        <IssueBadges post={p} only={["immagine", "testo"]} />
                        <RobinReachBadge post={p} />
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmtDate(p.status === "pubblicato" ? p.publishedAt : p.scheduledFor)}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild title="Modifica">
                          <Link href={`/contenuti/${p.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" title="Duplica" onClick={() => duplicate(p.id)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Sposta nel cestino"
                          className="text-destructive hover:text-destructive"
                          onClick={async () => {
                            await deleteItem("posts", p.id);
                            toast("Contenuto spostato nel cestino", { description: "Recuperabile da Backup e dati." });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        </>
      )}

      <RobinReachDialog
        posts={sending ?? []}
        open={sending !== null}
        onOpenChange={(v) => !v && setSending(null)}
        onDone={() => setSelected(new Set())}
      />
    </div>
  );
}
