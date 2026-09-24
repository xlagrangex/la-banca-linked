import { NextResponse } from "next/server";
import { get, remove, update } from "@/lib/store";
import { COLLECTIONS, type CollectionName } from "@/lib/types";

type Ctx = { params: Promise<{ collection: string; id: string }> };

async function resolve(ctx: Ctx) {
  const { collection, id } = await ctx.params;
  return { name: COLLECTIONS.includes(collection as CollectionName) ? (collection as CollectionName) : null, id };
}

const notFound = () => NextResponse.json({ error: "Non trovato" }, { status: 404 });

export async function GET(_: Request, ctx: Ctx) {
  const { name, id } = await resolve(ctx);
  const item = name && (await get(name, id));
  return item ? NextResponse.json(item) : notFound();
}

export async function PUT(req: Request, ctx: Ctx) {
  const { name, id } = await resolve(ctx);
  const item = name && (await update(name, id, await req.json()));
  return item ? NextResponse.json(item) : notFound();
}

export async function DELETE(_: Request, ctx: Ctx) {
  const { name, id } = await resolve(ctx);
  return name && (await remove(name, id)) ? NextResponse.json({ ok: true }) : notFound();
}
