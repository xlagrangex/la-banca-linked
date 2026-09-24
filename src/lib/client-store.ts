"use client";

import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import type { CollectionMap, CollectionName, ImageAsset } from "./types";

type Data = { [K in CollectionName]: CollectionMap[K][] };

interface State extends Data {
  loaded: boolean;
  pending: number;
  dirty: number;
  lastSaved: number | null;
  error: string | null;
}

let state: State = {
  ideas: [],
  posts: [],
  images: [],
  designs: [],
  todos: [],
  settings: [],
  sessions: [],
  loaded: false,
  pending: 0,
  dirty: 0,
  lastSaved: null,
  error: null,
};

const listeners = new Set<() => void>();
const setState = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => selector(state),
    () => selector(state),
  );
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  lastLocalChange = Date.now();
  setState({ pending: state.pending + 1 });
  try {
    const res = await fetch(url, {
      ...init,
      headers: init?.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    setState({ lastSaved: Date.now(), error: null });
    return (await res.json()) as T;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setState({ error: message });
    toast.error("Salvataggio non riuscito", { description: message });
    throw err;
  } finally {
    setState({ pending: state.pending - 1 });
  }
}

let loading: Promise<void> | null = null;
let lastLocalChange = 0;
let knownVersion = 0;

async function fetchAll() {
  const names: CollectionName[] = ["ideas", "posts", "images", "designs", "todos", "settings", "sessions"];
  const results = await Promise.all(names.map((n) => fetch(`/api/db/${n}`).then((r) => r.json())));
  const patch: Partial<State> = { loaded: true };
  names.forEach((n, i) => ((patch as Record<string, unknown>)[n] = results[i]));
  return patch;
}

export function loadAll() {
  loading ??= (async () => {
    knownVersion = (await fetch("/api/version").then((r) => r.json())).version;
    setState(await fetchAll());
  })();
  return loading;
}

// Se qualcun altro (Claude Code, il bot) ha scritto nei file, ricarica, ma mai sopra
// una modifica locale in corso o appena fatta.
export async function syncIfChanged() {
  if (!state.loaded || state.pending > 0 || state.dirty > 0 || Date.now() - lastLocalChange < 3000) return;
  const { version } = await fetch("/api/version").then((r) => r.json());
  if (version <= knownVersion) return;
  const startedAt = Date.now();
  const patch = await fetchAll();
  if (lastLocalChange >= startedAt || state.pending > 0 || state.dirty > 0) return;
  knownVersion = version;
  setState(patch);
}

function replaceLocal<K extends CollectionName>(name: K, items: CollectionMap[K][]) {
  setState({ [name]: items } as Partial<State>);
}

export async function createItem<K extends CollectionName>(name: K, data: Partial<CollectionMap[K]>) {
  const item = await request<CollectionMap[K]>(`/api/db/${name}`, { method: "POST", body: JSON.stringify(data) });
  replaceLocal(name, [item, ...(state[name] as CollectionMap[K][])]);
  return item;
}

// Le modifiche arrivano subito in UI; il PUT parte dopo una breve pausa, fondendo le modifiche ravvicinate.
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const queued = new Map<string, { name: CollectionName; id: string; patch: Record<string, unknown> }>();

function flushOne(key: string) {
  const job = queued.get(key);
  clearTimeout(timers.get(key));
  timers.delete(key);
  queued.delete(key);
  setState({ dirty: queued.size });
  if (!job) return Promise.resolve();
  return request(`/api/db/${job.name}/${job.id}`, { method: "PUT", body: JSON.stringify(job.patch) }).catch(() => {});
}

export function flushAll() {
  return Promise.all([...queued.keys()].map(flushOne));
}

export function updateItem<K extends CollectionName>(
  name: K,
  id: string,
  patch: Partial<CollectionMap[K]>,
  delay = 0,
) {
  const now = new Date().toISOString();
  lastLocalChange = Date.now();
  replaceLocal(
    name,
    (state[name] as CollectionMap[K][]).map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now } : x)),
  );
  const key = `${name}:${id}`;
  const prev = queued.get(key);
  queued.set(key, { name, id, patch: { ...(prev?.patch ?? {}), ...patch } });
  clearTimeout(timers.get(key));
  if (delay === 0) return flushOne(key);
  setState({ dirty: queued.size });
  timers.set(key, setTimeout(() => flushOne(key), delay));
  return Promise.resolve();
}

export function hasQueued() {
  return queued.size > 0;
}

export async function deleteItem<K extends CollectionName>(name: K, id: string) {
  await flushOne(`${name}:${id}`);
  await request(`/api/db/${name}/${id}`, { method: "DELETE" });
  replaceLocal(name, (state[name] as CollectionMap[K][]).filter((x) => x.id !== id));
}

export async function uploadImages(files: File[] | Blob[], opts: { source?: "upload" | "editor"; names?: string[] } = {}) {
  const form = new FormData();
  files.forEach((f, i) => {
    const name = opts.names?.[i] ?? (f instanceof File ? f.name : `grafica-${Date.now()}-${i}.png`);
    form.append("files", f, name);
  });
  form.append("source", opts.source ?? "upload");
  const created = await request<ImageAsset[]>("/api/images/upload", { method: "POST", body: form });
  replaceLocal("images", [...created, ...state.images]);
  return created;
}

export async function reloadAll() {
  loading = null;
  await loadAll();
}

export const imageUrl = (img: Pick<ImageAsset, "file"> | undefined | null) =>
  img ? `/api/images/file/${img.file}` : "";
