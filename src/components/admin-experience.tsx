"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, CirclePlus, LoaderCircle, LogOut, Radio, RefreshCw, Trash2 } from "lucide-react";
import { EmptyState, LoadingState } from "@/components/catalog-ui";
import { AdminEditForm } from "@/components/admin-edit-form";
import type { CatalogItem, ContentStatus, ContentType, StreamSource } from "@/lib/types";

type ApiResponse = { items?: CatalogItem[]; error?: string };
const types: ContentType[] = ["movie", "series", "episode", "reel", "recap", "live"];

export function AdminExperience() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selected, setSelected] = useState("");
  const [username, setUsername] = useState("sila22");
  const [password, setPassword] = useState("");
  const [newType, setNewType] = useState<ContentType>("movie");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/content", { cache: "no-store" });
    if (!response.ok) throw new Error(response.status === 401 ? "Please sign in as the administrator." : "Admin content is temporarily unavailable.");
    const data = await response.json() as ApiResponse;
    setItems(data.items || []);
  }, []);

  useEffect(() => {
    let alive = true;
    void fetch("/api/admin/session", { cache: "no-store" }).then(response => response.json()).then(async (data: { authenticated?: boolean }) => {
      if (!alive) return;
      setAuthenticated(Boolean(data.authenticated));
      if (data.authenticated) await refresh();
    }).catch(() => undefined).finally(() => { if (alive) setChecking(false); });
    return () => { alive = false; };
  }, [refresh]);

  const signIn = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await response.json() as { error?: string; authenticated?: boolean };
      if (!response.ok) throw new Error(data.error || "Sign-in failed.");
      setAuthenticated(true); setPassword(""); await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Sign-in is unavailable."); }
    finally { setBusy(false); }
  };

  const signOut = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false); setItems([]); setSelected(""); setMessage("Signed out.");
  };

  const createContent = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: newType, title: newTitle, description: newDescription }) });
      const data = await response.json() as { item?: CatalogItem; error?: string };
      if (!response.ok || !data.item) throw new Error(data.error || "Could not create content.");
      setNewTitle(""); setNewDescription(""); setSelected(data.item.id); setMessage("Draft created. Add an authorized stream before publishing."); await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not create content."); }
    finally { setBusy(false); }
  };

  const addStream = async (event: FormEvent) => {
    event.preventDefault(); if (!selected) return; setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/content/${selected}/sources`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stream_url: streamUrl, distribution_authorized: authorized, is_active: true }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not save stream.");
      setStreamUrl(""); setMessage("Stream saved."); await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save stream."); }
    finally { setBusy(false); }
  };

  const setStatus = async (item: CatalogItem, status: ContentStatus) => {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/content/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not update status.");
      setMessage(`${item.title}: ${status.replace("_", " ")}.`); await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update status."); }
    finally { setBusy(false); }
  };

  const deleteItem = async (item: CatalogItem) => {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/content/${item.id}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not delete item.");
      if (selected === item.id) setSelected(""); setMessage("Content deleted."); await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not delete item."); }
    finally { setBusy(false); }
  };

  if (checking) return <div className="page-heading"><h1>Admin</h1><LoadingState label="Checking access…" /></div>;
  if (!authenticated) return <div className="auth-wrap"><section className="auth-card"><div className="brand" style={{ marginBottom: 20 }}><span className="brand-mark">S</span><span className="brand-word">Sila<span>Flix</span></span></div><div className="eyebrow"><span className="eyebrow-dot" />Administrator access</div><h1 style={{ fontSize: 28, marginTop: 12 }}>Admin sign in</h1><p>Public viewers can watch without an account. This sign-in is for the administrator only.</p><form className="form-stack" onSubmit={event => void signIn(event)}><label className="form-label">Username<input className="form-input" autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} required /></label><label className="form-label">Password<input className="form-input" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : null}Sign in</button></form><Link href="/" className="text-link" style={{ display: "inline-flex", marginTop: 18 }}>Back to SilaFlix</Link></section></div>;

  const selectedItem = items.find(item => item.id === selected);
  return <div style={{ padding: "0 clamp(20px,4.5vw,72px) 40px" }}><div className="page-heading" style={{ padding: "30px 0 16px" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}><div><div className="eyebrow"><span className="eyebrow-dot" />Owner tools</div><h1>Admin Console</h1><p>Manage published titles and authorized playback sources.</p></div><button className="button button-quiet" onClick={() => void signOut()}><LogOut size={14} /> Sign out</button></div></div>
    {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="notice" role="status">{message}</p>}
    <div className="admin-layout"><aside className="admin-sidebar"><button className="admin-side-item active"><CirclePlus size={15} /> Add title</button><button className="admin-side-item" onClick={() => void refresh()}><RefreshCw size={15} /> Refresh catalog</button><Link className="admin-side-item" href="/"><Radio size={15} /> View public site</Link></aside>
      <section className="admin-main"><form className="admin-panel form-stack" onSubmit={event => void createContent(event)}><h2 style={{ margin: 0 }}>Create a title</h2><div className="form-row"><label className="form-label">Type<select className="select-field" value={newType} onChange={event => setNewType(event.target.value as ContentType)}>{types.map(type => <option key={type} value={type}>{type}</option>)}</select></label><label className="form-label">Title<input className="form-input" value={newTitle} onChange={event => setNewTitle(event.target.value)} maxLength={160} required /></label></div><label className="form-label">Description<textarea className="form-textarea" value={newDescription} onChange={event => setNewDescription(event.target.value)} maxLength={5000} /></label><button className="button button-primary" type="submit" disabled={busy}><CirclePlus size={15} /> Create draft</button></form>
      <div className="admin-panel"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><h2 style={{ margin: 0 }}>Content</h2><span className="status-pill">{items.length} items</span></div>{items.length ? <div className="admin-content-list">{items.map(item => <div className="admin-content-row" key={item.id}><button className="admin-content-select" onClick={() => setSelected(item.id)}><strong>{item.title}</strong><span>{item.type} · {item.status} · {(item.sources || []).length} source(s)</span></button><button className="button button-quiet" disabled={busy} onClick={() => void setStatus(item, item.status === "published" ? "unpublished" : "published")}>{item.status === "published" ? "Unpublish" : "Publish"}</button><button className="icon-button" aria-label={`Delete ${item.title}`} disabled={busy} onClick={() => void deleteItem(item)}><Trash2 size={15} /></button></div>)}</div> : <EmptyState title="No content yet" detail="Create a title, add an authorized source, then publish it." />}</div>
      {selectedItem && <div className="admin-panel form-stack"><AdminEditForm key={selectedItem.id} item={selectedItem} onSaved={refresh} /><h2 style={{ margin: 0 }}>Streams for {selectedItem.title}</h2>{(selectedItem.sources || []).map((source: StreamSource) => <div className="notice" key={source.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, overflowWrap: "anywhere" }}><span>{source.source_type} · {source.is_active ? "active" : "inactive"} · {source.distribution_authorized ? "authorized" : "not authorized"}<br /><small>{source.stream_url}</small></span><Check size={16} /></div>)}<form className="form-stack" onSubmit={event => void addStream(event)}><label className="form-label">Public HTTPS video or playlist URL<input className="form-input" type="url" value={streamUrl} onChange={event => setStreamUrl(event.target.value)} placeholder="https://…" required /></label><label className="form-label" style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={authorized} onChange={event => setAuthorized(event.target.checked)} /> I confirm this source is authorized for public viewing.</label><button className="button button-primary" type="submit" disabled={busy}>Add stream</button></form><p className="form-hint">A title must have an active authorized stream before publishing.</p></div>}
    </section></div></div>;
}
