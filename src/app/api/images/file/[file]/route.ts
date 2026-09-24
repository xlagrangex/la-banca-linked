import { promises as fs } from "fs";
import path from "path";
import { IMAGES_DIR } from "@/lib/store";

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
};

export async function GET(_: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const safe = path.basename(file);
  try {
    const buf = await fs.readFile(path.join(IMAGES_DIR, safe));
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": TYPES[path.extname(safe).toLowerCase()] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
