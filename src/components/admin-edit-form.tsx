"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle, Save } from "lucide-react";
import type { CatalogItem } from "@/lib/types";

export function AdminEditForm({ item, onSaved }: { item: CatalogItem; onSaved: () => Promise<void> }) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || "");
  const [posterUrl, setPosterUrl] = useState(item.poster_url || "");
  const [backdropUrl, setBackdropUrl] = useState(item.backdrop_url || "");
  const [year, setYear] = useState(item.release_year ? String(item.release_year) : "");
  const [duration, setDuration] = useState(item.duration_seconds ? String(item.duration_seconds) : "");
  const [categories, setCategories] = useState((item.categories || []).join(", "));
  const [isLive, setIsLive] = useState(Boolean(item.live_details?.is_live));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const save = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/content/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          poster_url: posterUrl || null,
          backdrop_url: backdropUrl || null,
          release_year: year ? Number(year) : null,
          duration_seconds: duration ? Number(duration) : null,
          categories: categories.split(",").map(value => value.trim()).filter(Boolean),
          is_featured: item.is_featured,
          ...(item.type === "live" ? { live_details: { is_live: isLive, starts_at: item.live_details?.starts_at || null, ends_at: item.live_details?.ends_at || null, logo_url: item.live_details?.logo_url || null } } : {}),
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save changes.");
      setMessage("Changes saved."); await onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save changes.");
    } finally { setBusy(false); }
  };

  return <form className="form-stack" onSubmit={event => void save(event)}><h3 style={{ margin: 0 }}>Edit title details</h3><label className="form-label">Display title<input className="form-input" value={title} onChange={event => setTitle(event.target.value)} maxLength={160} required /></label><label className="form-label">Description<textarea className="form-textarea" value={description} onChange={event => setDescription(event.target.value)} maxLength={5000} /></label><div className="form-row"><label className="form-label">Poster URL<input className="form-input" type="url" value={posterUrl} onChange={event => setPosterUrl(event.target.value)} placeholder="https://…" /></label><label className="form-label">Backdrop URL<input className="form-input" type="url" value={backdropUrl} onChange={event => setBackdropUrl(event.target.value)} placeholder="https://…" /></label></div><div className="form-row"><label className="form-label">Release year<input className="form-input" type="number" min="1900" max="2100" value={year} onChange={event => setYear(event.target.value)} /></label><label className="form-label">Duration (seconds)<input className="form-input" type="number" min="0" max="86400" value={duration} onChange={event => setDuration(event.target.value)} /></label></div><label className="form-label">Categories (comma-separated)<input className="form-input" value={categories} onChange={event => setCategories(event.target.value)} /></label>{item.type === "live" && <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={isLive} onChange={event => setIsLive(event.target.checked)} /> Mark as live right now</label>}{message && <p className="form-hint" role="status">{message}</p>}<button className="button button-quiet" type="submit" disabled={busy}>{busy ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />} Save title details</button></form>;
}
