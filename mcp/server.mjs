#!/usr/bin/env node
// Connettore MCP della banca: permette a Claude Code (e in futuro al bot) di salvare
// sessioni, post, idee e immagini passando dalla stessa API usata dall'interfaccia.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const BASE = (process.env.BANCA_URL ?? "http://localhost:3210").replace(/\/$/, "");
// Indirizzo da mettere nei link restituiti (es. quello pubblico quando BANCA_URL è 127.0.0.1 sulla VPS).
const PUBLIC = (process.env.BANCA_PUBLIC_URL ?? BASE).replace(/\/$/, "");
// Con la banca online serve il token (BANCA_TOKEN); in locale no.
const AUTH = process.env.BANCA_TOKEN ? { Authorization: `Bearer ${process.env.BANCA_TOKEN}` } : {};
const PROJECT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PILASTRI = [
  "Siti & e-commerce visti da dentro",
  "Vendere da tecnico onesto",
  "AI & automazioni pratiche",
  "Analisi & rifacimenti",
  "Dietro le quinte",
];
const FUNNEL = z.enum(["tofu-puro", "tofu-ponte", "mofu", "bofu"]);
const TIPO_IMMAGINE = z.enum(["selfie", "screen", "foto-pc", "statica", "carosello"]);
const DATA_ORA = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "formato AAAA-MM-GGTHH:mm");

async function isUp() {
  try {
    const r = await fetch(`${BASE}/api/version`, { headers: AUTH, signal: AbortSignal.timeout(3000) });
    return r.ok;
  } catch {
    return false;
  }
}

// Se la banca locale è spenta la avvia da sola, così dalla chat non serve pensarci.
let starting = null;
async function ensureUp() {
  if (await isUp()) return;
  if (!/localhost|127\.0\.0\.1/.test(BASE) || process.env.BANCA_TOKEN) throw new Error(`La banca non risponde su ${BASE}.`);
  starting ??= (async () => {
    // Su Windows npm è un .cmd: senza shell spawn fallisce con ENOENT/EINVAL.
    const child = spawn("npm", ["run", "dev"], {
      cwd: PROJECT_DIR,
      detached: true,
      stdio: "ignore",
      shell: process.platform === "win32",
      windowsHide: true,
    });
    child.unref();
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 750));
      if (await isUp()) return;
    }
    throw new Error("Non riesco ad avviare La banca Linked: aprila con 'Avvia La banca Linked' (.command su Mac, .bat su Windows).");
  })();
  try {
    await starting;
  } finally {
    starting = null;
  }
}

