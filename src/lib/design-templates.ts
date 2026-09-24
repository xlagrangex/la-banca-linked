import type { Design, DesignElement, DesignFormat, Slide } from "./types";

export const BRAND = {
  navy: "#1B2D4F",
  blue: "#0A66C2",
  sky: "#70B5F9",
  paper: "#F7F5F0",
  ink: "#16202E",
  amber: "#F5B83D",
  white: "#FFFFFF",
};

export const SWATCHES = [
  BRAND.navy,
  BRAND.blue,
  BRAND.sky,
  BRAND.paper,
  BRAND.white,
  BRAND.ink,
  BRAND.amber,
  "#E4572E",
  "#2BA84A",
  "#EDE7FF",
];

const DIMS: Record<DesignFormat, { w: number; h: number }> = {
  portrait: { w: 1080, h: 1350 },
  square: { w: 1080, h: 1080 },
  landscape: { w: 1200, h: 627 },
};

export const uid = () => Math.random().toString(36).slice(2, 10);

const text = (p: Partial<DesignElement>): DesignElement => ({
  id: uid(),
  type: "text",
  x: 90,
  y: 90,
  w: 900,
  h: 120,
  text: "Testo",
  fontSize: 44,
  fontWeight: 500,
  fontFamily: "var(--font-inter)",
  color: BRAND.ink,
  align: "left",
  lineHeight: 1.25,
  ...p,
});

const shape = (p: Partial<DesignElement>): DesignElement => ({
  id: uid(),
  type: "shape",
  x: 90,
  y: 90,
  w: 120,
  h: 10,
  fill: BRAND.blue,
  radius: 0,
  ...p,
});

export type TemplateKey = "copertina" | "punto" | "citazione" | "chiusura" | "vuota" | "immagine";

export const TEMPLATES: { key: TemplateKey; label: string }[] = [
  { key: "copertina", label: "Copertina" },
  { key: "punto", label: "Punto numerato" },
  { key: "citazione", label: "Citazione" },
  { key: "immagine", label: "Foto + titolo" },
  { key: "chiusura", label: "Chiusura / CTA" },
  { key: "vuota", label: "Vuota" },
];

