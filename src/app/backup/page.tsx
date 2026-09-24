"use client";

import { useEffect, useState } from "react";
import { HardDrive, Download, RotateCcw, ShieldCheck, Trash2, History } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/app/PageHeader";
import { reloadAll } from "@/lib/client-store";
import { fmtDate } from "@/lib/labels";

type TrashEntry = { collection: string; deletedAt: string; item: { id: string; title?: string; name?: string; body?: string } };
const COLL: Record<string, string> = { ideas: "Idea", posts: "Contenuto", images: "Immagine", designs: "Grafica" };

export default function BackupPage() {
  const [info, setInfo] = useState<{ dataDir: string; backups: { day: string; files: string[] }[] } | null>(null);
  const [trash, setTrash] = useState<TrashEntry[]>([]);

  const load = async () => {
    const [b, t] = await Promise.all([fetch("/api/backup").then((r) => r.json()), fetch("/api/trash").then((r) => r.json())]);
    setInfo(b);
    setTrash(t);
  };

  useEffect(() => {
    Promise.all([fetch("/api/backup").then((r) => r.json()), fetch("/api/trash").then((r) => r.json())]).then(([b, t]) => {
      setInfo(b);
      setTrash(t);
    });
  }, []);

  const restore = async (id: string) => {
    const res = await fetch("/api/trash", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (!res.ok) return toast.error("Ripristino non riuscito");
    await reloadAll();
    await load();
    toast.success("Ripristinato");
  };

  const totalSnapshots = info?.backups.reduce((n, d) => n + d.files.length, 0) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Backup e dati" subtitle="Dove vivono i tuoi contenuti e come sono protetti">
        <Button asChild>
          <a href="/api/backup?download=1">
            <Download className="h-4 w-4" /> Scarica backup completo
          </a>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { icon: HardDrive, color: "text-blue-600", title: "Solo in locale", text: "Tutto è salvato in file sul tuo Mac. Nessun cloud, nessun account." },
          { icon: ShieldCheck, color: "text-emerald-600", title: "Salvataggio automatico", text: "Ogni modifica si scrive da sola in modo atomico: un crash non corrompe i file." },
          { icon: History, color: "text-purple-600", title: `${totalSnapshots} istantanee`, text: "Copia automatica ogni 5 minuti di lavoro, conservata per 60 giorni." },
        ].map((c) => (
          <Card key={c.title} className="py-0">
            <CardContent className="flex gap-4 p-6">
              <div className={`h-fit rounded-lg bg-muted p-3 ${c.color}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-secondary">{c.title}</p>
                <p className="text-sm text-muted-foreground">{c.text}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Cartella dati</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <code className="block rounded-md bg-muted px-3 py-2 font-mono text-xs">{info?.dataDir ?? "…"}</code>
          <p className="text-muted-foreground">
            <code>ideas.json</code>, <code>posts.json</code>, <code>images.json</code>, <code>designs.json</code> sono i dati; le immagini stanno in{" "}
            <code>images/</code>, le istantanee in <code>backups/</code>, gli elementi eliminati in <code>cestino.json</code>. Se questa cartella è dentro
            iCloud Drive o un disco di Time Machine, hai anche la copia fuori dal Mac.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg">
              <Trash2 className="h-4 w-4" /> Cestino
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trash.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Il cestino è vuoto.</p>
            ) : (
              <ul className="divide-y">
                {trash.slice(0, 50).map((t) => (
                  <li key={`${t.item.id}-${t.deletedAt}`} className="flex items-center gap-3 py-2.5">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{COLL[t.collection] ?? t.collection}</span>
                    <p className="min-w-0 flex-1 truncate text-sm">{t.item.title || t.item.name || t.item.body?.slice(0, 60) || "Senza titolo"}</p>
                    <span className="text-xs text-muted-foreground">{fmtDate(t.deletedAt, "d MMM HH:mm")}</span>
                    <Button size="sm" variant="outline" onClick={() => restore(t.item.id)}>
                      <RotateCcw className="h-3.5 w-3.5" /> Ripristina
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg">
              <History className="h-4 w-4" /> Istantanee automatiche
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!info?.backups.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Le prime istantanee arrivano dopo le prime modifiche.</p>
            ) : (
              <ul className="divide-y">
                {info.backups.slice(0, 14).map((d) => (
                  <li key={d.day} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="font-medium">{fmtDate(d.day, "EEEE d MMMM")}</span>
                    <span className="text-muted-foreground">{d.files.length} file</span>
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
