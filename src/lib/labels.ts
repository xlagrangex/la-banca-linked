import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import type { Funnel, IdeaStatus, PostStatus, VisualType } from "./types";

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

export const FUNNEL: Record<Funnel, { label: string; hint: string; color: string }> = {
  "tofu-puro": { label: "TOFU puro", hint: "Non parla del lavoro: storia personale, identità, opinione su un tema ampio", color: "bg-sky-100 text-sky-800 ring-sky-200" },
  "tofu-ponte": { label: "TOFU ponte", hint: "Arriva al lavoro di sponda: novità di settore, analisi di terzi, collaborazioni, risorse regalate", color: "bg-cyan-100 text-cyan-800 ring-cyan-200" },
  mofu: { label: "MOFU", hint: "Problemi, obiezioni e desideri del target legati ai servizi", color: "bg-amber-100 text-amber-800 ring-amber-200" },
  bofu: { label: "BOFU", hint: "Caso studio, testimonianza, offerta, richiesta di un'azione", color: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
};

// Il tipo di immagine è indipendente dal tipo di post.
export const VISUAL_TYPE: Record<VisualType, { label: string; needsDesign: boolean }> = {
  selfie: { label: "Selfie", needsDesign: false },
  screen: { label: "Screen", needsDesign: false },
  "foto-pc": { label: "Foto del PC con schermata", needsDesign: false },
  statica: { label: "Immagine statica", needsDesign: true },
  carosello: { label: "Carosello", needsDesign: true },
};

export const fmtDate = (iso: string | null | undefined, pattern = "d MMM yyyy") =>
  iso ? format(parseISO(iso), pattern, { locale: it }) : "—";

export const LINKEDIN_MAX = 3000;
export const LINKEDIN_FOLD = 210;
