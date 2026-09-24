import { NextResponse } from "next/server";
import { listTrash, restore } from "@/lib/store";

export async function GET() {
  return NextResponse.json(await listTrash());
}

export async function POST(req: Request) {
  const { id } = await req.json();
  return (await restore(id)) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Non trovato" }, { status: 404 });
}
