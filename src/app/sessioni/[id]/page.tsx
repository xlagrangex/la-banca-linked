"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Lightbulb, ChevronDown, ChevronUp, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import IssueBadges from "@/components/app/IssueBadges";
import FunnelBadge from "@/components/app/FunnelBadge";
import { deleteItem, updateItem, useStore } from "@/lib/client-store";
import { fmtDate, IDEA_STATUS, POST_STATUS, VISUAL_TYPE } from "@/lib/labels";
import { cn } from "@/lib/utils";

export default function SessionePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const session = useStore((s) => s.sessions.find((x) => x.id === id));
  const allPosts = useStore((s) => s.posts);
  const allIdeas = useStore((s) => s.ideas);
  const [showSource, setShowSource] = useState(false);

  if (!session)
    return (
      <div className="py-20 text-center text-muted-foreground">
        Sessione non trovata. <Link href="/sessioni" className="text-primary hover:underline">Torna alle sessioni</Link>
      </div>
    );

  const posts = allPosts.filter((p) => p.sessionId === id);
  const ideas = allIdeas.filter((i) => i.sessionId === id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/sessioni">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <Input
              value={session.title}
              onChange={(e) => updateItem("sessions", id, { title: e.target.value }, 600)}
              className="h-auto border-transparent px-0 font-heading text-2xl font-bold text-secondary shadow-none hover:border-input focus:border-input md:text-2xl"
            />
            <p className="text-sm text-muted-foreground">
              {fmtDate(session.createdAt, "EEEE d MMMM yyyy, HH:mm")}
              {session.skill && ` · skill ${session.skill}`} · {posts.length} post · {ideas.length} idee
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive"
          title="Sposta la sessione nel cestino (i contenuti restano in banca)"
          onClick={async () => {
            await deleteItem("sessions", id);
            toast("Sessione nel cestino", { description: "I post e le idee restano in banca." });
            router.push("/sessioni");
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {session.summary && (
        <Card className="border-primary/20 bg-primary/[0.03] py-4">
          <CardContent className="flex gap-3 px-5 text-sm">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="whitespace-pre-wrap">{session.summary}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-heading text-lg">
            <FileText className="h-4 w-4 text-primary" /> Post generati
          </CardTitle>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nessun post salvato da questa sessione.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {posts.map((p) => (
                <Link
                  key={p.id}
                  href={`/contenuti/${p.id}`}
                  className="flex flex-col gap-2 rounded-xl border bg-white p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", POST_STATUS[p.status].color)}>
                      {POST_STATUS[p.status].label}
                    </span>
                    <FunnelBadge funnel={p.funnel} />
                    {p.visualType && <span className="text-xs text-muted-foreground">{VISUAL_TYPE[p.visualType].label}</span>}
                    {p.scheduledFor && <span className="ml-auto text-xs text-muted-foreground">{fmtDate(p.scheduledFor, "EEE d MMM")}</span>}
                  </div>
                  <p className="font-heading font-semibold text-secondary">{p.title || "Senza titolo"}</p>
                  <p className="line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">{p.body}</p>
                  <IssueBadges post={p} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {ideas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg">
              <Lightbulb className="h-4 w-4 text-amber-500" /> Idee salvate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {ideas.map((i) => (
                <li key={i.id} className="flex items-start gap-3 py-3">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{i.title}</p>
                    {i.notes && <p className="line-clamp-2 text-xs text-muted-foreground">{i.notes}</p>}
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", IDEA_STATUS[i.status].color)}>
                    {IDEA_STATUS[i.status].label}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {session.source && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading text-lg">
              {session.sourceType ? session.sourceType.charAt(0).toUpperCase() + session.sourceType.slice(1) : "Materiale di partenza"}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowSource((v) => !v)}>
              {showSource ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showSource ? "Nascondi" : `Mostra (${session.source.length.toLocaleString("it-IT")} caratteri)`}
            </Button>
          </CardHeader>
          {showSource && (
            <CardContent>
              <pre className="max-h-[520px] overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-4 font-sans text-sm leading-relaxed">
                {session.source}
              </pre>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
