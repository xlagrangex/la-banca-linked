"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toPng, toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";
import {
  ArrowLeft,
  Type,
  ImagePlus,
  Square,
  Undo2,
  Redo2,
  Download,
  FileDown,
  Plus,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  BringToFront,
  SendToBack,
  Images,
  LayoutTemplate,
  X,
  FileText,
  Circle,
  RectangleHorizontal,
  Minus,
  Pill,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ImagePicker from "@/components/app/ImagePicker";
import EditorCanvas from "@/components/design/EditorCanvas";
import SlideView, { FORMATS } from "@/components/design/SlideView";
import { imageUrl, updateItem, uploadImages, useStore } from "@/lib/client-store";
import {
  BACKGROUNDS,
  BIZ_GRADIENT,
  makeSlide,
  pillButton,
  reformat,
  shape,
  SWATCHES,
  TEMPLATES,
  text,
  TEXT_SWATCHES,
  uid,
  type TemplateKey,
} from "@/lib/design-templates";
import type { DesignElement, DesignFormat, Slide } from "@/lib/types";
import { cn } from "@/lib/utils";

function ColorField({ value, onChange, swatches = SWATCHES }: { value: string; onChange: (v: string) => void; swatches?: string[] }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {swatches.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            title={c}
            className={cn("h-6 w-6 rounded-full border shadow-sm", value?.toLowerCase() === c.toLowerCase() && "ring-2 ring-primary ring-offset-1")}
            style={{ background: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input type="color" value={value?.startsWith("#") ? value : "#ffffff"} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 cursor-pointer rounded border bg-white p-0.5" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8 font-mono text-xs" />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 border-b px-4 py-4 last:border-b-0">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function SlideAction({ icon: Icon, title, onClick }: { icon: React.ElementType; title: string; onClick: () => void }) {
  return (
    <button title={title} onClick={onClick} className="rounded bg-white/95 p-1 shadow hover:text-primary">
      <Icon className="h-3 w-3" />
    </button>
  );
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-1.5 rounded-md border bg-white px-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <input type="number" value={Math.round(value)} onChange={(e) => onChange(Number(e.target.value))} className="h-8 w-full min-w-0 bg-transparent outline-none" />
    </label>
  );
}

export default function DesignEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const design = useStore((s) => s.designs.find((d) => d.id === id));
  const linkedPost = useStore((s) => s.posts.find((p) => p.designId === id));
  const images = useStore((s) => s.images);
  const [slideIdx, setSlideIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picker, setPicker] = useState<null | "element" | "background" | "new">(null);
  const [exporting, setExporting] = useState(false);
  const past = useRef<Slide[][]>([]);
  const future = useRef<Slide[][]>([]);
  const dragBase = useRef<Slide[] | null>(null);
  const exportRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [hist, setHist] = useState({ undo: 0, redo: 0 });
  const syncHist = () => setHist({ undo: past.current.length, redo: future.current.length });

  const slides = useMemo(() => design?.slides ?? [], [design?.slides]);
  const slide = slides[Math.min(slideIdx, slides.length - 1)];
  const selected = slide?.elements.find((e) => e.id === selectedId) ?? null;
  const bgImg = slide?.backgroundImageId ? images.find((i) => i.id === slide.backgroundImageId) : undefined;

  const save = useCallback(
    (next: Slide[], record = true) => {
      if (!design) return;
      if (record) {
        past.current.push(design.slides);
        if (past.current.length > 100) past.current.shift();
        future.current = [];
        syncHist();
      }
      updateItem("designs", design.id, { slides: next }, 500);
    },
    [design],
  );

  const patchSlide = useCallback(
    (patch: Partial<Slide>, record = true) => {
      save(slides.map((s, i) => (i === slideIdx ? { ...s, ...patch } : s)), record);
    },
    [slides, slideIdx, save],
  );

  const patchEl = useCallback(
    (elId: string, patch: Partial<DesignElement>, commit = true) => {
      if (!commit && !dragBase.current) dragBase.current = slides;
      const next = slides.map((s, i) =>
        i === slideIdx ? { ...s, elements: s.elements.map((e) => (e.id === elId ? { ...e, ...patch } : e)) } : s,
      );
      if (commit && dragBase.current) {
        past.current.push(dragBase.current);
        dragBase.current = null;
        future.current = [];
        syncHist();
        save(next, false);
        return;
      }
      save(next, commit);
    },
    [slides, slideIdx, save],
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev || !design) return;
    future.current.push(design.slides);
    updateItem("designs", design.id, { slides: prev }, 500);
    syncHist();
  }, [design]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next || !design) return;
    past.current.push(design.slides);
    updateItem("designs", design.id, { slides: next }, 500);
    syncHist();
  }, [design]);

  const addElement = (el: DesignElement) => {
    patchSlide({ elements: [...slide.elements, el] });
    setSelectedId(el.id);
  };

  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    patchSlide({ elements: slide.elements.filter((e) => e.id !== selectedId) });
    setSelectedId(null);
  }, [selectedId, slide, patchSlide]);

  const duplicateSelected = useCallback(() => {
    if (!selected) return;
    const copy = { ...selected, id: uid(), x: selected.x + 30, y: selected.y + 30 };
    patchSlide({ elements: [...slide.elements, copy] });
    setSelectedId(copy.id);
  }, [selected, slide, patchSlide]);

  const layer = (dir: "front" | "back") => {
    if (!selected) return;
    const rest = slide.elements.filter((e) => e.id !== selected.id);
    patchSlide({ elements: dir === "front" ? [...rest, selected] : [selected, ...rest] });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
      } else if ((e.key === "Backspace" || e.key === "Delete") && selectedId) {
        e.preventDefault();
        removeSelected();
      } else if (selected && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key] ?? [0, 0];
        patchEl(selected.id, { x: selected.x + d[0], y: selected.y + d[1] });
      } else if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, duplicateSelected, removeSelected, selected, selectedId, patchEl]);

  if (!design || !slide)
    return (
      <div className="py-20 text-center text-muted-foreground">
        Grafica non trovata. <Link href="/editor" className="text-primary hover:underline">Torna all&apos;editor</Link>
      </div>
    );

  const { w, h } = FORMATS[design.format];
  const setDesign = (patch: Parameters<typeof updateItem<"designs">>[2]) => updateItem("designs", design.id, patch, 500);

  const addSlide = (key: TemplateKey) => {
    const s = makeSlide(key, design.format);
    const next = [...slides.slice(0, slideIdx + 1), s, ...slides.slice(slideIdx + 1)];
    save(next);
    if (design.kind === "statica" && next.length > 1) setDesign({ kind: "carosello" });
    setSlideIdx(slideIdx + 1);
    setSelectedId(null);
  };

  const moveSlide = (from: number, to: number) => {
    if (to < 0 || to >= slides.length) return;
    const next = [...slides];
    const [s] = next.splice(from, 1);
    next.splice(to, 0, s);
    save(next);
    setSlideIdx(to);
  };

  const duplicateSlide = (i: number) => {
    const next = [...slides];
    next.splice(i + 1, 0, { ...structuredClone(slides[i]), id: uid() });
    save(next);
  };

  const removeSlide = (i: number) => {
    save(slides.filter((_, j) => j !== i));
    setSlideIdx(Math.max(0, Math.min(slideIdx, slides.length - 2)));
  };

  const renderSlides = async (kind: "png" | "jpeg", only?: number) => {
    await document.fonts.ready;
    const out: string[] = [];
    for (let i = 0; i < slides.length; i++) {
      if (only !== undefined && i !== only) continue;
      const node = exportRefs.current[i];
      if (!node) continue;
      const opts = { width: w, height: h, pixelRatio: 1, cacheBust: true, backgroundColor: "#ffffff" };
      out.push(kind === "png" ? await toPng(node, opts) : await toJpeg(node, { ...opts, quality: 0.95 }));
    }
    return out;
  };

  const safeName = design.name.replace(/[^\w\-àèéìòù ]+/gi, "").trim().replace(/\s+/g, "-") || "grafica";

  const run = async (fn: () => Promise<void>) => {
    setSelectedId(null);
    setExporting(true);
    try {
      await fn();
    } catch (err) {
      toast.error("Esportazione non riuscita", { description: String(err) });
    } finally {
      setExporting(false);
    }
  };

  const download = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  };

  const exportPng = (all: boolean) =>
    run(async () => {
      const urls = await renderSlides("png", all ? undefined : slideIdx);
      urls.forEach((u, i) => download(u, `${safeName}${urls.length > 1 ? `-${String(i + 1).padStart(2, "0")}` : ""}.png`));
      toast.success(urls.length > 1 ? `${urls.length} PNG esportati` : "PNG esportato");
    });

  const exportPdf = () =>
    run(async () => {
      const urls = await renderSlides("jpeg");
      const pdf = new jsPDF({ orientation: w > h ? "landscape" : "portrait", unit: "px", format: [w, h], hotfixes: ["px_scaling"] });
      urls.forEach((u, i) => {
        if (i > 0) pdf.addPage([w, h], w > h ? "landscape" : "portrait");
        pdf.addImage(u, "JPEG", 0, 0, w, h);
      });
      pdf.save(`${safeName}.pdf`);
      toast.success("PDF pronto: caricalo su LinkedIn come documento");
    });

  const saveToBank = () =>
    run(async () => {
      const urls = await renderSlides("png");
      const blobs = await Promise.all(urls.map((u) => fetch(u).then((r) => r.blob())));
      await uploadImages(blobs, {
        source: "editor",
        names: blobs.map((_, i) => `${safeName}${blobs.length > 1 ? `-${String(i + 1).padStart(2, "0")}` : ""}.png`),
      });
      toast.success("Salvata nella banca immagini");
    });

  const thumbScale = 150 / w;

  return (
    <div className="-m-6 flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b bg-white px-4 py-2.5">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/editor">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <Input
          value={design.name}
          onChange={(e) => setDesign({ name: e.target.value })}
          className="h-9 w-56 border-transparent font-heading font-semibold text-secondary hover:border-input focus:border-input"
        />
        <div className="mx-2 h-6 w-px bg-border" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            addElement(text({ x: w * 0.156, y: h / 2 - 73, w: w * 0.655, h: 146, text: "Nuovo testo", accent: BIZ_GRADIENT }))
          }
        >
          <Type className="h-4 w-4" /> Testo
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setPicker("new")}>
          <ImagePlus className="h-4 w-4" /> Immagine
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Square className="h-4 w-4" /> Forma
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => addElement(shape({ x: w / 2 - 200, y: h / 2 - 150, w: 400, h: 300 }))}>
              <Square className="h-4 w-4" /> Rettangolo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement(shape({ x: w / 2 - 200, y: h / 2 - 150, w: 400, h: 300, radius: 36 }))}>
              <RectangleHorizontal className="h-4 w-4" /> Rettangolo arrotondato
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement(shape({ x: w / 2 - 150, y: h / 2 - 150, w: 300, h: 300, radius: 9999 }))}>
              <Circle className="h-4 w-4" /> Cerchio
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement(shape({ x: w / 2 - 218, y: h / 2 - 62, w: 436.26, h: 123.59, radius: 61.8 }))}>
              <Pill className="h-4 w-4" /> Pillola
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const [pill, label] = pillButton("CTA", w / 2 - 218, h / 2 - 62);
                patchSlide({ elements: [...slide.elements, pill, label] });
                setSelectedId(label.id);
              }}
            >
              <Pill className="h-4 w-4" /> Bottone pillola con testo
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => addElement(shape({ x: -14.932, y: -43.4958, w: w + 15, h: 62.6 }))}>
              <Minus className="h-4 w-4" /> Barra sfumata in alto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement(shape({ x: w / 2 - 200, y: h / 2 - 3, w: 400, h: 6, radius: 3 }))}>
              <Minus className="h-4 w-4" /> Linea
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="mx-2 h-6 w-px bg-border" />
        <Button variant="ghost" size="icon" onClick={undo} disabled={!hist.undo} title="Annulla (⌘Z)">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={redo} disabled={!hist.redo} title="Ripeti (⇧⌘Z)">
          <Redo2 className="h-4 w-4" />
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {linkedPost && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/contenuti/${linkedPost.id}`}>
                <FileText className="h-4 w-4" /> Apri il post
              </Link>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={exporting}>
                <Download className="h-4 w-4" /> {exporting ? "Esporto…" : "Esporta"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>{FORMATS[design.format].label}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {design.kind === "carosello" && (
                <DropdownMenuItem onClick={exportPdf}>
                  <FileDown className="mr-2 h-4 w-4" /> PDF carosello (per LinkedIn)
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => exportPng(false)}>
                <Download className="mr-2 h-4 w-4" /> PNG di questa slide
              </DropdownMenuItem>
              {slides.length > 1 && (
                <DropdownMenuItem onClick={() => exportPng(true)}>
                  <Download className="mr-2 h-4 w-4" /> PNG di tutte le slide
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={saveToBank}>
                <Images className="mr-2 h-4 w-4" /> Salva nella banca immagini
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="w-[196px] shrink-0 overflow-y-auto border-r bg-white p-3">
          <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {design.kind === "carosello" ? `Slide · ${slides.length}` : "Grafica"}
          </p>
          <div className="space-y-3">
            {slides.map((s, i) => (
              <div key={s.id} className="group relative">
                <button
                  onClick={() => {
                    setSlideIdx(i);
                    setSelectedId(null);
                  }}
                  className={cn(
                    "block overflow-hidden rounded-md border-2 transition-all",
                    i === slideIdx ? "border-primary shadow-md" : "border-transparent opacity-80 hover:opacity-100",
                  )}
                >
                  <SlideView slide={s} format={design.format} scale={thumbScale} />
                </button>
                <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 text-[10px] font-semibold text-white">{i + 1}</span>
                {slides.length > 1 && (
                  <div className="absolute right-1 top-1 hidden flex-col gap-0.5 group-hover:flex">
                    <SlideAction icon={ChevronUp} title="Su" onClick={() => moveSlide(i, i - 1)} />
                    <SlideAction icon={ChevronDown} title="Giù" onClick={() => moveSlide(i, i + 1)} />
                    <SlideAction icon={Copy} title="Duplica" onClick={() => duplicateSlide(i)} />
                    <SlideAction icon={Trash2} title="Elimina" onClick={() => removeSlide(i)} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="mt-3 w-full">
                <Plus className="h-4 w-4" /> Slide
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {TEMPLATES.map((t) => (
                <DropdownMenuItem key={t.key} onClick={() => addSlide(t.key)}>
                  {t.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-muted/40 p-4">
          <EditorCanvas slide={slide} format={design.format} selectedId={selectedId} onSelect={setSelectedId} onChange={patchEl} />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Doppio clic su un testo per scriverci dentro · frecce per spostare · ⌘D duplica · ⌫ elimina · ⌘Z annulla
          </p>
        </main>

        <aside className="w-[300px] shrink-0 overflow-y-auto border-l bg-white">
          {selected ? (
            <>
              <div className="flex items-center justify-between border-b px-4 py-3">
                <p className="font-heading text-sm font-semibold text-secondary">
                  {selected.type === "text" ? "Testo" : selected.type === "image" ? "Immagine" : "Forma"}
                </p>
                <div className="flex gap-0.5">
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Porta avanti" onClick={() => layer("front")}>
                    <BringToFront className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Porta dietro" onClick={() => layer("back")}>
                    <SendToBack className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Duplica" onClick={duplicateSelected}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Elimina" onClick={removeSelected}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {selected.type === "text" && (
                <>
                  <Section title="Contenuto">
                    <Textarea rows={4} value={selected.text} onChange={(e) => patchEl(selected.id, { text: e.target.value })} />
                  </Section>
                  <Section title="Tipografia">
                    <div className="grid grid-cols-2 gap-2">
                      <Num label="Corpo" value={selected.fontSize ?? 40} onChange={(v) => patchEl(selected.id, { fontSize: v })} />
                      <Select value={String(selected.fontWeight ?? 400)} onValueChange={(v) => patchEl(selected.id, { fontWeight: Number(v) })}>
                        <SelectTrigger className="h-8 w-full text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            [400, "Regular"],
                            [500, "Medium"],
                            [700, "Bold"],
                          ].map(([v, l]) => (
                            <SelectItem key={v} value={String(v)}>
                              {l}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex rounded-md border">
                        {(
                          [
                            ["left", AlignLeft],
                            ["center", AlignCenter],
                            ["right", AlignRight],
                          ] as const
                        ).map(([a, I]) => (
                          <button
                            key={a}
                            onClick={() => patchEl(selected.id, { align: a })}
                            className={cn("p-2", selected.align === a ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
                          >
                            <I className="h-4 w-4" />
                          </button>
                        ))}
                      </div>
                      <div className="flex-1">
                        <p className="mb-1 text-[11px] text-muted-foreground">Interlinea {(selected.lineHeight ?? 1.2).toFixed(2)}</p>
                        <Slider min={0.8} max={2} step={0.05} value={[selected.lineHeight ?? 1.2]} onValueChange={([v]) => patchEl(selected.id, { lineHeight: v }, false)} onValueCommit={() => patchEl(selected.id, {}, true)} />
                      </div>
                    </div>
                  </Section>
                  <Section title="Spaziatura lettere">
                    <p className="text-[11px] text-muted-foreground">{((selected.letterSpacing ?? 0) * 1000).toFixed(0)} (nel modello: titoli −51, nome −91)</p>
                    <Slider min={-0.12} max={0.1} step={0.001} value={[selected.letterSpacing ?? 0]} onValueChange={([v]) => patchEl(selected.id, { letterSpacing: v }, false)} onValueCommit={() => patchEl(selected.id, {}, true)} />
                  </Section>
                  <Section title="Colore">
                    <ColorField swatches={TEXT_SWATCHES} value={selected.color ?? "#000000"} onChange={(v) => patchEl(selected.id, { color: v })} />
                    <label className="flex items-start gap-2 text-xs">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={!!selected.accent}
                        onChange={(e) => patchEl(selected.id, { accent: e.target.checked ? BIZ_GRADIENT : undefined })}
                      />
                      <span>
                        Sfumatura sulle parole tra <code className="rounded bg-muted px-1">*asterischi*</code>
                        <span className="block text-muted-foreground">Es. «Esempio per *Post Linkedin*»</span>
                      </span>
                    </label>
                  </Section>
                </>
              )}

              {selected.type === "image" && (
                <Section title="Immagine">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setPicker("element")}>
                    <Images className="h-4 w-4" /> {selected.imageId ? "Cambia immagine" : "Scegli dalla banca"}
                  </Button>
                  <div className="flex rounded-md border text-xs">
                    {(["cover", "contain"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => patchEl(selected.id, { fit: f })}
                        className={cn("flex-1 py-1.5", (selected.fit ?? "cover") === f ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground")}
                      >
                        {f === "cover" ? "Riempi" : "Adatta"}
                      </button>
                    ))}
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] text-muted-foreground">Arrotondamento {selected.radius ?? 0}px</p>
                    <Slider min={0} max={300} step={2} value={[selected.radius ?? 0]} onValueChange={([v]) => patchEl(selected.id, { radius: v }, false)} onValueCommit={() => patchEl(selected.id, {}, true)} />
                  </div>
                </Section>
              )}

              {selected.type === "shape" && (
                <Section title="Forma">
                  <ColorField value={selected.fill ?? "#000000"} onChange={(v) => patchEl(selected.id, { fill: v })} />
                  <div>
                    <p className="mb-1 text-[11px] text-muted-foreground">Arrotondamento {selected.radius ?? 0}px</p>
                    <Slider min={0} max={600} step={2} value={[selected.radius ?? 0]} onValueChange={([v]) => patchEl(selected.id, { radius: v }, false)} onValueCommit={() => patchEl(selected.id, {}, true)} />
                  </div>
                </Section>
              )}

              <Section title="Posizione e dimensione">
                <div className="grid grid-cols-2 gap-2">
                  <Num label="X" value={selected.x} onChange={(v) => patchEl(selected.id, { x: v })} />
                  <Num label="Y" value={selected.y} onChange={(v) => patchEl(selected.id, { y: v })} />
                  <Num label="L" value={selected.w} onChange={(v) => patchEl(selected.id, { w: v })} />
                  <Num label="A" value={selected.h} onChange={(v) => patchEl(selected.id, { h: v })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => patchEl(selected.id, { x: Math.round((w - selected.w) / 2) })}>
                    Centra orizz.
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => patchEl(selected.id, { y: Math.round((h - selected.h) / 2) })}>
                    Centra vert.
                  </Button>
                </div>
                <div>
                  <p className="mb-1 text-[11px] text-muted-foreground">Opacità {Math.round((selected.opacity ?? 1) * 100)}%</p>
                  <Slider min={0} max={1} step={0.05} value={[selected.opacity ?? 1]} onValueChange={([v]) => patchEl(selected.id, { opacity: v }, false)} onValueCommit={() => patchEl(selected.id, {}, true)} />
                </div>
              </Section>
            </>
          ) : (
            <>
              <div className="border-b px-4 py-3">
                <p className="font-heading text-sm font-semibold text-secondary">
                  {design.kind === "carosello" ? `Slide ${slideIdx + 1}` : "Grafica"}
                </p>
                <p className="text-xs text-muted-foreground">Clicca un elemento per modificarlo</p>
              </div>
              <Section title="Sfondo">
                <div className="grid grid-cols-3 gap-2">
                  {[...BACKGROUNDS, { label: "Nessuno", src: null }].map((b) => (
                    <button
                      key={b.label}
                      onClick={() => patchSlide({ backgroundSrc: b.src, backgroundImageId: null })}
                      className={cn(
                        "overflow-hidden rounded-md border text-[10px] text-muted-foreground",
                        (slide.backgroundSrc ?? null) === b.src && !slide.backgroundImageId && "ring-2 ring-primary ring-offset-1",
                      )}
                    >
                      {b.src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.src} alt="" className="aspect-square w-full object-cover" />
                      ) : (
                        <div className="aspect-square w-full" style={{ background: slide.background }} />
                      )}
                      <span className="block py-1">{b.label}</span>
                    </button>
                  ))}
                </div>
                <ColorField swatches={TEXT_SWATCHES} value={slide.background} onChange={(v) => patchSlide({ background: v })} />
                {slide.backgroundImageId ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {bgImg && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageUrl(bgImg)} alt="" className="h-9 w-9 rounded object-cover" />
                      )}
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setPicker("background")}>
                        Cambia foto
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => patchSlide({ backgroundImageId: null })} title="Rimuovi foto">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div>
                      <p className="mb-1 text-[11px] text-muted-foreground">Velo scuro {Math.round(slide.overlay * 100)}%</p>
                      <Slider min={0} max={0.9} step={0.05} value={[slide.overlay]} onValueChange={([v]) => patchSlide({ overlay: v }, false)} onValueCommit={([v]) => patchSlide({ overlay: v })} />
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setPicker("background")}>
                    <Images className="h-4 w-4" /> Foto di sfondo dalla banca
                  </Button>
                )}
              </Section>
              <Section title="Layout della slide">
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATES.map((t) => (
                    <Button
                      key={t.key}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const fresh = makeSlide(t.key, design.format);
                        patchSlide({ ...fresh, id: slide.id });
                      }}
                    >
                      <LayoutTemplate className="h-3.5 w-3.5" /> {t.label}
                    </Button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">Sostituisce gli elementi della slide (⌘Z per tornare indietro).</p>
              </Section>
              <Section title="Formato">
                <Select
                  value={design.format}
                  onValueChange={(v) => {
                    const to = v as DesignFormat;
                    past.current.push(design.slides);
                    syncHist();
                    setDesign({ format: to, slides: reformat(slides, design.format, to) });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FORMATS) as DesignFormat[]).map((f) => (
                      <SelectItem key={f} value={f}>
                        {FORMATS[f].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex rounded-md border text-xs">
                  {(["statica", "carosello"] as const).map((k) => (
                    <button
                      key={k}
                      onClick={() => setDesign({ kind: k })}
                      className={cn("flex-1 py-1.5 capitalize", design.kind === k ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground")}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </Section>
              <Section title="Suggerimento">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Per LinkedIn i caroselli si caricano come <strong>documento PDF</strong>: usa Esporta → PDF carosello. Il formato 4:5 occupa più spazio nel feed.
                </p>
              </Section>
            </>
          )}
        </aside>
      </div>

      <div aria-hidden style={{ position: "fixed", left: -100000, top: 0, pointerEvents: "none" }}>
        {slides.map((s, i) => (
          <SlideView
            key={s.id}
            ref={(n) => {
              exportRefs.current[i] = n;
            }}
            slide={s}
            format={design.format}
          />
        ))}
      </div>

      <ImagePicker
        open={picker !== null}
        onOpenChange={(v) => !v && setPicker(null)}
        onPick={([imgId]) => {
          if (!imgId) return;
          if (picker === "background") patchSlide({ backgroundImageId: imgId });
          else if (picker === "element" && selected) patchEl(selected.id, { imageId: imgId });
          else if (picker === "new")
            addElement({ id: uid(), type: "image", x: w / 2 - 300, y: h / 2 - 300, w: 600, h: 600, imageId: imgId, fit: "cover", radius: 24 });
        }}
      />
    </div>
  );
}
