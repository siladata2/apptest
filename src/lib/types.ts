export type ContentType = "movie" | "series" | "episode" | "reel" | "recap" | "live";
export type ContentStatus = "draft" | "in_review" | "published" | "unpublished" | "archived";
export type Quality = "360p" | "480p" | "720p" | "1080p" | "4k" | "adaptive";

export type StreamSource = {
  id: string;
  content_id: string;
  source_type: "mp4" | "hls" | "dash" | "youtube" | "embed" | "storage";
  stream_url: string | null;
  storage_path: string | null;
  quality: Quality;
  language: string | null;
  is_active: boolean;
  distribution_authorized: boolean;
};

export type DownloadOption = {
  id: string;
  url: string | null;
  quality: Quality;
  language: string | null;
  file_size_bytes: number | null;
  enabled: boolean;
  distribution_authorized: boolean;
};

export type SubtitleTrack = {
  id: string;
  language: string;
  label: string;
  subtitle_url: string | null;
  storage_path: string | null;
  is_default: boolean;
};

export type CatalogItem = {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  description: string;
  poster_url: string | null;
  backdrop_url: string | null;
  thumbnail_url: string | null;
  release_year: number | null;
  language: string | null;
  country: string | null;
  age_rating: string | null;
  duration_seconds: number | null;
  status: ContentStatus;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
  categories: string[];
  sources?: StreamSource[];
  downloads?: DownloadOption[];
  subtitles?: SubtitleTrack[];
  live_details?: { is_live: boolean; starts_at?: string | null; ends_at?: string | null; logo_url?: string | null } | null;
};

export const CONTENT_LABELS: Record<ContentType, string> = {
  movie: "Movies",
  series: "Series",
  episode: "Episodes",
  reel: "Reels",
  recap: "Recaps",
  live: "Live",
};

export function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds < 0) return "";
  const mins = Math.floor(seconds / 60);
  const hours = Math.floor(mins / 60);
  return hours ? `${hours}h ${mins % 60}m` : `${mins}m`;
}
