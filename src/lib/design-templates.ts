import type { Design, DesignElement, DesignFormat, Signature, Slide } from "./types";

// Tutto viene dalla pagina 1 del modello Canva "Template contenuti LinkedIn" (1200×1200):
// coordinate, corpi e spaziature sono quelli letti dal file Canva, non arrotondati.

export const BIZ_GRADIENT = "linear-gradient(90deg, #2f6bff 0%, #e21ecf 50%, #ff7a1a 100%)";
// Accento "grassetto": le parole tra asterischi restano del colore del testo ma in bold.
export const ACCENT_BOLD = "bold";
export const BIZ_FONT = "'Inter 18pt'";

export const INK = "#0F1015";

export const SWATCHES = [BIZ_GRADIENT, "#000000", INK, "#FFFFFF", "#2F6BFF", "#E21ECF", "#FF7A1A"];
export const TEXT_SWATCHES = SWATCHES.filter((c) => c.startsWith("#"));

export const BACKGROUNDS = [{ label: "Sfumato", src: "/brand/bizstudio/sfondo.png" }];

const A = "/brand/bizstudio/";

const DIMS: Record<DesignFormat, { w: number; h: number }> = {
  portrait: { w: 1080, h: 1350 },
  square: { w: 1080, h: 1080 },
  landscape: { w: 1200, h: 627 },
  linkedin: { w: 1200, h: 1200 },
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export const text = (p: Partial<DesignElement>): DesignElement => ({
  id: uid(),
  type: "text",
  x: 187.134,
  y: 226.8,
  w: 785.604,
  h: 146,
  text: "Testo",
  fontSize: 132.204,
  fontWeight: 700,
  fontFamily: BIZ_FONT,
  color: INK,
  align: "left",
  lineHeight: 146 / 132.204,
  letterSpacing: -0.051,
  kerning: false,
  ...p,
});

export const shape = (p: Partial<DesignElement>): DesignElement => ({
  id: uid(),
  type: "shape",
  x: 0,
  y: 0,
  w: 300,
  h: 300,
  fill: BIZ_GRADIENT,
  radius: 0,
  ...p,
});

const image = (p: Partial<DesignElement>): DesignElement => ({ id: uid(), type: "image", x: 0, y: 0, w: 100, h: 100, fit: "cover", ...p });

const topBar = () => shape({ x: -14.932, y: -43.4958, w: 1214.93, h: 62.6 });

// Chi firma le grafiche: ognuno sceglie la sua firma dall'editor (impostazione locale della banca).
export const SIGNATURES: Record<Signature, { label: string; name: string; role: string; photo: string }> = {
  vincenzo: { label: "Vincenzo Petrone", name: "Vincenzo Petrone", role: "Ingegnere AI  e Founder di BizStudio", photo: A + "foto-vincenzo.png" },
  federico: { label: "Federico Chianesi", name: "Federico Chianesi", role: "Direttore commerciale di BizStudio", photo: A + "foto-federico.png" },
};

// Firma "card": riquadro bianco con razzo, nome, ruolo e foto.
const cardFooter = (sig: Signature) => [
  shape({ x: 187.134, y: 1023.9, w: 894.461, h: 148.038, fill: "#FEFEFE", radius: 74.019 }),
  image({ x: 917.338, y: 909.036, w: 307.633, h: 312.131, src: SIGNATURES[sig].photo }),
  text({ x: 331.553, y: 1042.742, w: 480, h: 69, text: SIGNATURES[sig].name, fontSize: 49.3818, color: "#000000", lineHeight: 69 / 49.3818, letterSpacing: -0.091 }),
  text({ x: 331.553, y: 1101.997, w: 590, h: 53, text: SIGNATURES[sig].role, fontSize: 38.1336, fontWeight: 500, color: "#000000", lineHeight: 53 / 38.1336, letterSpacing: -0.053 }),
  image({ x: 197.974, y: 1039.07, w: 130.926, h: 132.866, src: A + "logo-razzo.png" }),
];

const titleBlock = (t: string, p: Partial<DesignElement> = {}) => text({ text: t, h: 146 * (t.split("\n").length || 1), accent: BIZ_GRADIENT, ...p });

const bodyText = (t: string, p: Partial<DesignElement> = {}) =>
  text({ x: 197.97, y: 430.35, w: 785.6, h: 190, text: t, fontSize: 83.04, fontWeight: 400, lineHeight: 1.098, ...p });

// Bottone pillola con la scritta centrata, stesse misure della pillola del sito in copertina.
export const pillButton = (label: string, x = 188.18, y = 712.75, w = 436.26, h = 123.59): DesignElement[] => [
  shape({ x, y, w, h, radius: h / 2 }),
  text({ x, y: y + h / 2 - 30.07, w, h: 61, text: label, fontSize: 43.38, color: "#FFFFFF", align: "center", lineHeight: 1.386, letterSpacing: 0 }),
];

export type TemplateKey = "bizstudio" | "punto" | "citazione" | "immagine" | "chiusura" | "vuota";

export const TEMPLATES: { key: TemplateKey; label: string }[] = [
  { key: "bizstudio", label: "Copertina" },
  { key: "punto", label: "Punto" },
  { key: "citazione", label: "Citazione" },
  { key: "immagine", label: "Foto + titolo" },
  { key: "chiusura", label: "Chiusura / CTA" },
  { key: "vuota", label: "Vuota" },
];

function base(elements: DesignElement[], bg = BACKGROUNDS[0].src): Slide {
  return { id: uid(), background: "#FFFFFF", backgroundImageId: null, backgroundSrc: bg, overlay: 0, elements };
}

function layout(key: TemplateKey, sig: Signature): Slide {
  switch (key) {
    case "bizstudio":
      return base([
        cardFooter(sig)[0],
        cardFooter(sig)[1],
        titleBlock("Frase di\nEsempio per\n*Post Linkedin*", { x: 199.732, y: 227.236, h: 438 }),
        topBar(),
        ...cardFooter(sig).slice(2, 4),
        shape({ x: 187.134, y: 678.681, w: 436.263, h: 123.587, radius: 61.7935 }),
        text({ x: 223.818, y: 710.2795, w: 370, h: 61, text: "www.bizstudio.it", fontSize: 43.2845, fontWeight: 400, color: "#FFFFFF", lineHeight: 45 / 32.2536, letterSpacing: 0 }),
        cardFooter(sig)[4],
      ]);
    case "punto":
      return base([
        topBar(),
        titleBlock("Il concetto\nin una *riga*", { h: 292 }),
        bodyText("Due o tre righe che spiegano il perché. Concreto, con un esempio vero.", { y: 560, w: 760, fontSize: 52, lineHeight: 1.3, h: 300 }),
        ...cardFooter(sig),
      ]);
    case "citazione":
      return base([
        topBar(),
        text({ x: 187.134, y: 150, w: 300, h: 200, text: "*“*", fontSize: 260, lineHeight: 1, accent: BIZ_GRADIENT }),
        titleBlock("Una frase che vale\nla pena *salvare*.", { y: 380, fontSize: 96, lineHeight: 1.104, h: 320 }),
        ...cardFooter(sig),
      ]);
    case "immagine":
      return base([
        topBar(),
        image({ x: 187.134, y: 110, w: 825.73, h: 480, radius: 36 }),
        titleBlock("Cosa si vede\nin *questa foto*", { y: 640, fontSize: 88, lineHeight: 1.104, h: 200 }),
        ...cardFooter(sig),
      ]);
    case "chiusura":
      return base([
        topBar(),
        titleBlock("Ti è stato\n*utile?*", { h: 292 }),
        bodyText("Salvalo per dopo e seguimi\nper il prossimo.", { y: 540, fontSize: 60, h: 140 }),
        ...pillButton("Seguimi", 188.18, 740),
        ...cardFooter(sig),
      ]);
    default:
      return base([topBar()]);
  }
}

// I modelli sono disegnati su 1200×1200: negli altri formati si scala in modo uniforme,
// e la firma in basso resta agganciata al fondo.
function fit(slide: Slide, format: DesignFormat): Slide {
  const { w, h } = DIMS[format];
  if (w === 1200 && h === 1200) return slide;
  const k = Math.min(w, h) / 1200;
  const dx = (w - 1200 * k) / 2;
  return {
    ...slide,
    elements: slide.elements.map((e) => ({
      ...e,
      x: dx + e.x * k,
      y: e.y > 820 ? h - (1200 - e.y) * k : e.y * k,
      w: e.w * k,
      h: e.h * k,
      fontSize: e.fontSize ? e.fontSize * k : undefined,
      radius: e.radius ? e.radius * k : e.radius,
    })),
  };
}

export function makeSlide(key: TemplateKey, format: DesignFormat, sig: Signature = "vincenzo"): Slide {
  return fit(layout(key, sig), format);
}

export function newDesign(kind: Design["kind"], format: DesignFormat, sig: Signature = "vincenzo", name?: string): Partial<Design> {
  const slides =
    kind === "carosello"
      ? (["bizstudio", "punto", "punto", "chiusura"] as TemplateKey[]).map((k) => makeSlide(k, format, sig))
      : [makeSlide("bizstudio", format, sig)];
  return { name: name ?? (kind === "carosello" ? "Nuovo carosello" : "Nuova grafica"), kind, format, slides };
}

// Cambiando formato si riscala in modo uniforme (cerchi e pillole restano tali).
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
      x: e.x * sx,
      y: e.y * sy,
      w: e.w * sf,
      h: e.h * sf,
      fontSize: e.fontSize ? e.fontSize * sf : e.fontSize,
      radius: e.radius ? e.radius * sf : e.radius,
    })),
  }));
}
