"use client";

import { forwardRef } from "react";
import { imageUrl, useStore } from "@/lib/client-store";
import type { DesignElement, DesignFormat, Slide } from "@/lib/types";

export const FORMATS: Record<DesignFormat, { w: number; h: number; label: string }> = {
  portrait: { w: 1080, h: 1350, label: "Verticale 4:5 · 1080×1350" },
  square: { w: 1080, h: 1080, label: "Quadrato 1:1 · 1080×1080" },
  landscape: { w: 1200, h: 627, label: "Orizzontale · 1200×627" },
};

export const FONTS = [
  { label: "Poppins", value: "var(--font-poppins)" },
  { label: "Inter", value: "var(--font-inter)" },
  { label: "Space Grotesk", value: "var(--font-grotesk)" },
  { label: "Playfair Display", value: "var(--font-playfair)" },
  { label: "DM Serif Display", value: "var(--font-dmserif)" },
];

export function ElementContent({ el }: { el: DesignElement }) {
  const img = useStore((s) => (el.imageId ? s.images.find((i) => i.id === el.imageId) : undefined));
  if (el.type === "text")
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          fontSize: el.fontSize,
          fontWeight: el.fontWeight,
          fontFamily: el.fontFamily,
          color: el.color,
          textAlign: el.align,
          lineHeight: el.lineHeight ?? 1.2,
          whiteSpace: "pre-wrap",
          overflowWrap: "break-word",
        }}
      >
        {el.text}
      </div>
    );
  if (el.type === "image")
    return img ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl(img)}
        alt=""
        draggable={false}
        style={{ width: "100%", height: "100%", objectFit: el.fit ?? "cover", borderRadius: el.radius ?? 0 }}
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-slate-200 text-3xl text-slate-500" style={{ borderRadius: el.radius ?? 0 }}>
        Immagine
      </div>
    );
  return <div style={{ width: "100%", height: "100%", background: el.fill, borderRadius: el.radius ?? 0 }} />;
}

export function SlideBackground({ slide }: { slide: Slide }) {
  const bg = useStore((s) => (slide.backgroundImageId ? s.images.find((i) => i.id === slide.backgroundImageId) : undefined));
  return (
    <>
      <div className="absolute inset-0" style={{ background: slide.background }} />
      {bg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl(bg)} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      )}
      {bg && slide.overlay > 0 && (
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
