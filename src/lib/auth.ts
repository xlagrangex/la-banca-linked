// Accesso alla banca quando è online (VPS). In locale BANCA_PASSWORD non è impostata e la banca resta aperta.
// Il browser entra con la password (cookie firmato); Hermes e Claude Code con il token BANCA_TOKEN.
export const SESSION_COOKIE = "banca_session";

export const authEnabled = () => !!process.env.BANCA_PASSWORD;

export async function sessionValue(password: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("la-banca-linked:sessione:v1"));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
