import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import type { IdeaStatus, PostFormat, PostStatus } from "./types";

export const PILLARS = [
  "Siti & e-commerce visti da dentro",
  "Vendere da tecnico onesto",
  "AI & automazioni pratiche",
  "Analisi & rifacimenti",
  "Dietro le quinte",
];

export const PILLAR_COLORS: Record<string, string> = {
  "Siti & e-commerce visti da dentro": "bg-blue-100 text-blue-800",
  "Vendere da tecnico onesto": "bg-amber-100 text-amber-800",
  "AI & automazioni pratiche": "bg-violet-100 text-violet-800",
  "Analisi & rifacimenti": "bg-emerald-100 text-emerald-800",
  "Dietro le quinte": "bg-rose-100 text-rose-800",
};
export const pillarColor = (p: string) => PILLAR_COLORS[p] ?? "bg-slate-100 text-slate-700";

export const IDEA_STATUS: Record<IdeaStatus, { label: string; color: string }> = {
  grezza: { label: "Grezza", color: "bg-yellow-100 text-yellow-800" },
  "in-lavorazione": { label: "In lavorazione", color: "bg-blue-100 text-blue-800" },
  usata: { label: "Usata", color: "bg-emerald-100 text-emerald-800" },
  scartata: { label: "Scartata", color: "bg-slate-100 text-slate-600" },
};

export const POST_STATUS: Record<PostStatus, { label: string; color: string; dot: string }> = {
  bozza: { label: "Bozza", color: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  pronto: { label: "Pronto", color: "bg-blue-100 text-blue-800", dot: "bg-blue-500" },
  programmato: { label: "Programmato", color: "bg-purple-100 text-purple-800", dot: "bg-purple-500" },
  pubblicato: { label: "Pubblicato", color: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
};

export const POST_FORMAT: Record<PostFormat, string> = {
  testo: "Solo testo",
  immagine: "Immagine",
  carosello: "Carosello",
};

export const fmtDate = (iso: string | null | undefined, pattern = "d MMM yyyy") =>
  iso ? format(parseISO(iso), pattern, { locale: it }) : "—";

export const LINKEDIN_MAX = 3000;
export const LINKEDIN_FOLD = 210;
