export type IdeaStatus = "grezza" | "in-lavorazione" | "usata" | "scartata";

export interface Idea {
  id: string;
  title: string;
  notes: string;
  pillar: string;
  tags: string[];
  status: IdeaStatus;
  createdAt: string;
  updatedAt: string;
}

export type PostStatus = "bozza" | "pronto" | "programmato" | "pubblicato";
export type PostFormat = "testo" | "immagine" | "carosello";

export interface Post {
  id: string;
  title: string;
  body: string;
  pillar: string;
  format: PostFormat;
  status: PostStatus;
  scheduledFor: string | null;
  publishedAt: string | null;
  url: string;
  ideaId: string | null;
  imageIds: string[];
  designId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImageAsset {
  id: string;
  file: string;
  name: string;
  width: number;
  height: number;
  size: number;
  tags: string[];
  source: "upload" | "editor";
  createdAt: string;
  updatedAt: string;
}

export type DesignFormat = "portrait" | "square" | "landscape";

export interface DesignElement {
  id: string;
  type: "text" | "image" | "shape";
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  color?: string;
  align?: "left" | "center" | "right";
  lineHeight?: number;
  imageId?: string;
  fit?: "cover" | "contain";
  fill?: string;
  radius?: number;
  opacity?: number;
}

export interface Slide {
  id: string;
  background: string;
  backgroundImageId: string | null;
  overlay: number;
  elements: DesignElement[];
}

export interface Design {
  id: string;
  name: string;
  kind: "statica" | "carosello";
  format: DesignFormat;
  slides: Slide[];
  createdAt: string;
  updatedAt: string;
}

export interface CollectionMap {
  ideas: Idea;
  posts: Post;
  images: ImageAsset;
  designs: Design;
}

export type CollectionName = keyof CollectionMap;
export const COLLECTIONS: CollectionName[] = ["ideas", "posts", "images", "designs"];