async function api(method, url, body) {
  await ensureUp();
  const res = await fetch(`${BASE}${url}`, {
    method,
    headers: body instanceof FormData ? AUTH : { ...AUTH, "Content-Type": "application/json" },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status} ${await res.text()}`);
  return res.json();
}

const ok = (data) => ({ content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] });
const fail = (err) => ({ isError: true, content: [{ type: "text", text: String(err instanceof Error ? err.message : err) }] });
const safe = (fn) => async (args) => {
  try {
    return await fn(args);
  } catch (err) {
    return fail(err);
  }
};

const hasVisual = (p) => (p.imageIds?.length ?? 0) > 0 || !!p.designId;
const avvisi = (p) => {
  const out = [];
  if (!hasVisual(p) && p.status !== "pubblicato") out.push("Immagine mancante");
  if (!p.body?.trim()) out.push("Testo mancante");
  return out;
};

const server = new McpServer({ name: "banca-linked", version: "1.0.0" });

server.registerTool(
  "banca_crea_sessione",
  {
    title: "Crea una sessione",
    description:
      "Apre una sessione nella banca contenuti LinkedIn: raccoglie il materiale di partenza (es. una trascrizione) e tutti i contenuti che ne nascono. Chiamalo UNA volta all'inizio del salvataggio e passa il session_id a banca_salva_post e banca_salva_idea.",
    inputSchema: {
      titolo: z.string().describe("Titolo breve e riconoscibile, es. 'Call con Rossi: il sito fermo da 4 anni'"),
      materiale: z.string().describe("Il materiale di partenza completo (trascrizione, appunti)"),
      tipo_materiale: z.string().optional().describe("es. 'trascrizione call', 'vocale', 'video'"),
      skill: z.string().optional().describe("La skill usata, es. 'post-da-trascrizione'"),
      sintesi: z.string().optional().describe("2-4 righe su cosa è emerso e cosa è stato prodotto"),
    },
  },
  safe(async ({ titolo, materiale, tipo_materiale, skill, sintesi }) => {
    const s = await api("POST", "/api/db/sessions", {
      title: titolo,
      source: materiale,
      sourceType: tipo_materiale ?? "trascrizione",
      skill: skill ?? "",
      summary: sintesi ?? "",
    });
    return ok({ session_id: s.id, url: `${PUBLIC}/sessioni/${s.id}` });
  }),
);

server.registerTool(
  "banca_aggiorna_sessione",
  {
    title: "Aggiorna una sessione",
    description: "Cambia titolo o sintesi di una sessione (es. per scrivere la sintesi finale dopo aver salvato i post).",
    inputSchema: { session_id: z.string(), titolo: z.string().optional(), sintesi: z.string().optional() },
  },
  safe(async ({ session_id, titolo, sintesi }) => {
    const patch = {};
    if (titolo !== undefined) patch.title = titolo;
    if (sintesi !== undefined) patch.summary = sintesi;
    await api("PUT", `/api/db/sessions/${session_id}`, patch);
    return ok({ aggiornata: session_id, url: `${PUBLIC}/sessioni/${session_id}` });
  }),
);

server.registerTool(
  "banca_salva_post",
  {
    title: "Salva un post",
    description:
      "Salva un post LinkedIn nella banca. Ogni post deve avere un tipo di immagine; se non gli alleghi un'immagine resta segnalato come 'Immagine mancante' (è voluto). Stato 'bozza' se va ancora rivisto, 'pronto' se è definitivo.",
    inputSchema: {
      session_id: z.string().optional().describe("Sessione da cui nasce il post"),
      titolo: z.string().describe("Titolo interno (non pubblicato), riconoscibile"),
      testo: z.string().describe("Testo completo del post, pronto da incollare su LinkedIn (max 3000 caratteri)"),
      pilastro: z.string().optional().describe(`Uno di: ${PILASTRI.join(" | ")}`),
      funnel: FUNNEL.optional().describe("tofu-puro (non parla del lavoro), tofu-ponte (ci arriva di sponda), mofu o bofu"),
      tipo_immagine: TIPO_IMMAGINE.optional().describe("selfie, screen, foto-pc (foto del PC con schermata), statica, carosello"),
      stato: z.enum(["bozza", "pronto"]).optional(),
      data_uscita: DATA_ORA.optional().describe("Se va programmato: AAAA-MM-GGTHH:mm (ora locale)"),
      idea_id: z.string().optional(),
    },
  },
  safe(async (a) => {
    if (a.testo.length > 3000) throw new Error(`Il testo supera i 3000 caratteri di LinkedIn (${a.testo.length}).`);
    const status = a.data_uscita && a.stato === "pronto" ? "programmato" : (a.stato ?? "bozza");
    const p = await api("POST", "/api/db/posts", {
      title: a.titolo,
      body: a.testo,
      pillar: a.pilastro ?? "",
      funnel: a.funnel ?? null,
      visualType: a.tipo_immagine ?? null,
      status,
      scheduledFor: a.data_uscita ?? null,
      publishedAt: null,
      url: "",
      ideaId: a.idea_id ?? null,
      imageIds: [],
      designId: null,
      sessionId: a.session_id ?? null,
    });
    return ok({ post_id: p.id, stato: p.status, avvisi: avvisi(p), url: `${PUBLIC}/contenuti/${p.id}` });
  }),
);

server.registerTool(
  "banca_aggiorna_post",
  {
    title: "Aggiorna un post",
    description: "Modifica un post esistente: testo, stato, data di uscita, funnel, tipo di immagine, pilastro.",
    inputSchema: {
      post_id: z.string(),
      titolo: z.string().optional(),
      testo: z.string().optional(),
      pilastro: z.string().optional(),
      funnel: FUNNEL.nullable().optional(),
      tipo_immagine: TIPO_IMMAGINE.nullable().optional(),
      stato: z.enum(["bozza", "pronto", "programmato", "pubblicato"]).optional(),
      data_uscita: DATA_ORA.nullable().optional(),
      link_pubblicato: z.string().optional(),
    },
  },
  safe(async (a) => {
    const map = {
      titolo: "title",
      testo: "body",
      pilastro: "pillar",
      funnel: "funnel",
      tipo_immagine: "visualType",
      stato: "status",
      data_uscita: "scheduledFor",
      link_pubblicato: "url",
    };
    const patch = {};
    for (const [k, f] of Object.entries(map)) if (a[k] !== undefined) patch[f] = a[k];
    const p = await api("PUT", `/api/db/posts/${a.post_id}`, patch);
    return ok({ post_id: p.id, stato: p.status, avvisi: avvisi(p) });
  }),
);

server.registerTool(
  "banca_salva_idea",
  {
    title: "Salva un'idea",
    description: "Salva un'idea grezza (spunto non ancora scritto come post) nella banca idee.",
    inputSchema: {
      session_id: z.string().optional(),
      titolo: z.string().describe("L'idea o il gancio in una riga"),
      appunti: z.string().optional().describe("Contesto, la storia vera, dettagli"),
      pilastro: z.string().optional().describe(`Uno di: ${PILASTRI.join(" | ")}`),
    },
  },
  safe(async (a) => {
    const i = await api("POST", "/api/db/ideas", {
      title: a.titolo,
      notes: a.appunti ?? "",
      pillar: a.pilastro ?? "",
      tags: [],
      status: "grezza",
      sessionId: a.session_id ?? null,
    });
    return ok({ idea_id: i.id });
  }),
);

server.registerTool(
  "banca_allega_immagine",
  {
    title: "Allega un'immagine a un post",
    description: "Carica un file immagine dal disco nella banca immagini e lo collega al post (toglie il segnale 'Immagine mancante').",
    inputSchema: {
      post_id: z.string(),
      percorso_file: z.string().describe("Percorso assoluto del file immagine sul computer"),
      tag: z.array(z.string()).optional(),
    },
  },
  safe(async ({ post_id, percorso_file, tag }) => {
    const buf = await readFile(percorso_file);
    const form = new FormData();
    form.append("files", new Blob([buf]), path.basename(percorso_file));
    if (tag?.length) form.append("tags", tag.join(","));
    const [img] = await api("POST", "/api/images/upload", form);
    if (!img) throw new Error("Formato immagine non supportato.");
    const post = await api("GET", `/api/db/posts/${post_id}`);
    await api("PUT", `/api/db/posts/${post_id}`, { imageIds: [...(post.imageIds ?? []), img.id] });
    return ok({ immagine_id: img.id, post_id });
  }),
);

server.registerTool(
  "banca_prossima_settimana",
  {
    title: "Stato della prossima settimana",
    description:
      "Dice se la prossima settimana è coperta (minimo 3 post), quali post sono programmati e cosa gli manca (immagine, testo), gli slot liberi, la lista delle cose da fare e i post in banca senza data.",
    inputSchema: {},
  },
  safe(async () => ok(await api("GET", "/api/report"))),
);

server.registerTool(
  "banca_cerca_post",
  {
    title: "Cerca post",
    description: "Cerca tra i post della banca per testo e/o stato.",
    inputSchema: {
      testo: z.string().optional(),
      stato: z.enum(["bozza", "pronto", "programmato", "pubblicato"]).optional(),
      limite: z.number().int().min(1).max(100).optional(),
    },
  },
  safe(async ({ testo, stato, limite }) => {
    const q = testo?.toLowerCase();
    const posts = (await api("GET", "/api/db/posts"))
      .filter((p) => (!stato || p.status === stato) && (!q || `${p.title} ${p.body}`.toLowerCase().includes(q)))
      .slice(0, limite ?? 20)
      .map((p) => ({
        id: p.id,
        titolo: p.title,
        stato: p.status,
        uscita: p.scheduledFor,
        funnel: p.funnel ?? null,
        tipo_immagine: p.visualType ?? null,
        avvisi: avvisi(p),
        inizio: p.body.slice(0, 160),
      }));
    return ok(posts);
  }),
);

server.registerTool(
  "banca_elenca_sessioni",
  {
    title: "Elenca le sessioni",
    description: "Le ultime sessioni salvate in banca, con quanti post e idee hanno prodotto.",
    inputSchema: { limite: z.number().int().min(1).max(50).optional() },
  },
  safe(async ({ limite }) => {
    const [sessions, posts, ideas] = await Promise.all([
      api("GET", "/api/db/sessions"),
      api("GET", "/api/db/posts"),
      api("GET", "/api/db/ideas"),
    ]);
    return ok(
      sessions.slice(0, limite ?? 10).map((s) => ({
        id: s.id,
        titolo: s.title,
        data: s.createdAt,
        post: posts.filter((p) => p.sessionId === s.id).length,
        idee: ideas.filter((i) => i.sessionId === s.id).length,
        url: `${PUBLIC}/sessioni/${s.id}`,
      })),
    );
  }),
);

await server.connect(new StdioServerTransport());
