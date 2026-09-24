"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, Search, Pencil, Trash2, Copy, Image as ImageIcon, Layers } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageHeader, { EmptyState } from "@/components/app/PageHeader";
import { createItem, deleteItem, imageUrl, useStore } from "@/lib/client-store";
import { emptyPost, withoutMeta } from "@/lib/factories";
import { fmtDate, pillarColor, POST_FORMAT, POST_STATUS } from "@/lib/labels";
import type { PostStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS: (PostStatus | "tutti")[] = ["tutti", "bozza", "pronto", "programmato", "pubblicato"];

export default function ContenutiPage() {
  const router = useRouter();
  const posts = useStore((s) => s.posts);
  const images = useStore((s) => s.images);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("tutti");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return posts.filter(
      (p) => (tab === "tutti" || p.status === tab) && (!s || `${p.title} ${p.body} ${p.pillar}`.toLowerCase().includes(s)),
    );
  }, [posts, q, tab]);

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
        <Button onClick={newPost}>
          <Plus className="h-4 w-4" /> Nuovo contenuto
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border bg-white p-1">
          {TABS.map((t) => {
            const count = t === "tutti" ? posts.length : posts.filter((p) => p.status === t).length;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "tutti" ? "Tutti" : POST_STATUS[t].label}
                <span className="ml-1.5 text-xs opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="relative ml-auto w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per titolo, testo o pilastro…" className="bg-white pl-9" />
        </div>
      </div>

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
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
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
                const cover = images.find((i) => i.id === p.imageIds[0]);
                return (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => router.push(`/contenuti/${p.id}`)}>
                    <TableCell>
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-muted">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageUrl(cover)} alt="" className="h-full w-full object-cover" />
                        ) : p.format === "carosello" ? (
                          <Layers className="h-5 w-5 text-muted-foreground/50" />
                        ) : p.format === "immagine" ? (
                          <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                        ) : (
                          <FileText className="h-5 w-5 text-muted-foreground/50" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[240px]">
                      <p className="truncate font-medium">{p.title || "Senza titolo"}</p>
                      <p className="text-xs text-muted-foreground">{POST_FORMAT[p.format]}</p>
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
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", POST_STATUS[p.status].color)}>
                        {POST_STATUS[p.status].label}
                      </span>
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
      )}
    </div>
  );
}
