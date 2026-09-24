"use client";

import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { ImageOff, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createItem, updateItem, useStore } from "@/lib/client-store";
import { emptyPost } from "@/lib/factories";
import { postIssues } from "@/lib/readiness";
import { useSettings } from "@/lib/settings";

export default function SlotMenu({ dayKey, children }: { dayKey: string; children: React.ReactNode }) {
  const router = useRouter();
  const settings = useSettings();
  const backlog = useStore((s) => s.posts).filter((p) => !p.scheduledFor && p.status !== "pubblicato");
  const at = `${dayKey}T${settings.postingTime}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-72">
        <DropdownMenuLabel>{format(parseISO(dayKey), "EEEE d MMMM", { locale: it })}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {backlog.slice(0, 8).map((p) => (
          <DropdownMenuItem
            key={p.id}
            onClick={() => updateItem("posts", p.id, { scheduledFor: at, status: p.status === "bozza" ? "bozza" : "programmato" })}
          >
            <span className="truncate">{p.title || p.body.slice(0, 40) || "Senza titolo"}</span>
            {postIssues(p).includes("immagine") && <ImageOff className="ml-auto h-3.5 w-3.5 text-red-500" />}
          </DropdownMenuItem>
        ))}
        {backlog.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem
          onClick={async () => {
            const p = await createItem("posts", emptyPost({ scheduledFor: at }));
            router.push(`/contenuti/${p.id}`);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nuovo contenuto per questo giorno
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
