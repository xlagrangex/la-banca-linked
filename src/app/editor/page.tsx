"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Palette, Layers, Square, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import PageHeader, { EmptyState } from "@/components/app/PageHeader";
import SlideView, { FORMATS } from "@/components/design/SlideView";
import { withoutMeta } from "@/lib/factories";
import { createItem, deleteItem, useStore } from "@/lib/client-store";
import { newDesign, SIGNATURES } from "@/lib/design-templates";
import { saveSettings, useSettings } from "@/lib/settings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDate } from "@/lib/labels";
import type { Design, Signature } from "@/lib/types";

const THUMB = 260;

export default function EditorList() {
  const router = useRouter();
  const designs = useStore((s) => s.designs);
  const savedSettings = useStore((s) => s.settings[0]);
  const { signature } = useSettings();

  const create = async (kind: Design["kind"]) => {
    const d = await createItem("designs", newDesign(kind, "linkedin", signature));
    router.push(`/editor/${d.id}`);
  };

  const duplicate = async (d: Design) => {
    await createItem("designs", { ...withoutMeta(d), name: `${d.name} (copia)` });
    toast.success("Grafica duplicata");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Editor grafiche" subtitle="Grafiche statiche e caroselli per LinkedIn, salvati in locale">
        <Select value={signature} onValueChange={(v) => saveSettings({ signature: v as Signature }, savedSettings)}>
          <SelectTrigger className="w-[210px]" aria-label="Firma delle grafiche">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SIGNATURES) as Signature[]).map((k) => (
              <SelectItem key={k} value={k}>
                Firma: {SIGNATURES[k].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => create("statica")}>
          <Square className="h-4 w-4" /> Nuova grafica statica
        </Button>
        <Button onClick={() => create("carosello")}>
          <Layers className="h-4 w-4" /> Nuovo carosello
        </Button>
      </PageHeader>

      {designs.length === 0 ? (
        <EmptyState icon={Palette} title="Nessuna grafica ancora" text="Parti da un template: copertina, punti numerati, citazione, chiusura con CTA." />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {designs.map((d) => {
            const { w } = FORMATS[d.format];
            return (
              <div key={d.id} className="group overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                <Link href={`/editor/${d.id}`} className="relative flex h-[300px] items-center justify-center bg-muted/60">
                  {d.kind === "carosello" && d.slides[1] && (
                    <div className="absolute translate-x-6 rotate-[4deg] opacity-60 shadow">
                      <SlideView slide={d.slides[1]} format={d.format} scale={(THUMB * 0.8) / w} />
                    </div>
                  )}
                  <div className="relative shadow-lg">
                    <SlideView slide={d.slides[0]} format={d.format} scale={(THUMB * 0.8) / w} />
                  </div>
                </Link>
                <div className="flex items-center gap-2 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.kind === "carosello" ? `Carosello · ${d.slides.length} slide` : "Grafica statica"} · {fmtDate(d.updatedAt, "d MMM")}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" title="Duplica" onClick={() => duplicate(d)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Sposta nel cestino"
                    className="text-destructive hover:text-destructive"
                    onClick={async () => {
                      await deleteItem("designs", d.id);
                      toast("Grafica spostata nel cestino");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
