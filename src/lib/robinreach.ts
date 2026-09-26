import "server-only";
import { createHash } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// La banca parla con RobinReach attraverso il suo server MCP, lo stesso che usa Claude Code:
// una sola chiave (ROBINREACH_API_KEY), nessuna integrazione da mantenere a parte.
const ENDPOINT = "https://robinreach.com/mcp/v1/messages";

export const robinreachConfigured = () => !!process.env.ROBINREACH_API_KEY;

async function withClient<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const key = process.env.ROBINREACH_API_KEY;
  if (!key) throw new Error("RobinReach non configurato: manca ROBINREACH_API_KEY.");
  const client = new Client({ name: "la-banca-linked", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${ENDPOINT}?api_key=${encodeURIComponent(key)}`)));
  try {
    return await fn(client);
  } finally {
    await client.close().catch(() => {});
  }
}

async function call<T = Record<string, unknown>>(c: Client, name: string, args: Record<string, unknown>): Promise<T> {
  const res = (await c.callTool({ name, arguments: args })) as { isError?: boolean; content?: { type: string; text?: string }[] };
  const text = res.content?.find((x) => x.type === "text")?.text ?? "";
  if (res.isError) throw new Error(text || `RobinReach: ${name} non riuscito`);
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    return { message: text } as T;
  }
  // Alcuni errori arrivano come risposta "riuscita" con dentro error o status: "error".
  if (data.error || (data.status === "error" && !Array.isArray(data.errors))) throw new Error(String(data.message ?? data.error));
  return data as T;
}

export type RRProfile = { id: number; name: string; platform: string };

export async function linkedinProfile(c: Client): Promise<RRProfile> {
  const wanted = Number(process.env.ROBINREACH_PROFILE_ID) || null;
  const { social_profiles } = await call<{ social_profiles: RRProfile[] }>(c, "account_profiles", {});
  const p = social_profiles.find((x) => (wanted ? x.id === wanted : x.platform === "linkedin"));
  if (!p) throw new Error("Nessun profilo LinkedIn collegato a RobinReach.");
  return p;
}

export const getProfile = () => withClient(linkedinProfile);

async function uploadMedia(c: Client, file: { bytes: Buffer; type: string; name: string }) {
  const checksum = createHash("md5").update(file.bytes).digest("base64");
  const up = await call<{ upload_url: string; signed_id: string; upload_headers?: Record<string, string> }>(c, "media_direct_upload_create", {
    content_type: file.type,
    byte_size: file.bytes.length,
    checksum,
    media_name: file.name,
  });
  const put = await fetch(up.upload_url, {
    method: "PUT",
    headers: up.upload_headers ?? { "Content-Type": file.type, "Content-MD5": checksum },
    body: new Uint8Array(file.bytes),
  });
  if (!put.ok) throw new Error(`Caricamento immagine su RobinReach non riuscito (${put.status})`);
  const done = await call<{ url?: string; media_url?: string }>(c, "media_direct_upload_finalize", { signed_id: up.signed_id, folder_name: "La banca Linked" });
  const url = done.url ?? done.media_url;
  if (!url) throw new Error("RobinReach non ha restituito l'indirizzo dell'immagine.");
  return url;
}

function problems(v: Record<string, unknown>): string[] {
  const errs = (v.errors ?? v.validation_errors) as unknown;
  if (Array.isArray(errs)) return errs.map((e) => (typeof e === "string" ? e : JSON.stringify(e)));
  if (v.valid === false || v.status === "error") return [String(v.message ?? "Post non valido per RobinReach")];
  return [];
}

export type ScheduleInput = {
  existingId?: number | null;
  content: string;
  publishTime: string;
  media: { bytes: Buffer; type: string; name: string }[];
  carousel: boolean;
  label: string;
};

export async function schedulePost(input: ScheduleInput): Promise<{ id: number; publishTime: string }> {
  return withClient(async (c) => {
    const profile = await linkedinProfile(c);
    const media_urls: string[] = [];
    for (const m of input.media) media_urls.push(await uploadMedia(c, m));
    const payload = {
      social_profile_ids: [profile.id],
      content: input.content,
      post_status: "scheduled",
      publish_time: input.publishTime,
      timezone: "Europe/Rome",
      ...(media_urls.length ? { media_urls } : {}),
      ...(input.carousel && media_urls.length > 1 ? { platform_options: { linkedin: { carousal: "1" } } } : {}),
    };
    const v = await call(c, "posts_validate", input.existingId ? { ...payload, post_id: input.existingId } : payload);
    const errs = problems(v);
    if (errs.length) throw new Error(errs.join(" · "));

    if (input.existingId) {
      await call(c, "posts_update", { ...payload, post_id: input.existingId, replace_media: true, labels: [input.label] });
      return { id: input.existingId, publishTime: input.publishTime };
    }
    const created = await call<Record<string, unknown>>(c, "posts_create", { ...payload, labels: [input.label] });
    const id = findId(created) ?? (await findScheduled(c, input.content));
    if (!id) throw new Error("Il post è stato creato su RobinReach ma non ho ricevuto il suo id: controlla lì prima di rimandarlo.");
    return { id, publishTime: input.publishTime };
  });
}

function findId(o: Record<string, unknown>): number | null {
  for (const k of ["id", "post_id"]) if (typeof o[k] === "number") return o[k] as number;
  for (const k of ["post", "data", "result"]) {
    const v = o[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const id = findId(v as Record<string, unknown>);
      if (id) return id;
    }
  }
  return null;
}

async function findScheduled(c: Client, content: string): Promise<number | null> {
  const head = content.slice(0, 80);
  for (let page = 1; page <= 3; page++) {
    const res = await call<Record<string, unknown>>(c, "posts_list", { status: "scheduled", page });
    const items = (res.posts ?? res.data ?? []) as Record<string, unknown>[];
    const hit = items.find((p) => String(p.content ?? p.text ?? "").startsWith(head));
    if (hit) return findId(hit);
    if (items.length < 10) break;
  }
  return null;
}

export const reschedulePost = (id: number, publishTime: string) =>
  withClient((c) => call(c, "posts_reschedule", { post_id: id, new_publish_time: publishTime }));

export type RRStatus = { status: "scheduled" | "published" | "failed" | "draft" | "unknown"; url?: string; error?: string };

export async function postStatuses(ids: number[]): Promise<Record<number, RRStatus>> {
  return withClient(async (c) => {
    const out: Record<number, RRStatus> = {};
    for (const id of ids) {
      try {
        const s = await call<Record<string, unknown>>(c, "posts_get_status", { post_id: id });
        out[id] = normalizeStatus(s);
      } catch (err) {
        out[id] = { status: "unknown", error: String(err instanceof Error ? err.message : err) };
      }
    }
    return out;
  });
}

// La risposta di posts_get_status non è documentata in dettaglio: si cerca lo stato
// della piattaforma LinkedIn e, se manca, quello generale del post.
function normalizeStatus(s: Record<string, unknown>): RRStatus {
  const platforms = (s.platforms ?? s.platform_statuses ?? s.social_profiles ?? []) as Record<string, unknown>[];
  const li = Array.isArray(platforms) ? platforms.find((p) => String(p.platform ?? p.name ?? "").toLowerCase().includes("linkedin")) : undefined;
  const raw = String((li?.status ?? s.status ?? s.post_status ?? "unknown") as string).toLowerCase();
  const url = (li?.post_url ?? li?.url ?? li?.permalink ?? s.post_url ?? s.url) as string | undefined;
  const error = (li?.error ?? li?.error_message ?? s.error) as string | undefined;
  const status: RRStatus["status"] = /publish|success|posted|sent/.test(raw)
    ? "published"
    : /fail|error/.test(raw)
      ? "failed"
      : /draft/.test(raw)
        ? "draft"
        : /schedul|pending|queue/.test(raw)
          ? "scheduled"
          : "unknown";
  return { status, url: url || undefined, error: error || undefined };
}
