"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Check, Loader2, AlertTriangle, HardDrive } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useStore } from "@/lib/client-store";

const TITLES: [string, string][] = [
  ["/da-fare", "Cose da fare"],
  ["/sessioni", "Sessioni di Claude Code"],
  ["/idee", "Banca idee grezze"],
  ["/contenuti", "Banca contenuti"],
  ["/immagini", "Banca immagini"],
  ["/piano", "Piano editoriale"],
  ["/editor", "Editor grafiche"],
  ["/backup", "Backup e dati"],
];

function SaveStatus() {
  const pending = useStore((s) => s.pending);
  const dirty = useStore((s) => s.dirty);
  const lastSaved = useStore((s) => s.lastSaved);
  const error = useStore((s) => s.error);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  if (error)
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
        <AlertTriangle className="h-3.5 w-3.5" /> Errore di salvataggio
      </span>
    );
  if (pending > 0 || dirty > 0)
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvataggio…
      </span>
    );
  const ago = lastSaved ? Math.max(0, Math.round((now - lastSaved) / 60_000)) : null;
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
      <Check className="h-3.5 w-3.5" />
      {ago === null ? "Tutto salvato in locale" : ago < 1 ? "Salvato ora" : `Salvato ${ago} min fa`}
    </span>
  );
}

export default function AppHeader({ onMenuToggle }: { onMenuToggle: () => void }) {
  const pathname = usePathname();
  const title = TITLES.find(([p]) => pathname.startsWith(p))?.[1] ?? "Pannello contenuti";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden lg:block">
        <h2 className="font-heading text-lg font-semibold text-secondary">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        <SaveStatus />
        <Button variant="ghost" size="icon" asChild title="Backup e dati">
          <Link href="/backup">
            <HardDrive className="h-5 w-5 text-muted-foreground" />
          </Link>
        </Button>
        <div className="flex items-center gap-2 px-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-sm text-white">V</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium md:inline-block">Vincenzo</span>
        </div>
      </div>
    </header>
  );
}
