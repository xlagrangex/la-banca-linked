"use client";

import { forwardRef } from "react";
import { ACCENT_BOLD } from "@/lib/design-templates";
import { imageUrl, useStore } from "@/lib/client-store";
import type { DesignElement, DesignFormat, Slide } from "@/lib/types";

export const FORMATS: Record<DesignFormat, { w: number; h: number; label: string }> = {
  portrait: { w: 1080, h: 1350, label: "Verticale 4:5 · 1080×1350" },
  square: { w: 1080, h: 1080, label: "Quadrato 1:1 · 1080×1080" },
  landscape: { w: 1200, h: 627, label: "Orizzontale · 1200×627" },
  linkedin: { w: 1200, h: 1200, label: "Quadrato LinkedIn · 1200×1200" },
};

export const FONTS = [{ label: "Inter 18pt", value: "'Inter 18pt'" }];

// L'export PNG (SVG foreignObject) tronca il corpo al pixel intero e arrotonda la posizione dei glifi:
// impaginando il testo 10× più grande e riscalandolo, lo scarto diventa un decimo di pixel.
const TEXT_SUPERSAMPLE = 10;

// Kerning e legature spenti quando serve combaciare con Canva, che li disattiva.
export function textStyle(el: DesignElement): React.CSSProperties {
  return {
    fontSize: el.fontSize,
    fontWeight: el.fontWeight,
    fontFamily: el.fontFamily,
    color: el.color,
    textAlign: el.align,
    lineHeight: el.lineHeight ?? 1.2,
    letterSpacing: el.letterSpacing ? `${el.letterSpacing}em` : undefined,
    fontKerning: el.kerning === false ? "none" : undefined,
    fontFeatureSettings: el.kerning === false ? '"kern" 0, "liga" 0, "clig" 0, "calt" 0' : undefined,
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
  };
}

// Le parti tra *asterischi* prendono il colore d'accento (una sfumatura o un colore pieno), o il grassetto.
function AccentText({ text, accent }: { text: string; accent?: string }) {
  if (!accent) return <>{text}</>;
  const style: React.CSSProperties =
    accent === ACCENT_BOLD ? { fontWeight: 700 } : { backgroundImage: accent, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" };
  return (
    <>
      {text.split(/(\*[^*]+\*)/g).map((part, i) =>
        part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
          <span
            key={i}
            style={style}
          >
            {part.slice(1, -1)}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function ElementContent({ el }: { el: DesignElement }) {
  const img = useStore((s) => (el.imageId ? s.images.find((i) => i.id === el.imageId) : undefined));
  if (el.type === "text")
    return (
      <div style={{ width: "100%", height: "100%" }}>
        <div
          style={{
            ...textStyle({ ...el, fontSize: (el.fontSize ?? 16) * TEXT_SUPERSAMPLE }),
            width: el.w * TEXT_SUPERSAMPLE,
            height: el.h * TEXT_SUPERSAMPLE,
            transform: `scale(${1 / TEXT_SUPERSAMPLE})`,
            transformOrigin: "0 0",
          }}
        >
          <AccentText text={el.text ?? ""} accent={el.accent} />
        </div>
      </div>
    );
  if (el.type === "image") {
    const src = img ? imageUrl(img) : el.src;
    return src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        draggable={false}
        style={{ width: "100%", height: "100%", objectFit: el.fit ?? "cover", borderRadius: el.radius ?? 0 }}
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-slate-200 text-3xl text-slate-500" style={{ borderRadius: el.radius ?? 0 }}>
        Immagine
      </div>
    );
  }
  return <div style={{ width: "100%", height: "100%", background: el.fill, borderRadius: el.radius ?? 0 }} />;
}

export function SlideBackground({ slide }: { slide: Slide }) {
  const bg = useStore((s) => (slide.backgroundImageId ? s.images.find((i) => i.id === slide.backgroundImageId) : undefined));
  const src = bg ? imageUrl(bg) : slide.backgroundSrc;
  return (
    <>
      <div className="absolute inset-0" style={{ background: slide.background }} />
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      )}
      {src && slide.overlay > 0 && (
        <div className="absolute inset-0" style={{ background: `rgba(10,20,40,${slide.overlay})` }} />
      )}
    </>
  );
}

interface Props {
  slide: Slide;
  format: DesignFormat;
  scale?: number;
}

const SlideView = forwardRef<HTMLDivElement, Props>(function SlideView({ slide, format, scale = 1 }, ref) {
  const { w, h } = FORMATS[format];
  return (
    <div style={{ width: w * scale, height: h * scale, overflow: "hidden", position: "relative" }}>
      <div
        ref={ref}
        style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: "top left", position: "relative", overflow: "hidden" }}
      >
        <SlideBackground slide={slide} />
        {slide.elements.map((el) => (
          <div
            key={el.id}
            style={{ position: "absolute", left: el.x, top: el.y, width: el.w, height: el.h, opacity: el.opacity ?? 1 }}
          >
            <ElementContent el={el} />
          </div>
        ))}
      </div>
    </div>
  );
});

export default SlideView;
