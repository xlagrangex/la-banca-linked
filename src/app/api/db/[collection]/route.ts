import { NextResponse } from "next/server";
import { create, list } from "@/lib/store";
import { COLLECTIONS, type CollectionName } from "@/lib/types";

type Ctx = { params: Promise<{ collection: string }> };

async function resolve(ctx: Ctx) {
  const { collection } = await ctx.params;
  return COLLECTIONS.includes(collection as CollectionName) ? (collection as CollectionName) : null;
}

export async function GET(_: Request, ctx: Ctx) {
  const name = await resolve(ctx);
  if (!name) return NextResponse.json({ error: "Collezione sconosciuta" }, { status: 404 });
  return NextResponse.json(await list(name));
}

export async function POST(req: Request, ctx: Ctx) {
  const name = await resolve(ctx);
  if (!name) return NextResponse.json({ error: "Collezione sconosciuta" }, { status: 404 });
  return NextResponse.json(await create(name, await req.json()), { status: 201 });
}
