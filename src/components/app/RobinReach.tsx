"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, CircleX, Clock, Loader2, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { reloadAll, useStore } from "@/lib/client-store";
import { fmtDate } from "@/lib/labels";
import { hasVisual } from "@/lib/readiness";
import { sendToRobinReach, type SendResult } from "@/lib/robinreach-client";
import type { Post } from "@/lib/types";
import { cn } from "@/lib/utils";

type Check = { blockers: string[]; warnings: string[] };

function check(p: Post): Check {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (p.status === "pubblicato" || p.robinreach?.status === "published") blockers.push("già pubblicato");
  if (!p.body.trim()) blockers.push("testo vuoto");
  if (p.body.length > 3000) blockers.push("oltre 3000 caratteri");
  if (!p.scheduledFor) blockers.push("senza data di uscita");
  else if (new Date(p.scheduledFor).getTime() < Date.now() + 60_000) blockers.push("data già passata");
  if (!blockers.length) {
    if (p.status === "bozza") warnings.push("è ancora una bozza");
    if (!hasVisual(p)) warnings.push("esce senza immagine");
    if (p.robinreach && p.robinreach.status !== "published") warnings.push("già in coda: viene aggiornato");
  }
  return { blockers, warnings };
}

export function RobinReachDialog({ posts, open, onOpenChange, onDone }: { posts: Post[]; open: boolean; onOpenChange: (v: boolean) => void; onDone?: () => void }) {
  const designs = useStore((s) => s.designs);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<string, SendResult>>({});
  const [profile, setProfile] = useState<{ name: string } | null | "none">(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/robinreach")
      .then((r) => r.json())
      .then((d) => setProfile(d.profile ?? "none"))
      .catch(() => setProfile("none"));
  }, [open]);

  const rows = useMemo(
    () => [...posts].sort((a, b) => (a.scheduledFor ?? "9").localeCompare(b.scheduledFor ?? "9")).map((p) => ({ post: p, ...check(p) })),
    [posts],
  );
  const sendable = rows.filter((r) => r.blockers.length === 0);

  const run = async () => {
    setRunning(true);
    let ok = 0;
    for (const { post } of sendable) {
      let r: SendResult;
      try {
        r = await sendToRobinReach(post, designs);
      } catch (err) {
        r = { postId: post.id, ok: false, error: String(err instanceof Error ? err.message : err) };
      }
      if (r.ok) ok++;
      setResults((prev) => ({ ...prev, [post.id]: r }));
    }
    await reloadAll();
    setRunning(false);
    if (ok === sendable.length) toast.success(ok === 1 ? "Post programmato su LinkedIn" : `${ok} post programmati su LinkedIn`);
    else toast.error(`${sendable.length - ok} post non sono partiti`, { description: "Il motivo è accanto a ciascuno." });
    onDone?.();
  };

  const finished = Object.keys(results).length > 0 && !running;
  const close = (v: boolean) => {
    if (running || v) return;
    setResults({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Programma su LinkedIn</DialogTitle>
          <DialogDescription>
            {profile === "none"
              ? "RobinReach non risponde o non è configurato."
              : `Vanno in coda su RobinReach e escono da soli alla data indicata${profile ? `, sul profilo di ${profile.name}` : ""}. Finché non escono puoi spostarli dal calendario.`}
          </DialogDescription>
        </DialogHeader>

        <ul className="divide-y rounded-lg border">
          {rows.map(({ post, blockers, warnings }) => {
            const r = results[post.id];
            return (
              <li key={post.id} className="flex gap-3 p-3 text-sm">
                <span className="mt-0.5 shrink-0">
                  {r ? (
                    r.ok ? <Check className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-600" />
                  ) : running && blockers.length === 0 ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : blockers.length ? (
                    <CircleX className="h-4 w-4 text-muted-foreground" />
                  ) : warnings.length ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-primary" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate font-medium", blockers.length > 0 && "text-muted-foreground")}>{post.title || post.body.slice(0, 60) || "Senza titolo"}</p>
                  <p className="text-xs text-muted-foreground">{post.scheduledFor ? fmtDate(post.scheduledFor, "EEE d MMM, HH:mm") : "Nessuna data"}</p>
                  {r && !r.ok && <p className="mt-1 text-xs text-red-600">{r.error}</p>}
                  {!r && blockers.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Saltato: {blockers.join(", ")}</p>}
                  {!r && warnings.length > 0 && <p className="mt-1 text-xs text-amber-700">{warnings.join(" · ")}</p>}
                </div>
              </li>
            );
          })}
        </ul>

        <DialogFooter>
          <Button variant="outline" disabled={running} onClick={() => close(false)}>
            {finished ? "Chiudi" : "Annulla"}
          </Button>
          {!finished && (
            <Button disabled={running || sendable.length === 0 || profile === "none"} onClick={run}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sendable.length === 1 ? "Programma 1 post" : `Programma ${sendable.length} post`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RobinReachBadge({ post, className }: { post: Post; className?: string }) {
  const rr = post.robinreach;
  if (!rr) return null;
  const map = {
    scheduled: { label: "In coda su LinkedIn", cls: "bg-indigo-50 text-indigo-700" },
    published: { label: "Uscito su LinkedIn", cls: "bg-emerald-50 text-emerald-700" },
    failed: { label: "Invio fallito", cls: "bg-red-50 text-red-700" },
    draft: { label: "Bozza su RobinReach", cls: "bg-slate-100 text-slate-700" },
    unknown: { label: "Su RobinReach", cls: "bg-slate-100 text-slate-700" },
  }[rr.error && rr.status !== "published" ? "failed" : rr.status];
  return (
    <span title={rr.error} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", map.cls, className)}>
      <Send className="h-3 w-3" /> {map.label}
    </span>
  );
}
