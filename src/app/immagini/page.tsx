"use client";

import { useMemo, useRef, useState } from "react";
import { Image as ImageIcon, Search, Upload, Trash2, Download, Palette, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageHeader, { EmptyState } from "@/components/app/PageHeader";
import { deleteItem, imageUrl, updateItem, uploadImages, useStore } from "@/lib/client-store";
import { fmtDate } from "@/lib/labels";
import { cn } from "@/lib/utils";

const kb = (n: number) => (n > 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.round(n / 1000)} KB`);

export default function ImmaginiPage() {
  const images = useStore((s) => s.images);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [source, setSource] = useState<"tutte" | "upload" | "editor">("tutte");
  const [dragging, setDragging] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const open = images.find((i) => i.id === openId);

  const allTags = useMemo(() => [...new Set(images.flatMap((i) => i.tags))].sort(), [images]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return images.filter(
      (i) =>
        (source === "tutte" || i.source === source) &&
        (!tag || i.tags.includes(tag)) &&
        (!s || `${i.name} ${i.tags.join(" ")}`.toLowerCase().includes(s)),
    );
  }, [images, q, tag, source]);

  const onFiles = async (files: FileList | File[] | null) => {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    const created = await uploadImages(list);
    toast.success(`${created.length} ${created.length === 1 ? "immagine salvata" : "immagini salvate"} in banca`);
  };

  return (
    <div
      className="space-y-6"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onFiles(e.dataTransfer.files);
      }}
    >
      <PageHeader title="Immagini" subtitle={`Foto, screenshot e grafiche esportate (${images.length} totali)`}>
        <Button onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4" /> Carica immagini
        </Button>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      </PageHeader>

      <div
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-white py-6 text-sm text-muted-foreground transition-colors",
          dragging ? "border-primary bg-primary/5 text-primary" : "hover:border-primary/40",
        )}
      >
        <UploadCloud className="h-6 w-6" />
        Trascina qui le immagini, oppure clicca per sceglierle
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border bg-white p-1">
          {(["tutte", "upload", "editor"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                source === s ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s === "tutte" ? "Tutte" : s === "upload" ? "Caricate" : "Dall'editor"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setTag(tag === t ? null : t)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs transition-colors",
                tag === t ? "bg-primary text-white" : "bg-white text-muted-foreground ring-1 ring-border hover:text-foreground",
              )}
            >
              #{t}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per nome o tag…" className="bg-white pl-9" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ImageIcon} title="Nessuna immagine" text="Carica foto, screenshot di siti, loghi: tutto resta sul tuo Mac." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {filtered.map((img) => (
            <button
              key={img.id}
              onClick={() => setOpenId(img.id)}
              className="group overflow-hidden rounded-xl border bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="checker relative aspect-square overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(img)} alt={img.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                {img.source === "editor" && (
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                    <Palette className="h-3 w-3" /> Editor
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium">{img.name}</p>
                <p className="text-xs text-muted-foreground">
                  {img.width}×{img.height} · {kb(img.size)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
        <DialogContent className="sm:max-w-3xl">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-secondary">{open.name}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-5 md:grid-cols-[1fr_260px]">
                <div className="checker flex max-h-[60vh] items-center justify-center overflow-hidden rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl(open)} alt={open.name} className="max-h-[60vh] object-contain" />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input value={open.name} onChange={(e) => updateItem("images", open.id, { name: e.target.value }, 600)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tag (separati da virgola)</Label>
                    <Input
                      defaultValue={open.tags.join(", ")}
                      placeholder="es. cliente, screenshot, ritratto"
                      onBlur={(e) =>
                        updateItem("images", open.id, {
                          tags: e.target.value.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean),
                        })
                      }
                    />
                  </div>
                  <dl className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between"><dt>Dimensioni</dt><dd>{open.width}×{open.height}</dd></div>
                    <div className="flex justify-between"><dt>Peso</dt><dd>{kb(open.size)}</dd></div>
                    <div className="flex justify-between"><dt>Aggiunta</dt><dd>{fmtDate(open.createdAt)}</dd></div>
                    <div className="flex justify-between"><dt>File</dt><dd className="truncate pl-3">data/images/{open.file}</dd></div>
                  </dl>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={async () => {
                    await deleteItem("images", open.id);
                    setOpenId(null);
                    toast("Immagine spostata nel cestino", { description: "Il file resta su disco: recuperabile." });
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Sposta nel cestino
                </Button>
                <Button variant="outline" asChild>
                  <a href={imageUrl(open)} download={`${open.name}${open.file.slice(open.file.lastIndexOf("."))}`}>
                    <Download className="h-4 w-4" /> Scarica
                  </a>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
