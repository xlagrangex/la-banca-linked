import { NextResponse } from "next/server";
import { safeEqual, SESSION_COOKIE, sessionValue } from "@/lib/auth";

export async function POST(req: Request) {
  const expected = process.env.BANCA_PASSWORD;
  if (!expected) return NextResponse.json({ ok: true });
  const { password } = await req.json().catch(() => ({ password: "" }));
  if (typeof password !== "string" || !safeEqual(password, expected)) {
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: "Password sbagliata" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await sessionValue(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
