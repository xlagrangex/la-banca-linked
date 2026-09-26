import { NextResponse } from "next/server";
import { list, update } from "@/lib/store";
import { postStatuses, robinreachConfigured } from "@/lib/robinreach";

// Allinea la banca a RobinReach: i post usciti diventano "pubblicato", quelli falliti lo segnalano.
export async function POST() {
  if (!robinreachConfigured()) return NextResponse.json({ updated: 0 });
  const posts = (await list("posts")).filter((p) => p.robinreach && p.robinreach.status !== "published");
  if (!posts.length) return NextResponse.json({ updated: 0 });
  const statuses = await postStatuses(posts.map((p) => p.robinreach!.id));
  let updated = 0;
  for (const p of posts) {
    const s = statuses[p.robinreach!.id];
    if (!s || s.status === "unknown") continue;
    const now = new Date().toISOString();
    const published = s.status === "published";
    if (s.status === p.robinreach!.status && !published) continue;
    await update("posts", p.id, {
      robinreach: { ...p.robinreach!, status: s.status, syncedAt: now, error: s.error },
      ...(published ? { status: "pubblicato" as const, publishedAt: p.publishedAt ?? p.scheduledFor ?? now, url: p.url || s.url || "" } : {}),
    });
    updated++;
  }
  return NextResponse.json({ updated });
}
