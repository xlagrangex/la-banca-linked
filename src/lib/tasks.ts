import { format, startOfDay } from "date-fns";
import { postIssues, weekReport, type Issue } from "./readiness";
import { VISUAL_TYPE } from "./labels";
import type { Post, Settings } from "./types";

export type AutoTask = {
  key: string;
  kind: Issue | "slot" | "scaduto";
  text: string;
  date: string;
  postId: string | null;
};

const title = (p: Post) => `«${p.title || p.body.slice(0, 50).trim() || "Senza titolo"}»`;

// Le cose da fare nascono dallo stato dei contenuti: niente da spuntare a mano,
// spariscono da sole quando il post è completo.
export function buildAutoTasks(posts: Post[], settings: Pick<Settings, "postsPerWeek" | "postingDays">): AutoTask[] {
  const today = format(startOfDay(new Date()), "yyyy-MM-dd");
  const out: AutoTask[] = [];

  for (const p of posts) {
    if (!p.scheduledFor || p.status === "pubblicato") continue;
    const day = p.scheduledFor.slice(0, 10);
    if (day < today) {
      out.push({ key: `${p.id}:scaduto`, kind: "scaduto", text: `Segna come pubblicato o riprogramma ${title(p)}`, date: day, postId: p.id });
      continue;
    }
    for (const issue of postIssues(p)) {
      const visual = p.visualType ? ` (${VISUAL_TYPE[p.visualType].label.toLowerCase()})` : "";
      const verb = issue === "immagine" ? `Assegna l'immagine${visual} a` : issue === "testo" ? "Scrivi il testo di" : "Rileggi e segna come pronto";
      out.push({ key: `${p.id}:${issue}`, kind: issue, text: `${verb} ${title(p)}`, date: day, postId: p.id });
    }
  }

  for (const offset of [0, 1]) {
    const rep = weekReport(posts, settings, offset);
    const slots = rep.freeSlots.filter((d) => format(d, "yyyy-MM-dd") >= today).slice(0, rep.missing);
    for (const d of slots) {
      const key = format(d, "yyyy-MM-dd");
      out.push({ key: `slot:${key}`, kind: "slot", text: "Programma un post per questo giorno", date: key, postId: null });
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
}
