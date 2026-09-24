"use client";

import Link from "next/link";
import { Sparkles, FileText, Lightbulb, ArrowRight, Terminal } from "lucide-react";
import PageHeader, { EmptyState } from "@/components/app/PageHeader";
import { useStore } from "@/lib/client-store";
import { fmtDate } from "@/lib/labels";
import { cn } from "@/lib/utils";

export default function SessioniPage() {
  const sessions = useStore((s) => s.sessions);
  const posts = useStore((s) => s.posts);
  const ideas = useStore((s) => s.ideas);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessioni"
        subtitle="Ogni sessione di Claude Code che ha prodotto contenuti: trascrizione di partenza e risultati"
      />

      {sessions.length === 0 ? (
        <EmptyState
          icon={Terminal}
          title="Nessuna sessione ancora"
          text="In una chat di Claude Code incolla una trascrizione e usa /post-da-trascrizione: i risultati compaiono qui."
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((s, i) => {
            const nPosts = posts.filter((p) => p.sessionId === s.id).length;
            const nIdeas = ideas.filter((x) => x.sessionId === s.id).length;
            return (
              <Link
                key={s.id}
                href={`/sessioni/${s.id}`}
                className={cn(
                  "group flex items-center gap-4 rounded-xl border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                  i === 0 && "border-primary/40 ring-1 ring-primary/20",
                )}
              >
                <div className={cn("rounded-lg p-3", i === 0 ? "bg-primary text-white" : "bg-muted text-primary")}>
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-heading font-semibold text-secondary">{s.title || "Sessione senza titolo"}</p>
                    {i === 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">Ultima</span>}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{s.summary || s.source.slice(0, 140) || "—"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {fmtDate(s.createdAt, "EEEE d MMMM yyyy, HH:mm")}
                    {s.skill && ` · ${s.skill}`}
                  </p>
                </div>
                <div className="hidden gap-4 text-sm sm:flex">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <FileText className="h-4 w-4" /> {nPosts}
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Lightbulb className="h-4 w-4" /> {nIdeas}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
