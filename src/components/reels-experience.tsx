"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bookmark, Check, Download, Heart, Share2, Volume2, VolumeX } from "lucide-react";
import { VideoPlayer } from "@/components/video-player";
import { EmptyState, LoadingState } from "@/components/catalog-ui";
import { isInLocalWatchlist, toggleLocalWatchlist } from "@/lib/local-library";
import type { CatalogItem } from "@/lib/types";

export function ReelsExperience() {
  const [reels, setReels] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [muted, setMuted] = useState(true);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const response = await fetch("/api/catalog?type=reel&limit=30", { cache: "no-store" });
        if (!response.ok) throw new Error("unavailable");
        const data = await response.json() as { items?: CatalogItem[] };
        if (!alive) return;
        const items = data.items || [];
        setReels(items);
        setSavedIds(items.filter(item => isInLocalWatchlist(item.id)).map(item => item.id));
        setLikedIds(items.filter(item => { try { return window.localStorage.getItem(`silaflix_like_${item.id}`) === "1"; } catch { return false; } }).map(item => item.id));
      } catch { if (alive) setError(true); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const toggleSave = (item: CatalogItem) => {
    const saved = toggleLocalWatchlist(item);
    setSavedIds(current => saved ? [...new Set([...current, item.id])] : current.filter(id => id !== item.id));
  };
  const toggleLike = (item: CatalogItem) => {
    const liked = !likedIds.includes(item.id);
    setLikedIds(current => liked ? [...current, item.id] : current.filter(id => id !== item.id));
    try { window.localStorage.setItem(`silaflix_like_${item.id}`, liked ? "1" : "0"); } catch { /* Storage may be disabled. */ }
  };
  const share = async (item: CatalogItem) => {
    const url = `${window.location.origin}/title/${item.slug}`;
    try { await navigator.share({ title: item.title, url }); }
    catch { try { await navigator.clipboard.writeText(url); setMessage("Link copied."); } catch { setMessage("Sharing is unavailable in this browser."); } }
  };
  const download = (item: CatalogItem, url: string | null) => {
    if (url && /^https:\/\//i.test(url)) window.open(url, "_blank", "noopener,noreferrer");
    else setMessage(`No authorized download is available for ${item.title}.`);
  };

  if (loading) return <div className="page-heading"><h1>Reels</h1><LoadingState label="Loading reels…" /></div>;
  if (error) return <div className="page-heading"><h1>Reels</h1><EmptyState title="Reels temporarily unavailable" detail="Please try again shortly." icon="error" /></div>;
  if (!reels.length) return <div className="page-heading"><h1>Reels</h1><EmptyState title="No reels available yet" detail="Short-form stories will appear here soon." action={<Link href="/movies" className="text-link">Explore SilaFlix →</Link>} /></div>;
  return <div className="reel-feed" aria-label="Vertical reels feed">{reels.map(item => <article key={item.id} className="reel-item"><div className="reel-video">{item.sources?.length ? <VideoPlayer item={item} sources={item.sources} compact autoplay deferOffscreen muted={muted} /> : <div className="player-error"><div><strong>Reel unavailable</strong><p>This video source is not available right now.</p></div></div>}<div className="reel-overlay"><span className="eyebrow"><span className="eyebrow-dot" />SilaFlix Reel</span><h2 style={{ fontSize: 18, margin: "8px 0 5px" }}>{item.title}</h2><p style={{ fontSize: 11, color: "#dedbe0", margin: 0 }}>{item.description}</p><Link className="text-link" href={`/title/${item.slug}`}>Open title →</Link></div><div className="reel-actions"><button className="reel-action" aria-label={muted ? "Unmute reel" : "Mute reel"} onClick={() => setMuted(value => !value)}><span>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</span>{muted ? "Unmute" : "Mute"}</button><button className="reel-action" aria-label="Like reel" onClick={() => toggleLike(item)}><span><Heart size={19} fill={likedIds.includes(item.id) ? "#ff725d" : "none"} color={likedIds.includes(item.id) ? "#ff725d" : "white"} /></span>Like</button><button className="reel-action" aria-label="Save reel" onClick={() => toggleSave(item)}><span>{savedIds.includes(item.id) ? <Check size={18} /> : <Bookmark size={18} />}</span>Save</button><button className="reel-action" aria-label="Share reel" onClick={() => void share(item)}><span><Share2 size={18} /></span>Share</button>{(item.downloads || []).map(option => <button key={option.id} className="reel-action" aria-label={`Download ${option.quality}`} onClick={() => download(item, option.url)}><span><Download size={18} /></span>Download</button>)}</div></div></article>)}{message && <div className="toast" role="status">{message}</div>}</div>;
}
