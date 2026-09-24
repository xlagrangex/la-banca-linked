"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Search, Upload, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { imageUrl, uploadImages, useStore } from "@/lib/client-store";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  multiple?: boolean;
  initial?: string[];
  onPick: (ids: string[]) => void;
  title?: string;
}

export default function ImagePicker({ open, onOpenChange, multiple = false, initial = [], onPick, title }: Props) {
  const images = useStore((s) => s.images);
  const [selected, setSelected] = useState<string[]>(initial);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? images.filter((i) => `${i.name} ${i.tags.join(" ")}`.toLowerCase().includes(s)) : images;
  }, [images, q]);

  const toggle = (id: string) => {
    if (!multiple) {
      onPick([id]);
      onOpenChange(false);
      return;
    }
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const created = await uploadImages(Array.from(files));
    if (!multiple && created[0]) {
      onPick([created[0].id]);
      onOpenChange(false);
    } else setSelected((s) => [...s, ...created.map((c) => c.id)]);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) setSelected(initial);
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-secondary">{title ?? "Scegli dalla banca immagini"}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per nome o tag…" className="pl-9" />
          </div>
          <Button variant="outline" onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Carica
          </Button>
          <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        </div>
        <div className="max-h-[55vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-center text-sm text-muted-foreground">
              <ImageIcon className="mb-3 h-10 w-10 opacity-30" />
              Nessuna immagine. Caricane una.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {filtered.map((img) => {
                const on = selected.includes(img.id);
                return (
                  <button
                    key={img.id}
                    onClick={() => toggle(img.id)}
                    className={cn(
                      "checker relative aspect-square overflow-hidden rounded-lg border-2 transition-all",
                      on ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-primary/40",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl(img)} alt={img.name} className="h-full w-full object-cover" />
                    {on && (
                      <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {multiple && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button
              onClick={() => {
                onPick(selected);
                onOpenChange(false);
              }}
            >
              Usa {selected.length} {selected.length === 1 ? "immagine" : "immagini"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
