import { NextResponse } from "next/server";
import { dataVersion } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ version: await dataVersion() });
}
