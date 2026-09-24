"use client";

import { createItem, updateItem, useStore } from "./client-store";
import { DEFAULT_SETTINGS } from "./readiness";
import type { Settings } from "./types";

export function useSettings() {
  const saved = useStore((s) => s.settings[0]);
  return { ...DEFAULT_SETTINGS, ...saved };
}

export async function saveSettings(patch: Partial<Settings>, current: Settings | undefined) {
  if (current?.id) return updateItem("settings", current.id, patch);
  await createItem("settings", { ...DEFAULT_SETTINGS, ...patch });
}
