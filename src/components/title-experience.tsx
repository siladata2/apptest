"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Bookmark, Check, CirclePlay, Download, Heart, Share2 } from "lucide-react";
import { VideoPlayer } from "@/components/video-player";
import { ContentCard, EmptyState, SectionTitle } from "@/components/catalog-ui";
import { isInLocalWatchlist, isLocalLiked, subscribeLocalLibrary, toggleLocalLike, toggleLocalWatchlist } from "@/lib/local-library";
import { CONTENT_LABELS, formatDuration, type CatalogItem } from "@/lib/types";

export function TitleExperience({ item }: { item: CatalogItem }) {
  const sources = item.sources || [];
  const downloads = item.downloads || [];
  const [related, setRelated] = useState<CatalogItem[]>([]);
  const inWatchlist = useSyncExternalStore(subscribeLocalLibrary, () => isInLocalWatchlist(item.id), () => false);
  const liked = useSyncExternalStore(subscribeLocalLibrary, () => isLocalLiked(item.id), () => false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    void fetch(`/api/catalog?type=${encodeURIComponent(item.type)}&limit=8`, { cache: "no-store" }).then(async response => {
      if (!response.ok) return [] as CatalogItem[];
      const data = await response.json() as { items?: CatalogItem[] };
      return (data.items || []).filter(row => row.id !== item.id).slice(0, 6);
    }).then(rows => { if (alive) setRelated(rows); }).catch(() => undefined);
    return () => { alive = false; };
  }, [item.id, item.type]);

  const toggleWatchlist = () => { toggleLocalWatchlist(item); };
  const toggleLike = () => { toggleLocalLike(item.id); };
  const share = async () => {
    try { await navigator.share({ title: item.title, url: window.location.href }); }
    catch { try { await navigator.clipboard.writeText(window.location.href); setNotice("Link copied to clipboard."); } catch { setNotice("Sharing is unavailable in this browser."); } }
  };
  const download = (url: string | null) => {
    if (!url || !/^https:\/\//i.test(url)) { setNotice("This download is unavailable."); return; }
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const style = item.backdrop_url ? { backgroundImage: `linear-gradient(0deg,#09090d,rgba(9,9,13,.6)),url("${item.backdrop_url.replaceAll('"', "")}")` } : undefined;

  return <>
    <section className="detail-hero" style={style}><div className="detail-copy"><div className="eyebrow"><span className="eyebrow-dot" />{CONTENT_LABELS[item.type]}</div><h1>{item.title}</h1><div className="detail-meta">{item.release_year && <span>{item.release_year}</span>}{item.age_rating && <span className="status-pill">{item.age_rating}</span>}{item.duration_seconds && <span>{formatDuration(item.duration_seconds)}</span>}{item.language && <span>{item.language}</span>}{item.country && <span>{item.country}</span>}</div><p>{item.description || "Explore this title on SilaFlix."}</p><div className="hero-actions"><a className="button button-primary" href="#watch"><CirclePlay size={17} /> Watch free</a><button className="button button-secondary" onClick={toggleWatchlist}>{inWatchlist ? <Check size={16} /> : <Bookmark size={16} />}{inWatchlist ? "Saved on this device" : "Add to Watchlist"}</button><button className="button button-secondary" onClick={toggleLike}><Heart size={16} fill={liked ? "currentColor" : "none"} />{liked ? "Liked" : "Like"}</button><button className="icon-button" onClick={() => void share()} aria-label="Share title"><Share2 size={17} /></button></div>{notice && <p className="form-hint" role="status">{notice}</p>}</div></section>
    <section id="watch" className="player-wrap"><SectionTitle title="Watch" subtitle="Free to watch. Sources are enabled only when the owner has marked them authorized." />{sources.length ? <VideoPlayer item={item} sources={sources} subtitles={item.subtitles} /> : <EmptyState title="Stream temporarily unavailable" detail="This title does not currently have a playable source." icon="film" />}</section>
    {downloads.length > 0 && <section className="section"><SectionTitle title="Authorized downloads" subtitle="Optional files provided by the rights holder." />{downloads.map(option => <div key={option.id} className="player-options"><button className="button button-quiet" disabled={!option.url} onClick={() => download(option.url)}><Download size={15} /> Download {option.quality}{option.language ? ` · ${option.language}` : ""}{option.file_size_bytes ? ` · ${Math.round(option.file_size_bytes / 1048576)} MB` : ""}</button></div>)}</section>}
    {related.length > 0 && <section className="section"><SectionTitle title="More to explore" href={item.type === "movie" ? "/movies" : "/series"} /><div className="rail">{related.map(row => <ContentCard item={row} key={row.id} />)}</div></section>}
  </>;
}
