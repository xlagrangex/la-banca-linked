import { addDays, format, startOfDay, startOfWeek } from "date-fns";
import type { Post, Settings } from "./types";

export const MIN_POSTS_PER_WEEK = 3;

export const DEFAULT_SETTINGS: Omit<Settings, "id" | "createdAt" | "updatedAt"> = {
  postsPerWeek: 3,
  postingDays: [1, 3, 5],
  postingTime: "09:00",
};

export const hasVisual = (p: Post) => p.imageIds.length > 0 || !!p.designId;

export type Issue = "testo" | "immagine" | "stato";

export const ISSUE_LABEL: Record<Issue, string> = {
  testo: "Testo mancante",
  immagine: "Immagine mancante",
  stato: "Da segnare come pronto",
};

export function postIssues(p: Post): Issue[] {
  if (p.status === "pubblicato") return [];
  const out: Issue[] = [];
  if (!p.body.trim()) out.push("testo");
  if (!hasVisual(p)) out.push("immagine");
  if (p.status === "bozza") out.push("stato");
  return out;
}

export const isReady = (p: Post) => postIssues(p).length === 0;

// Settimana da lunedì a domenica; offset 1 = la prossima.
export function weekRange(offset: number, today = new Date()) {
  const start = addDays(startOfWeek(startOfDay(today), { weekStartsOn: 1 }), offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return { start, end: days[6], days, keys: days.map((d) => format(d, "yyyy-MM-dd")) };
}

export function postsInWeek(posts: Post[], offset: number) {
  const { keys } = weekRange(offset);
  return posts
    .filter((p) => p.scheduledFor && keys.includes(p.scheduledFor.slice(0, 10)))
    .sort((a, b) => a.scheduledFor!.localeCompare(b.scheduledFor!));
}

// isoWeekday: 1 = lunedì … 7 = domenica
export const isoWeekday = (d: Date) => ((d.getDay() + 6) % 7) + 1;

export function weekReport(posts: Post[], settings: Pick<Settings, "postsPerWeek" | "postingDays">, offset = 1) {
  const range = weekRange(offset);
  const planned = postsInWeek(posts, offset);
  const ready = planned.filter(isReady);
  const plannedDays = new Set(planned.map((p) => p.scheduledFor!.slice(0, 10)));
  const freeSlots = range.days.filter((d) => settings.postingDays.includes(isoWeekday(d)) && !plannedDays.has(format(d, "yyyy-MM-dd")));
  const missing = Math.max(0, Math.max(MIN_POSTS_PER_WEEK, settings.postsPerWeek) - planned.length);
  return {
    ...range,
    planned,
    ready,
    missing,
    freeSlots,
    complete: missing === 0 && ready.length === planned.length,
  };
}