export function makeSlide(key: TemplateKey, format: DesignFormat, n = 1): Slide {
  const { w, h } = DIMS[format];
  const pad = format === "landscape" ? 70 : 90;
  const inner = w - pad * 2;
  const k = format === "landscape" ? 0.7 : 1;
  const footer = text({
    x: pad,
    y: h - pad - 40,
    w: inner,
    h: 40,
    text: "Vincenzo Petrone · Bizstudio",
    fontSize: 26 * k,
    fontWeight: 600,
    fontFamily: "var(--font-poppins)",
  });

  switch (key) {
    case "copertina":
      return {
        id: uid(),
        background: BRAND.navy,
        backgroundImageId: null,
        overlay: 0.55,
        elements: [
          shape({ x: pad, y: pad, w: 90, h: 10, fill: BRAND.amber, radius: 5 }),
          text({ x: pad, y: pad + 50, w: inner, h: 50, text: "IL PUNTO È QUESTO", fontSize: 28 * k, fontWeight: 700, fontFamily: "var(--font-poppins)", color: BRAND.sky }),
          text({
            x: pad,
            y: h * 0.3,
            w: inner,
            h: h * 0.4,
            text: "Il titolo che ferma lo scroll va qui",
            fontSize: 104 * k,
            fontWeight: 800,
            fontFamily: "var(--font-poppins)",
            color: BRAND.white,
            lineHeight: 1.05,
          }),
          { ...footer, color: BRAND.white, w: inner * 0.6 },
          text({ x: pad + inner * 0.6, y: h - pad - 40, w: inner * 0.4, h: 40, text: "Scorri →", fontSize: 26 * k, fontWeight: 700, fontFamily: "var(--font-poppins)", color: BRAND.amber, align: "right" }),
        ],
      };
    case "punto":
      return {
        id: uid(),
        background: BRAND.paper,
        backgroundImageId: null,
        overlay: 0,
        elements: [
          text({ x: pad, y: pad, w: 300, h: 170, text: String(n).padStart(2, "0"), fontSize: 150 * k, fontWeight: 800, fontFamily: "var(--font-poppins)", color: BRAND.blue, lineHeight: 1 }),
          text({ x: pad, y: pad + 230 * k, w: inner, h: 200, text: "Il concetto in una riga", fontSize: 68 * k, fontWeight: 700, fontFamily: "var(--font-poppins)", color: BRAND.navy, lineHeight: 1.1 }),
          text({
            x: pad,
            y: pad + 470 * k,
            w: inner,
            h: 400 * k,
            text: "Due o tre righe che spiegano il perché. Concreto, con un esempio vero.",
            fontSize: 40 * k,
            fontWeight: 400,
            color: "#3B4656",
            lineHeight: 1.4,
          }),
          { ...footer, color: BRAND.navy },
        ],
      };
    case "citazione":
      return {
        id: uid(),
        background: BRAND.blue,
        backgroundImageId: null,
        overlay: 0.4,
        elements: [
          text({ x: pad, y: pad, w: 200, h: 200, text: "“", fontSize: 260 * k, fontWeight: 400, fontFamily: "var(--font-dmserif)", color: BRAND.sky, lineHeight: 1 }),
          text({
            x: pad,
            y: h * 0.3,
            w: inner,
            h: h * 0.4,
            text: "Una frase che vale la pena salvare.",
            fontSize: 84 * k,
            fontWeight: 400,
            fontFamily: "var(--font-dmserif)",
            color: BRAND.white,
            lineHeight: 1.12,
          }),
          { ...footer, color: BRAND.white },
        ],
      };
    case "immagine":
      return {
        id: uid(),
        background: BRAND.white,
        backgroundImageId: null,
        overlay: 0,
        elements: [
          { id: uid(), type: "image", x: pad, y: pad, w: inner, h: h * 0.52, fit: "cover", radius: 24 },
          text({ x: pad, y: pad + h * 0.52 + 50, w: inner, h: 220, text: "Cosa si vede in questa foto, e perché conta", fontSize: 60 * k, fontWeight: 700, fontFamily: "var(--font-poppins)", color: BRAND.navy, lineHeight: 1.12 }),
          { ...footer, color: BRAND.navy },
        ],
      };
    case "chiusura":
      return {
        id: uid(),
        background: BRAND.navy,
        backgroundImageId: null,
        overlay: 0.5,
        elements: [
          text({ x: pad, y: h * 0.28, w: inner, h: 260, text: "Ti è stato utile?", fontSize: 96 * k, fontWeight: 800, fontFamily: "var(--font-poppins)", color: BRAND.white, lineHeight: 1.05 }),
          text({
            x: pad,
            y: h * 0.28 + 200 * k,
            w: inner,
            h: 240,
            text: "Salvalo per dopo e seguimi: ogni settimana racconto un sito visto da dentro.",
            fontSize: 42 * k,
            fontWeight: 400,
            color: "#C9D3E3",
            lineHeight: 1.35,
          }),
          shape({ x: pad, y: h - pad - 110, w: 360, h: 72, fill: BRAND.blue, radius: 36 }),
          text({ x: pad, y: h - pad - 92, w: 360, h: 40, text: "Segui Vincenzo", fontSize: 30 * k, fontWeight: 700, fontFamily: "var(--font-poppins)", color: BRAND.white, align: "center" }),
        ],
      };
    default:
      return { id: uid(), background: BRAND.white, backgroundImageId: null, overlay: 0, elements: [] };
  }
}

export function newDesign(kind: Design["kind"], format: DesignFormat, name?: string): Partial<Design> {
  const slides =
    kind === "carosello"
      ? [makeSlide("copertina", format), makeSlide("punto", format, 1), makeSlide("punto", format, 2), makeSlide("chiusura", format)]
      : [makeSlide("copertina", format)];
  return { name: name ?? (kind === "carosello" ? "Nuovo carosello" : "Nuova grafica"), kind, format, slides };
}

// Cambiando formato si riscalano posizioni e dimensioni, così il layout resta proporzionato.
export function reformat(slides: Slide[], from: DesignFormat, to: DesignFormat): Slide[] {
  const a = DIMS[from];
  const b = DIMS[to];
  const sx = b.w / a.w;
  const sy = b.h / a.h;
  const sf = Math.min(sx, sy);
  return slides.map((s) => ({
    ...s,
    elements: s.elements.map((e) => ({
      ...e,
      x: Math.round(e.x * sx),
      y: Math.round(e.y * sy),
      w: Math.round(e.w * sx),
      h: Math.round(e.h * sy),
      fontSize: e.fontSize ? Math.round(e.fontSize * sf) : e.fontSize,
    })),
  }));
}
