import { NextResponse } from "next/server";
import { format } from "date-fns";
import { list } from "@/lib/store";
import { DEFAULT_SETTINGS, MIN_POSTS_PER_WEEK, postIssues, weekReport } from "@/lib/readiness";
import { buildAutoTasks } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export async function GET() {
  const [posts, settingsList] = await Promise.all([list("posts"), list("settings")]);
  const settings = { ...DEFAULT_SETTINGS, ...settingsList[0] };
  const rep = weekReport(posts, settings, 1);
  return NextResponse.json({
    settimana: { da: format(rep.start, "yyyy-MM-dd"), a: format(rep.end, "yyyy-MM-dd") },
    obiettivo: Math.max(MIN_POSTS_PER_WEEK, settings.postsPerWeek),
    programmati: rep.planned.map((p) => ({
      id: p.id,
      titolo: p.title,
      uscita: p.scheduledFor,
      mancano: postIssues(p),
    })),
    pronti: rep.ready.length,
    post_mancanti: rep.missing,
    slot_liberi: rep.freeSlots.map((d) => format(d, "yyyy-MM-dd")),
    settimana_pronta: rep.complete,
    da_fare: buildAutoTasks(posts, settings).map((t) => ({ cosa: t.text, quando: t.date, post_id: t.postId })),
    backlog_senza_data: posts
      .filter((p) => !p.scheduledFor && p.status !== "pubblicato")
      .map((p) => ({ id: p.id, titolo: p.title, mancano: postIssues(p) })),
  });
}
