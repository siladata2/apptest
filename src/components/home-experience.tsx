"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CirclePlay, Info, Sparkles } from "lucide-react";
import { CatalogStatus, ContentCard, EmptyState, LoadingState, SectionTitle } from "@/components/catalog-ui";
import { getLocalHistory, getLocalWatchlist, type LocalHistoryEntry } from "@/lib/local-library";
import type { CatalogItem, ContentType } from "@/lib/types";

type RailSpec = { key: string; title: string; type: ContentType; href: string; subtitle: string };
const rails: RailSpec[] = [
  { key: "movies", title: "Latest Movies", type: "movie", href: "/movies", subtitle: "Recently published" },
  { key: "series", title: "Series", type: "series", href: "/series", subtitle: "Stories to follow" },
  { key: "episodes", title: "Latest Episodes", type: "episode", href: "/series", subtitle: "Newly published episodes" },
  { key: "reels", title: "Reels", type: "reel", href: "/reels", subtitle: "Short-form stories" },
  { key: "recaps", title: "Recaps", type: "recap", href: "/recaps", subtitle: "Catch up in a few minutes" },
  { key: "live", title: "Live Streams", type: "live", href: "/live", subtitle: "Watch live" },
];

type ApiResult = { items?: CatalogItem[]; error?: string };
export function HomeExperience() {
  const [all, setAll] = useState<CatalogItem[]>([]);
  const [history, setHistory] = useState<LocalHistoryEntry[]>([]);
  const [watchlist, setWatchlist] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const response = await fetch("/api/catalog?limit=60", { cache: "no-store" });
        if (!response.ok) throw new Error("unavailable");
        const data = await response.json() as ApiResult;
        if (!alive) return;
        setAll(Array.isArray(data.items) ? data.items : []);
        setHistory(getLocalHistory().slice(0, 8));
        setWatchlist(getLocalWatchlist().slice(0, 8));
      } catch {
        if (alive) setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const feature = all.find(item => item.is_featured) || all[0] || null;
  const heroStyle = feature?.backdrop_url ? { backgroundImage: `linear-gradient(90deg,rgba(9,9,13,.91),rgba(9,9,13,.3)),linear-gradient(0deg,#09090d,transparent 60%),url("${feature.backdrop_url.replaceAll('"', "")}")` } : undefined;
  const heroPoster = feature?.poster_url || feature?.thumbnail_url;
  return <>
    <section className="hero" style={heroStyle} aria-labelledby="hero-title"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot" />Stories from here. Stories from everywhere.</div>{feature ? <><h1 id="hero-title">{feature.title}</h1><p>{feature.description}</p><div className="hero-actions"><Link className="button button-primary" href={`/title/${feature.slug}`}><CirclePlay size={18} /> Watch free</Link><Link className="button button-secondary" href={`/title/${feature.slug}`}><Info size={16} /> Details</Link></div></> : <><h1 id="hero-title">Your next story starts here.</h1><p>Discover movies, series, short-form stories, recaps and live streams — free to watch.</p><div className="hero-actions"><Link className="button button-primary" href="/movies"><CirclePlay size={18} /> Explore movies</Link><Link className="button button-secondary" href="/series"><Sparkles size={16} /> Browse series</Link></div></>}</div>{feature && heroPoster && <div className="hero-art"><Image src={heroPoster} alt={`${feature.title} artwork`} fill sizes="(max-width: 760px) 0px, 210px" unoptimized /></div>}</section>
    <div style={{ paddingTop: 18 }}>
      {history.length > 0 && <section className="section"><SectionTitle title="Continue Watching" subtitle="Saved on this device" href="/history" /><div className="rail">{history.map(row => <Link key={row.content.id} href={`/watch/${row.content.id}`} className="content-card"><div className="poster">{row.content.poster_url || row.content.thumbnail_url ? <Image src={row.content.poster_url || row.content.thumbnail_url || ""} alt={`${row.content.title} poster`} fill sizes="(max-width: 760px) 42vw,190px" unoptimized /> : <div className="poster-placeholder"><span className="poster-monogram">{row.content.title.slice(0, 1)}</span></div>}</div><div className="card-title">{row.content.title}</div><div className="progress-track"><span style={{ width: `${Math.min(100, Math.round(100 * row.position_seconds / Math.max(1, row.duration_seconds)))}%` }} /></div></Link>)}</div></section>}
      {watchlist.length > 0 && <section className="section"><SectionTitle title="Your Watchlist" subtitle="Saved on this device" href="/watchlist" /><div className="rail">{watchlist.map(item => <ContentCard key={item.id} item={item} />)}</div></section>}
      {rails.map(rail => {
        const rows = all.filter(item => item.type === rail.type).slice(0, 12);
        return <section className="section" key={rail.key}><SectionTitle title={rail.title} subtitle={rail.subtitle} href={rail.href} />{loading ? <LoadingState /> : error ? <CatalogStatus configured error="Catalog is temporarily unavailable." /> : rows.length ? <div className="rail">{rows.map(item => <ContentCard key={item.id} item={item} />)}</div> : <EmptyState title={`No ${rail.title.toLowerCase()} available yet`} detail="Check back soon for new stories." />}</section>;
      })}
    </div>
  </>;
}
