"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Trash2,
  ImagePlus,
  X,
  Palette,
  Lightbulb,
  Globe2,
  ThumbsUp,
  MessageSquare,
  Repeat2,
  Send,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import PillarInput from "@/components/app/PillarInput";
import ImagePicker from "@/components/app/ImagePicker";
import SlideView from "@/components/design/SlideView";
import { createItem, deleteItem, imageUrl, updateItem, useStore } from "@/lib/client-store";
import { newDesign } from "@/lib/design-templates";
import { LINKEDIN_FOLD, LINKEDIN_MAX, POST_FORMAT, POST_STATUS } from "@/lib/labels";
import type { Post, PostFormat, PostStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function PostEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const post = useStore((s) => s.posts.find((p) => p.id === id));
  const images = useStore((s) => s.images);
  const design = useStore((s) => (post?.designId ? s.designs.find((d) => d.id === post.designId) : undefined));
  const idea = useStore((s) => (post?.ideaId ? s.ideas.find((i) => i.id === post.ideaId) : undefined));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!post)
    return (
      <div className="py-20 text-center text-muted-foreground">
        Contenuto non trovato. <Link href="/contenuti" className="text-primary hover:underline">Torna alla banca</Link>
      </div>
    );

  const set = (patch: Partial<Post>, delay = 0) => updateItem("posts", post.id, patch, delay);
  const attached = post.imageIds.map((i) => images.find((x) => x.id === i)).filter(Boolean);
  const chars = post.body.length;

  const setSchedule = (value: string) => {
    const patch: Partial<Post> = { scheduledFor: value || null };
    if (value && (post.status === "bozza" || post.status === "pronto")) patch.status = "programmato";
    if (!value && post.status === "programmato") patch.status = "pronto";
    set(patch);
  };

  const setStatus = (status: PostStatus) => {
    const patch: Partial<Post> = { status };
    if (status === "pubblicato" && !post.publishedAt) patch.publishedAt = post.scheduledFor ?? new Date().toISOString().slice(0, 16);
    set(patch);
    if (status === "pubblicato" && post.ideaId) updateItem("ideas", post.ideaId, { status: "usata" });
  };

  const createDesign = async () => {
    const kind = post.format === "carosello" ? "carosello" : "statica";
    const d = await createItem("designs", newDesign(kind, "portrait", post.title || "Grafica post"));
    await set({ designId: d.id, format: post.format === "testo" ? "immagine" : post.format });
    router.push(`/editor/${d.id}`);
  };

  const copyText = async () => {
    await navigator.clipboard.writeText(post.body);
    toast.success("Testo copiato: incollalo su LinkedIn");
  };

  const previewText = expanded || chars <= LINKEDIN_FOLD ? post.body : post.body.slice(0, LINKEDIN_FOLD).trimEnd();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/contenuti">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-heading text-2xl font-bold text-secondary">{post.title || "Nuovo contenuto"}</h1>
            <p className="text-sm text-muted-foreground">Ogni modifica si salva da sola, in locale.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyText}>
            <Copy className="h-4 w-4" /> Copia testo
          </Button>
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={async () => {
              await deleteItem("posts", post.id);
              toast("Contenuto spostato nel cestino");
              router.push("/contenuti");
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Titolo interno</Label>
                <Input
                  value={post.title}
                  placeholder="Come lo riconosci in banca (non viene pubblicato)"
                  onChange={(e) => set({ title: e.target.value }, 600)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-end justify-between">
                  <Label>Testo del post</Label>
                  <span className={cn("text-xs", chars > LINKEDIN_MAX ? "font-semibold text-destructive" : "text-muted-foreground")}>
                    {chars.toLocaleString("it-IT")} / {LINKEDIN_MAX.toLocaleString("it-IT")}
                  </span>
                </div>
                <Textarea
                  value={post.body}
                  onChange={(e) => set({ body: e.target.value }, 700)}
                  placeholder={"Il gancio va nelle prime due righe: è tutto quello che si vede prima di \"…altro\".\n\nPoi la storia."}
                  className="min-h-[420px] font-[450] leading-relaxed"
                />
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all", chars > LINKEDIN_MAX ? "bg-destructive" : "bg-primary")}
                    style={{ width: `${Math.min(100, (chars / LINKEDIN_MAX) * 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">Anteprima LinkedIn</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <div className="border-y bg-white">
                <div className="flex gap-2.5 px-4 pt-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-secondary text-white">VP</AvatarFallback>
                  </Avatar>
                  <div className="leading-tight">
                    <p className="text-sm font-semibold">Vincenzo Petrone</p>
                    <p className="text-xs text-muted-foreground">Bizstudio · siti e web app</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      ora · <Globe2 className="h-3 w-3" />
                    </p>
                  </div>
                </div>
                <div className="whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed">
                  {previewText || <span className="text-muted-foreground">Il testo apparirà qui.</span>}
                  {!expanded && chars > LINKEDIN_FOLD && (
                    <button onClick={() => setExpanded(true)} className="text-muted-foreground hover:text-primary hover:underline">
                      {" "}…altro
                    </button>
                  )}
                </div>
                {design ? (
                  <div className="bg-muted">
                    <SlideView slide={design.slides[0]} format={design.format} scale={400 / (design.format === "landscape" ? 1200 : 1080)} />
                  </div>
                ) : (
                  attached[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl(attached[0])} alt="" className="w-full" />
                  )
                )}
                <div className="flex justify-around border-t px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {[
                    [ThumbsUp, "Consiglia"],
                    [MessageSquare, "Commenta"],
                    [Repeat2, "Diffondi"],
                    [Send, "Invia"],
                  ].map(([Icon, l]) => {
                    const I = Icon as React.ElementType;
                    return (
                      <span key={l as string} className="flex items-center gap-1.5 rounded px-2 py-2">
                        <I className="h-4 w-4" /> {l as string}
                      </span>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">Pubblicazione</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Stato</Label>
                  <Select value={post.status} onValueChange={(v) => setStatus(v as PostStatus)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(POST_STATUS) as PostStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {POST_STATUS[s].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Formato</Label>
                  <Select value={post.format} onValueChange={(v) => set({ format: v as PostFormat })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(POST_FORMAT) as PostFormat[]).map((f) => (
                        <SelectItem key={f} value={f}>
                          {POST_FORMAT[f]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Pilastro</Label>
                <PillarInput value={post.pillar} onChange={(v) => set({ pillar: v })} />
              </div>
              <div className="space-y-2">
                <Label>Data e ora di uscita</Label>
                <Input type="datetime-local" value={post.scheduledFor ?? ""} onChange={(e) => setSchedule(e.target.value)} />
              </div>
              {post.status === "pubblicato" && (
                <div className="space-y-2">
                  <Label>Link al post pubblicato</Label>
                  <div className="flex gap-2">
                    <Input value={post.url} placeholder="https://www.linkedin.com/posts/…" onChange={(e) => set({ url: e.target.value }, 600)} />
                    {post.url && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={post.url} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {idea && (
                <Link href="/idee" className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 hover:bg-amber-100">
                  <Lightbulb className="h-4 w-4 shrink-0" />
                  <span className="truncate">Nato dall&apos;idea: {idea.title}</span>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">Visual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {design ? (
                <div className="flex items-center gap-3 rounded-lg border p-2">
                  <div className="overflow-hidden rounded-md border">
                    <SlideView slide={design.slides[0]} format={design.format} scale={64 / 1080} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{design.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {design.kind === "carosello" ? `Carosello · ${design.slides.length} slide` : "Grafica statica"}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/editor/${design.id}`}>Apri</Link>
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => set({ designId: null })} title="Scollega">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full" onClick={createDesign}>
                  <Palette className="h-4 w-4" /> Crea grafica o carosello per questo post
                </Button>
              )}

              <div className="grid grid-cols-4 gap-2">
                {attached.map((img) => (
                  <div key={img!.id} className="group relative aspect-square overflow-hidden rounded-md border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl(img)} alt="" className="h-full w-full object-cover" />
                    <button
                      onClick={() => set({ imageIds: post.imageIds.filter((x) => x !== img!.id) })}
                      className="absolute right-1 top-1 hidden rounded-full bg-black/60 p-0.5 text-white group-hover:block"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setPickerOpen(true)}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <ImagePlus className="h-5 w-5" /> Immagini
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ImagePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        multiple
        initial={post.imageIds}
        onPick={(ids) => set({ imageIds: ids })}
      />
    </div>
  );
}
