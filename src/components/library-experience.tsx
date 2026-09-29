"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CirclePlay, History, Trash2 } from "lucide-react";
import { ContentCard, EmptyState } from "@/components/catalog-ui";
import { getLocalHistory, getLocalWatchlist, removeLocalWatchlistItem, type LocalHistoryEntry } from "@/lib/local-library";
import type { CatalogItem } from "@/lib/types";

type Mode = "watchlist" | "history" | "downloads";
export function LibraryExperience({ mode }: { mode: Mode }) {
  const [watchlist, setWatchlist] = useState<CatalogItem[]>([]);
  const [history, setHistory] = useState<LocalHistoryEntry[]>([]);
  useEffect(() => {
    const timer = window.setTimeout(() => { setWatchlist(getLocalWatchlist()); setHistory(getLocalHistory()); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const headings: Record<Mode, [string, string]> = {
    watchlist: ["Your Watchlist", "Saved privately on this device."],
    history: ["Continue Watching", "Playback progress saved on this device."],
    downloads: ["Downloads", "Authorized download options appear on each title page."],
  };
  const [heading, subtitle] = headings[mode];
  if (mode === "downloads") return <><div className="page-heading"><h1>{heading}</h1><p>{subtitle}</p></div><div style={{ padding: "0 20px 30px" }}><EmptyState title="Choose a title to view downloads" detail="When the rights holder enables an authorized download, it will appear on that title's page." action={<Link href="/movies" className="text-link">Browse titles →</Link>} /></div></>;
  if (mode === "watchlist") return <><div className="page-heading"><h1>{heading}</h1><p>{subtitle}</p></div>{watchlist.length ? <div className="content-grid">{watchlist.map(item => <div key={item.id} style={{ position: "relative" }}><ContentCard item={item} /><button className="icon-button" aria-label={`Remove ${item.title} from watchlist`} onClick={() => { removeLocalWatchlistItem(item.id); setWatchlist(getLocalWatchlist()); }} style={{ position: "absolute", top: 5, right: 5, background: "rgba(0,0,0,.7)" }}><Trash2 size={15} /></button></div>)}</div> : <div style={{ padding: "0 20px 30px" }}><EmptyState title="Your watchlist is empty" detail="Save a title on this device and it will be waiting here." action={<Link href="/movies" className="text-link">Explore titles →</Link>} /></div>}</>;
  return <><div className="page-heading"><h1>{heading}</h1><p>{subtitle}</p></div>{history.length ? <div className="watchlist-list">{history.map(row => <Link className="watchlist-row" key={row.content.id} href={`/watch/${row.content.id}`}><span>{row.content.poster_url ? <Image src={row.content.poster_url} alt="" width={70} height={105} unoptimized style={{ width: 70, height: 105, objectFit: "cover", borderRadius: 6 }} /> : <span className="poster" style={{ display: "block", width: 70 }} />}</span><span><strong>{row.content.title}</strong><span style={{ display: "block", color: "var(--muted)", fontSize: 10, marginTop: 4 }}>Continue from {Math.floor(row.position_seconds / 60)}:{String(row.position_seconds % 60).padStart(2, "0")}</span><span style={{ display: "block", height: 3, background: "#303038", borderRadius: 4, marginTop: 9, maxWidth: 210 }}><i style={{ display: "block", width: `${Math.min(100, Math.round(100 * row.position_seconds / Math.max(1, row.duration_seconds)))}%`, height: "100%", background: "var(--accent)", borderRadius: 4 }} /></span></span><CirclePlay size={17} /></Link>)}</div> : <div style={{ padding: "0 20px 30px" }}><EmptyState title="Nothing to continue yet" detail="Start watching a title and progress will be saved on this device." action={<Link href="/movies" className="text-link">Explore titles →</Link>} /></div>}<div style={{ padding: "8px 20px 30px", color: "var(--muted)", fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}><History size={14} />Your history is stored in this browser only.</div></>;
}
