"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { DesignElement, DesignFormat, Slide } from "@/lib/types";
import { ElementContent, FORMATS, SlideBackground, textStyle } from "./SlideView";

interface Props {
  slide: Slide;
  format: DesignFormat;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<DesignElement>, commit?: boolean) => void;
}

type Drag = {
  id: string;
  mode: "move" | "resize-se" | "resize-e" | "resize-s";
  startX: number;
  startY: number;
  orig: DesignElement;
};

const SNAP = 10;

export default function EditorCanvas({ slide, format, selectedId, onSelect, onChange }: Props) {
  const { w, h } = FORMATS[format];
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [guides, setGuides] = useState<{ v: boolean; h: boolean }>({ v: false, h: false });
  const [editingId, setEditingId] = useState<string | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => {
      const availW = el.clientWidth - 48;
      const availH = Math.max(420, window.innerHeight - 190);
      setScale(Math.min(availW / w, availH / h, 1));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [w, h]);

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const dx = (e.clientX - drag.startX) / scale;
      const dy = (e.clientY - drag.startY) / scale;
      const o = drag.orig;
      if (drag.mode === "move") {
        let x = Math.round(o.x + dx);
        let y = Math.round(o.y + dy);
        let v = false;
        let hz = false;
        if (Math.abs(x + o.w / 2 - w / 2) < SNAP) {
          x = Math.round(w / 2 - o.w / 2);
          v = true;
        }
        if (Math.abs(y + o.h / 2 - h / 2) < SNAP) {
          y = Math.round(h / 2 - o.h / 2);
          hz = true;
        }
        setGuides({ v, h: hz });
        onChange(drag.id, { x, y }, false);
      } else {
        const patch: Partial<DesignElement> = {};
        if (drag.mode !== "resize-s") patch.w = Math.max(20, Math.round(o.w + dx));
        if (drag.mode !== "resize-e") patch.h = Math.max(10, Math.round(o.h + dy));
        onChange(drag.id, patch, false);
      }
    };
    const up = () => {
      onChange(drag.id, {}, true);
      setDrag(null);
      setGuides({ v: false, h: false });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [drag, scale, w, h, onChange]);

  const start = (e: React.PointerEvent, el: DesignElement, mode: Drag["mode"]) => {
    if (editingId === el.id) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect(el.id);
    setDrag({ id: el.id, mode, startX: e.clientX, startY: e.clientY, orig: el });
  };

  return (
    <div
      ref={wrapRef}
      className="flex min-h-[480px] flex-1 items-center justify-center overflow-hidden rounded-xl border bg-[radial-gradient(circle_at_1px_1px,#d4d8df_1px,transparent_0)] [background-size:18px_18px] p-6"
      onPointerDown={() => {
        onSelect(null);
        setEditingId(null);
      }}
    >
      <div style={{ width: w * scale, height: h * scale }} className="relative shadow-2xl">
        <div
          style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: "top left", position: "relative", overflow: "hidden" }}
        >
          <SlideBackground slide={slide} />
          {slide.elements.map((el) => {
            const selected = el.id === selectedId;
            const editing = el.id === editingId;
            return (
              <div
                key={el.id}
                onPointerDown={(e) => start(e, el, "move")}
                onDoubleClick={() => el.type === "text" && setEditingId(el.id)}
                style={{
                  position: "absolute",
                  left: el.x,
                  top: el.y,
                  width: el.w,
                  height: el.h,
                  opacity: el.opacity ?? 1,
                  cursor: editing ? "text" : "move",
                  outline: selected ? `${2 / scale}px solid #0A66C2` : undefined,
                  outlineOffset: 2 / scale,
                }}
                className={selected ? "" : "hover:outline-dashed hover:outline-sky-400"}
              >
                {editing ? (
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    autoFocus
                    ref={(n) => {
                      if (n && document.activeElement !== n) {
                        n.focus();
                        const r = document.createRange();
                        r.selectNodeContents(n);
                        window.getSelection()?.removeAllRanges();
                        window.getSelection()?.addRange(r);
                      }
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Escape") (e.target as HTMLElement).blur();
                    }}
                    onBlur={(e) => {
                      onChange(el.id, { text: e.currentTarget.innerText }, true);
                      setEditingId(null);
                    }}
                    style={{ width: "100%", minHeight: "100%", ...textStyle(el), outline: "none" }}
                  >
                    {el.text}
                  </div>
                ) : (
                  <ElementContent el={el} />
                )}
                {selected && !editing && (
                  <>
                    {(
                      [
                        ["resize-e", { right: -9 / scale, top: "50%", marginTop: -9 / scale, cursor: "ew-resize" }],
                        ["resize-s", { bottom: -9 / scale, left: "50%", marginLeft: -9 / scale, cursor: "ns-resize" }],
                        ["resize-se", { right: -9 / scale, bottom: -9 / scale, cursor: "nwse-resize" }],
                      ] as const
                    ).map(([mode, pos]) => (
                      <span
                        key={mode}
                        onPointerDown={(e) => start(e, el, mode)}
                        style={{
                          position: "absolute",
                          width: 18 / scale,
                          height: 18 / scale,
                          borderRadius: 999,
                          background: "#fff",
                          border: `${2 / scale}px solid #0A66C2`,
                          ...pos,
                        }}
                      />
                    ))}
                  </>
                )}
              </div>
            );
          })}
          {guides.v && <div className="pointer-events-none absolute inset-y-0 bg-pink-500" style={{ left: w / 2, width: 2 / scale }} />}
          {guides.h && <div className="pointer-events-none absolute inset-x-0 bg-pink-500" style={{ top: h / 2, height: 2 / scale }} />}
        </div>
      </div>
    </div>
  );
}
