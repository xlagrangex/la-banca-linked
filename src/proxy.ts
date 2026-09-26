import { NextResponse, type NextRequest } from "next/server";
import { authEnabled, safeEqual, SESSION_COOKIE, sessionValue } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  if (!authEnabled()) return NextResponse.next();

  const token = process.env.BANCA_TOKEN;
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (token && bearer && safeEqual(bearer, token)) return NextResponse.next();

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (cookie && safeEqual(cookie, await sessionValue(process.env.BANCA_PASSWORD!))) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Accesso richiesto" }, { status: 401 });
  const login = new URL("/login", req.url);
  if (req.nextUrl.pathname !== "/") login.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!login|api/login|_next/|fonts/|brand/|favicon.ico).*)"],
};
