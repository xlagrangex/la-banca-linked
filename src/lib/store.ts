import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { CollectionMap, CollectionName } from "./types";

export const DATA_DIR = process.env.BANCA_DATA_DIR ?? path.join(process.cwd(), "data");
export const IMAGES_DIR = path.join(DATA_DIR, "images");
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const TRASH_FILE = path.join(DATA_DIR, "cestino.json");
const BACKUP_EVERY_MS = 5 * 60_000;
const BACKUP_KEEP_DAYS = 60;

// Next carica ogni route API come modulo separato: coda e stato vanno su globalThis,
// e i dati si rileggono sempre dal disco, così nessuna route scrive su una copia vecchia.
const g = globalThis as unknown as { __bancaQueue?: Promise<unknown>; __bancaBackup?: Map<string, number> };
g.__bancaQueue ??= Promise.resolve();
g.__bancaBackup ??= new Map();
const lastBackup = g.__bancaBackup;

function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = g.__bancaQueue!.then(fn, fn);
  g.__bancaQueue = run.catch(() => undefined);
  return run;
}

async function ensureDirs() {
  await fs.mkdir(IMAGES_DIR, { recursive: true });
  await fs.mkdir(BACKUP_DIR, { recursive: true });
}

const fileOf = (name: string) => path.join(DATA_DIR, `${name}.json`);

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw err;
  }
}

async function writeAtomic(file: string, data: unknown) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  const handle = await fs.open(tmp, "w");
  try {
    await handle.writeFile(JSON.stringify(data, null, 2));
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.rename(tmp, file);
}

async function backup(name: string) {
  const now = Date.now();
  if (now - (lastBackup.get(name) ?? 0) < BACKUP_EVERY_MS) return;
  const src = fileOf(name);
  try {
    await fs.access(src);
  } catch {
    return;
  }
  const d = new Date();
  const day = d.toISOString().slice(0, 10);
  const time = d.toTimeString().slice(0, 8).replace(/:/g, "");
  const dir = path.join(BACKUP_DIR, day);
  await fs.mkdir(dir, { recursive: true });
  await fs.copyFile(src, path.join(dir, `${time}-${name}.json`));
  lastBackup.set(name, now);
  await pruneBackups();
}

async function pruneBackups() {
  const cutoff = new Date(Date.now() - BACKUP_KEEP_DAYS * 86_400_000).toISOString().slice(0, 10);
  for (const day of await fs.readdir(BACKUP_DIR)) {
    if (day < cutoff) await fs.rm(path.join(BACKUP_DIR, day), { recursive: true, force: true });
  }
}

export async function list<K extends CollectionName>(name: K): Promise<CollectionMap[K][]> {
  await ensureDirs();
  return readJson<CollectionMap[K][]>(fileOf(name), []);
}

async function persist(name: CollectionName, items: unknown[]) {
  await ensureDirs();
  await backup(name);
  await writeAtomic(fileOf(name), items);
}

export async function get<K extends CollectionName>(name: K, id: string) {
  return (await list(name)).find((x) => x.id === id) ?? null;
}

export function create<K extends CollectionName>(name: K, data: Partial<CollectionMap[K]>) {
  return serial(async () => {
    const items = [...(await list(name))];
    const now = new Date().toISOString();
    const item = { ...data, id: data.id ?? randomUUID(), createdAt: now, updatedAt: now } as CollectionMap[K];
    items.unshift(item);
    await persist(name, items);
    return item;
  });
}

export function update<K extends CollectionName>(name: K, id: string, patch: Partial<CollectionMap[K]>) {
  return serial(async () => {
    const items = [...(await list(name))];
    const i = items.findIndex((x) => x.id === id);
    if (i === -1) return null;
    const item = { ...items[i], ...patch, id, updatedAt: new Date().toISOString() } as CollectionMap[K];
    items[i] = item;
    await persist(name, items);
    return item;
  });
}

export function remove<K extends CollectionName>(name: K, id: string) {
  return serial(async () => {
    const items = [...(await list(name))];
    const item = items.find((x) => x.id === id);
    if (!item) return false;
    // Nessuna cancellazione definitiva: l'elemento finisce nel cestino, recuperabile.
    const trash = await readJson<unknown[]>(TRASH_FILE, []);
    trash.unshift({ collection: name, deletedAt: new Date().toISOString(), item });
    await writeAtomic(TRASH_FILE, trash);
    await persist(name, items.filter((x) => x.id !== id));
    return true;
  });
}

export async function listTrash() {
  return readJson<{ collection: CollectionName; deletedAt: string; item: { id: string } }[]>(TRASH_FILE, []);
}

export function restore(id: string) {
  return serial(async () => {
    const trash = await listTrash();
    const entry = trash.find((t) => t.item.id === id);
    if (!entry) return false;
    const items = [...(await list(entry.collection))] as unknown[];
    items.unshift(entry.item);
    await persist(entry.collection, items);
    await writeAtomic(TRASH_FILE, trash.filter((t) => t !== entry));
    return true;
  });
}

export async function listBackups() {
  await ensureDirs();
  const days = (await fs.readdir(BACKUP_DIR)).sort().reverse();
  const out: { day: string; files: string[] }[] = [];
  for (const day of days) out.push({ day, files: (await fs.readdir(path.join(BACKUP_DIR, day))).sort().reverse() });
  return out;
}

export async function snapshotAll() {
  const result: Record<string, unknown> = { exportedAt: new Date().toISOString() };
  for (const name of ["ideas", "posts", "images", "designs"] as CollectionName[]) result[name] = await list(name);
  return result;
}
