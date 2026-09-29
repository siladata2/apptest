import Image from "next/image";
import Link from "next/link";
import { AlertCircle, Film, LoaderCircle, Sparkles } from "lucide-react";
import type { CatalogItem } from "@/lib/types";
import { CONTENT_LABELS, formatDuration } from "@/lib/types";

export function ContentCard({ item }: { item: CatalogItem }) {
  const art = item.poster_url || item.thumbnail_url;
  const liveNow = Boolean(item.live_details?.is_live);
  return <Link href={`/title/${item.slug}`} className="content-card" aria-label={`Open ${item.title}`}>
    <div className="poster">{art ? <Image src={art} alt={`${item.title} poster`} fill sizes="(max-width: 760px) 42vw, 190px" unoptimized /> : <div className="poster-placeholder"><span className="poster-monogram">{item.title.slice(0, 1).toUpperCase()}</span></div>}{item.type === "live" && liveNow && <span className="poster-badge">LIVE</span>}{item.is_featured && <span className="poster-badge">FEATURED</span>}</div>
    <div className="card-title">{item.title}</div><div className="card-meta">{item.release_year || CONTENT_LABELS[item.type]}{item.duration_seconds ? ` · ${formatDuration(item.duration_seconds)}` : ""}</div>
  </Link>;
}

export function EmptyState({ title, detail, icon = "film", action }: { title: string; detail: string; icon?: "film" | "sparkles" | "error"; action?: React.ReactNode }) {
  const Icon = icon === "sparkles" ? Sparkles : icon === "error" ? AlertCircle : Film;
  return <div className="empty-rail"><span className="empty-icon"><Icon size={18} /></span><div><strong>{title}</strong><p>{detail}</p>{action && <div style={{ marginTop: 10 }}>{action}</div>}</div></div>;
}

export function LoadingState({ label = "Loading catalog…" }: { label?: string }) {
  return <div className="empty-rail"><span className="empty-icon"><LoaderCircle size={18} /></span><div><strong>{label}</strong><p>Loading available titles.</p></div></div>;
}

export function CatalogStatus({ configured = true, error }: { configured?: boolean; error?: string | null }) {
  if (error) return <EmptyState title="Content temporarily unavailable" detail="Please try again shortly." icon="error" />;
  if (!configured) return <EmptyState title="No titles available right now" detail="Check back soon for new stories." icon="sparkles" />;
  return null;
}

export function SectionTitle({ title, subtitle, href }: { title: string; subtitle?: string; href?: string }) {
  return <div className="section-head"><div><h2 className="section-title">{title}</h2>{subtitle && <p className="section-subtitle">{subtitle}</p>}</div>{href && <Link className="text-link" href={href}>See all →</Link>}</div>;
}
