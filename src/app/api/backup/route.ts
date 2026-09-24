import { NextResponse } from "next/server";
import { DATA_DIR, listBackups, snapshotAll } from "@/lib/store";

export async function GET(req: Request) {
  if (new URL(req.url).searchParams.has("download")) {
    const snapshot = await snapshotAll();
    const name = `banca-linked-${new Date().toISOString().slice(0, 10)}.json`;
    return new Response(JSON.stringify(snapshot, null, 2), {
      headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${name}"` },
    });
  }
  return NextResponse.json({ dataDir: DATA_DIR, backups: await listBackups() });
}
