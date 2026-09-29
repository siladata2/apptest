import "server-only";
import { ObjectId, type Document } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";
import type { CatalogItem, StreamSource, DownloadOption, SubtitleTrack } from "@/lib/types";

function mapSource(value: Document, contentId: string): StreamSource {
  return {
    id: String(value._id || value.id || new ObjectId()),
    content_id: contentId,
    source_type: value.source_type,
    stream_url: value.stream_url || null,
    storage_path: value.storage_path || null,
    quality: value.quality || "adaptive",
    language: value.language || null,
    is_active: Boolean(value.is_active),
    distribution_authorized: Boolean(value.distribution_authorized),
  } as StreamSource;
}

export function mapCatalogDocument(doc: Document, includePrivate = false): CatalogItem {
  const id = String(doc._id);
  const sourceDocs = Array.isArray(doc.sources) ? doc.sources as Document[] : [];
  const downloadDocs = Array.isArray(doc.downloads) ? doc.downloads as Document[] : [];
  const subtitleDocs = Array.isArray(doc.subtitles) ? doc.subtitles as Document[] : [];
  const sources = sourceDocs
    .filter(source => includePrivate || (source.is_active === true && source.distribution_authorized === true))
    .map(source => mapSource(source, id));
  const downloads = downloadDocs
    .filter(option => includePrivate || (option.enabled === true && option.distribution_authorized === true))
    .map(option => ({
      id: String(option._id || option.id || new ObjectId()),
      url: option.url || null,
      quality: option.quality || "adaptive",
      language: option.language || null,
      file_size_bytes: option.file_size_bytes || null,
      enabled: Boolean(option.enabled),
      distribution_authorized: Boolean(option.distribution_authorized),
    } as DownloadOption));
  const subtitles = subtitleDocs.map(track => ({
    id: String(track._id || track.id || new ObjectId()),
    language: track.language || "und",
    label: track.label || track.language || "Subtitles",
    subtitle_url: track.subtitle_url || null,
    storage_path: track.storage_path || null,
    is_default: Boolean(track.is_default),
  } as SubtitleTrack));
  const live = doc.live_details && typeof doc.live_details === "object" ? doc.live_details as Document : null;
  return {
    id,
    type: doc.type,
    title: doc.title,
    slug: doc.slug,
    description: doc.description || "",
    poster_url: doc.poster_url || null,
    backdrop_url: doc.backdrop_url || null,
    thumbnail_url: doc.thumbnail_url || null,
    release_year: typeof doc.release_year === "number" ? doc.release_year : null,
    language: doc.language || null,
    country: doc.country || null,
    age_rating: doc.age_rating || null,
    duration_seconds: typeof doc.duration_seconds === "number" ? doc.duration_seconds : null,
    status: doc.status,
    is_featured: Boolean(doc.is_featured),
    published_at: doc.published_at ? new Date(doc.published_at).toISOString() : null,
    created_at: doc.created_at ? new Date(doc.created_at).toISOString() : new Date().toISOString(),
    categories: Array.isArray(doc.categories) ? doc.categories.filter((v: unknown): v is string => typeof v === "string") : [],
    sources,
    downloads,
    subtitles,
    live_details: live ? {
      is_live: Boolean(live.is_live),
      starts_at: live.starts_at ? new Date(live.starts_at).toISOString() : null,
      ends_at: live.ends_at ? new Date(live.ends_at).toISOString() : null,
      logo_url: live.logo_url || null,
    } : null,
  };
}

export type PublicCatalogQuery = {
  type?: string;
  q?: string;
  category?: string;
  year?: number;
  limit?: number;
  skip?: number;
  featured?: boolean;
};

export async function queryPublicCatalog(options: PublicCatalogQuery = {}): Promise<{ items: CatalogItem[]; total: number }> {
  const db = await getMongoDb();
  const filter: Document = { status: "published" };
  if (options.type && ["movie", "series", "episode", "reel", "recap", "live"].includes(options.type)) filter.type = options.type;
  if (options.featured) filter.is_featured = true;
  if (options.year) filter.release_year = options.year;
  if (options.category) filter.categories = options.category;
  if (options.q?.trim()) {
    const escaped = options.q.trim().slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ title: { $regex: escaped, $options: "i" } }, { description: { $regex: escaped, $options: "i" } }];
  }
  const limit = Math.min(Math.max(options.limit || 24, 1), 60);
  const skip = Math.max(options.skip || 0, 0);
  const collection = db.collection("content");
  const [docs, total] = await Promise.all([
    collection.find(filter).sort({ is_featured: -1, published_at: -1, created_at: -1 }).skip(skip).limit(limit).toArray(),
    collection.countDocuments(filter),
  ]);
  return { items: docs.map(doc => mapCatalogDocument(doc)), total };
}

export async function getPublicContentBySlugOrId(value: string): Promise<CatalogItem | null> {
  const db = await getMongoDb();
  const filter: Document = { status: "published", $or: [{ slug: value }] };
  if (ObjectId.isValid(value)) (filter.$or as Document[]).push({ _id: new ObjectId(value) });
  const doc = await db.collection("content").findOne(filter);
  return doc ? mapCatalogDocument(doc) : null;
}

export async function getAdminContentById(id: string): Promise<Document | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getMongoDb();
  return db.collection("content").findOne({ _id: new ObjectId(id) });
}

export function createContentSlug(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
}

export function isSafeHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function guessSourceType(value: string): StreamSource["source_type"] {
  const url = new URL(value);
  const path = url.pathname.toLowerCase();
  if (/\.m3u8?$/.test(path)) return "hls";
  if (/\.mpd$/.test(path)) return "dash";
  if (/\.mp4$|\.webm$|\.mov$/.test(path)) return "mp4";
  if (url.hostname === "youtu.be" || url.hostname.endsWith("youtube.com")) return "youtube";
  if (url.hostname === "drive.google.com" && /\/file\/d\//.test(path)) return "embed";
  return "embed";
}

export function googleDrivePreviewUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.hostname !== "drive.google.com") return null;
    const id = url.pathname.match(/\/file\/d\/([A-Za-z0-9_-]+)/)?.[1];
    return id ? `https://drive.google.com/file/d/${id}/preview` : null;
  } catch {
    return null;
  }
}
