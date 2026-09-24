import type { Post } from "./types";

export const emptyPost = (patch: Partial<Post> = {}): Partial<Post> => ({
  title: "",
  body: "",
  pillar: "",
  format: "testo",
  status: "bozza",
  scheduledFor: null,
  publishedAt: null,
  url: "",
  ideaId: null,
  imageIds: [],
  designId: null,
  ...patch,
});

export function withoutMeta<T extends { id: string; createdAt: string; updatedAt: string }>(item: T) {
  const copy: Partial<T> = { ...item };
  delete copy.id;
  delete copy.createdAt;
  delete copy.updatedAt;
  return copy;
}
