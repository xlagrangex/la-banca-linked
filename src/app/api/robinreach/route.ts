import { NextResponse } from "next/server";
import { getProfile, robinreachConfigured } from "@/lib/robinreach";

export async function GET() {
  if (!robinreachConfigured()) return NextResponse.json({ configured: false });
  try {
    const profile = await getProfile();
    return NextResponse.json({ configured: true, profile });
  } catch (err) {
    return NextResponse.json({ configured: true, error: String(err instanceof Error ? err.message : err) });
  }
}
