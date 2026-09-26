import { NextResponse } from "next/server";
import { get, update } from "@/lib/store";
import { reschedulePost } from "@/lib/robinreach";

// Il post è già in coda su RobinReach e ha cambiato giorno nel calendario: si sposta anche lì.
export async function POST(req: Request) {
  const { postId } = await req.json();
  const post = await get("posts", String(postId ?? ""));
  if (!post?.robinreach || !post.scheduledFor) return NextResponse.json({ error: "Post non in coda su RobinReach" }, { status: 400 });
  try {
    await reschedulePost(post.robinreach.id, `${post.scheduledFor}:00`);
    const saved = await update("posts", post.id, {
      robinreach: { ...post.robinreach, publishTime: post.scheduledFor, syncedAt: new Date().toISOString(), error: undefined },
    });
    return NextResponse.json({ ok: true, post: saved });
  } catch (err) {
    const msg = String(err instanceof Error ? err.message : err);
    await update("posts", post.id, { robinreach: { ...post.robinreach, error: msg } });
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
