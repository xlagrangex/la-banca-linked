import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { imageSize } from "image-size";
import { create, IMAGES_DIR } from "@/lib/store";

const ALLOWED = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"]);

export async function POST(req: Request) {
  const form = await req.formData();
  const source = form.get("source") === "editor" ? "editor" : "upload";
  const tags = String(form.get("tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  const created = [];
  await fs.mkdir(IMAGES_DIR, { recursive: true });
  for (const entry of form.getAll("files")) {
    if (!(entry instanceof File)) continue;
    const ext = path.extname(entry.name).toLowerCase() || ".png";
    if (!ALLOWED.has(ext)) continue;
    const id = randomUUID();
    const file = `${id}${ext}`;
    const buf = Buffer.from(await entry.arrayBuffer());
    await fs.writeFile(path.join(IMAGES_DIR, file), buf);
    let width = 0;
    let height = 0;
    try {
      const dim = imageSize(buf);
      width = dim.width ?? 0;
      height = dim.height ?? 0;
    } catch {}
    created.push(
      await create("images", {
        id,
        file,
        name: entry.name.replace(/\.[^.]+$/, ""),
        width,
        height,
        size: buf.length,
        tags,
        source,
      }),
    );
  }
  return NextResponse.json(created, { status: 201 });
}
