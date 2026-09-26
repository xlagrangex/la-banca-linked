"use client";

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { toPng } from "html-to-image";
import SlideView, { FORMATS } from "@/components/design/SlideView";
import { reloadAll } from "./client-store";
import type { Design, Post } from "./types";

// Le grafiche dell'editor esistono solo come componenti: per mandarle a RobinReach
// si renderizzano fuori schermo e si esportano in PNG, come fa "Esporta" nell'editor.
export async function renderDesign(design: Design): Promise<Blob[]> {
  const { w, h } = FORMATS[design.format];
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  Object.assign(host.style, { position: "fixed", left: "-100000px", top: "0", pointerEvents: "none" });
  document.body.appendChild(host);
  const nodes: (HTMLDivElement | null)[] = [];
  const root = createRoot(host);
  try {
    root.render(
      design.slides.map((s, i) =>
        createElement(SlideView, {
          key: s.id,
          slide: s,
          format: design.format,
          ref: (n: HTMLDivElement | null) => {
            nodes[i] = n;
          },
        }),
      ),
    );
    await new Promise((r) => setTimeout(r, 300));
    await document.fonts.ready;
    await Promise.all(
      Array.from(host.querySelectorAll("img")).map((img) => (img.complete ? null : new Promise((r) => (img.onload = img.onerror = r)))),
    );
    const out: Blob[] = [];
    for (const node of nodes) {
      if (!node) continue;
      const url = await toPng(node, { width: w, height: h, pixelRatio: 1, cacheBust: true, backgroundColor: "#ffffff" });
      out.push(await fetch(url).then((r) => r.blob()));
    }
    return out;
  } finally {
    root.unmount();
    host.remove();
  }
}

export type SendResult = { postId: string; ok: boolean; error?: string };

async function readError(res: Response) {
  try {
    return (await res.json()).error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function sendToRobinReach(post: Post, designs: Design[]): Promise<SendResult> {
  const form = new FormData();
  form.set("postId", post.id);
  const design = post.imageIds.length === 0 && post.designId ? designs.find((d) => d.id === post.designId) : undefined;
  if (design) {
    const blobs = await renderDesign(design);
    blobs.forEach((b, i) => form.append("files", new File([b], `grafica-${String(i + 1).padStart(2, "0")}.png`, { type: "image/png" })));
  }
  const res = await fetch("/api/robinreach/schedule", { method: "POST", body: form });
  return res.ok ? { postId: post.id, ok: true } : { postId: post.id, ok: false, error: await readError(res) };
}

export async function rescheduleOnRobinReach(postId: string): Promise<SendResult> {
  const res = await fetch("/api/robinreach/reschedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postId }),
  });
  await reloadAll();
  return res.ok ? { postId, ok: true } : { postId, ok: false, error: await readError(res) };
}

let lastSync = 0;
export async function syncRobinReach(force = false) {
  if (!force && Date.now() - lastSync < 5 * 60_000) return;
  lastSync = Date.now();
  const res = await fetch("/api/robinreach/sync", { method: "POST" }).catch(() => null);
  if (res?.ok && (await res.json()).updated > 0) await reloadAll();
}

export const isQueued = (p: Post) => !!p.robinreach && p.robinreach.status !== "published";
