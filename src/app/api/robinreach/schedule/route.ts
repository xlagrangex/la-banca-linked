import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { get, IMAGES_DIR, list, update } from "@/lib/store";
import { schedulePost } from "@/lib/robinreach";

const MIME: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

// Manda (o aggiorna) un post della banca nella coda di RobinReach, programmato alla sua data di uscita.
// Le grafiche dell'editor arrivano già renderizzate dal browser come file; altrimenti si usano le immagini allegate.
export async function POST(req: Request) {
  const form = await req.formData();
  const post = await get("posts", String(form.get("postId") ?? ""));
  if (!post) return fail("Post non trovato", 404);
  if (!post.body.trim()) return fail("Il post non ha testo");
  if (post.body.length > 3000) return fail("Il testo supera i 3000 caratteri di LinkedIn");
  if (!post.scheduledFor) return fail("Il post non ha una data di uscita");
  if (new Date(post.scheduledFor).getTime() < Date.now() + 60_000) return fail("La data di uscita è già passata");
  if (post.status === "pubblicato") return fail("Il post risulta già pubblicato");

  const media: { bytes: Buffer; type: string; name: string }[] = [];
  for (const entry of form.getAll("files")) {
    if (entry instanceof File) media.push({ bytes: Buffer.from(await entry.arrayBuffer()), type: entry.type || "image/png", name: entry.name });
  }
  if (!media.length && post.imageIds.length) {
    const images = await list("images");
    for (const id of post.imageIds) {
      const img = images.find((i) => i.id === id);
      const type = img && MIME[path.extname(img.file).toLowerCase()];
      if (!img || !type) continue;
      media.push({ bytes: await fs.readFile(path.join(IMAGES_DIR, img.file)), type, name: img.file });
    }
  }

  try {
    const existing = post.robinreach && post.robinreach.status !== "published" ? post.robinreach.id : null;
    const res = await schedulePost({
      existingId: existing,
      content: post.body,
      publishTime: `${post.scheduledFor}:00`,
      media,
      carousel: post.visualType === "carosello" || media.length > 1,
      label: "La banca Linked",
    });
    const saved = await update("posts", post.id, {
      status: post.status === "bozza" || post.status === "pronto" ? "programmato" : post.status,
      robinreach: { id: res.id, status: "scheduled", publishTime: post.scheduledFor, syncedAt: new Date().toISOString() },
    });
    return NextResponse.json({ ok: true, post: saved, media: media.length });
  } catch (err) {
    const msg = String(err instanceof Error ? err.message : err);
    await update("posts", post.id, {
      robinreach: post.robinreach ? { ...post.robinreach, error: msg, syncedAt: new Date().toISOString() } : post.robinreach,
    });
    return fail(msg, 502);
  }
}
