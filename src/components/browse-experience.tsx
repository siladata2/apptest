"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { CatalogStatus, ContentCard, EmptyState, LoadingState } from "@/components/catalog-ui";
import type { CatalogItem, ContentType } from "@/lib/types";

const PAGE_SIZE = 24;
const ALL_TYPES: ContentType[] = ["movie", "series", "episode", "reel", "recap", "live"];
type ResponseData = { items?: CatalogItem[]; total?: number };

export function BrowseExperience({ heading, types, subtitle }: { heading: string; types?: ContentType[]; subtitle: string }) {
  const [rows, setRows] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [year, setYear] = useState("");
  const [category, setCategory] = useState("");
  const [typeFilter, setTypeFilter] = useState<ContentType | "">(types?.length === 1 ? types[0] : "");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const typeKey = useMemo(() => (types || (typeFilter ? [typeFilter] : [])).join(","), [types, typeFilter]);
  const categories = useMemo(() => [...new Set(rows.flatMap(item => item.categories || []))].sort(), [rows]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 240);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(offset === 0);
      setLoadingMore(offset > 0);
      setError(false);
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), skip: String(offset) });
      if (typeKey) params.set("type", typeKey.split(",")[0]);
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (year) params.set("year", year);
      if (category) params.set("category", category);
      try {
        const response = await fetch(`/api/catalog?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error("unavailable");
        const data = await response.json() as ResponseData;
        const page = Array.isArray(data.items) ? data.items : [];
        if (alive) {
          setRows(current => offset === 0 ? page : [...current, ...page]);
          setHasMore(offset + page.length < (data.total ?? page.length));
        }
      } catch {
        if (alive) { setError(true); if (offset === 0) setRows([]); }
      } finally {
        if (alive) { setLoading(false); setLoadingMore(false); }
      }
    };
    void load();
    return () => { alive = false; };
  }, [typeKey, debouncedSearch, year, category, offset]);

  const resetAnd = (setter: (value: string) => void, value: string) => { setter(value); setOffset(0); setRows([]); };
  return <>
    <div className="page-heading"><h1>{heading}</h1><p>{subtitle}</p></div>
    <div className="browse-tools">
      <label className="search-field"><Search size={17} /><input aria-label="Search catalog" role="combobox" aria-autocomplete="list" aria-expanded={Boolean(search.trim() && rows.length)} aria-controls="search-suggestions" value={search} onChange={event => resetAnd(setSearch, event.target.value)} placeholder="Search titles…" /></label>
      {search.trim() && rows.length > 0 && <div id="search-suggestions" className="search-suggestions" role="listbox" aria-label="Search suggestions">{rows.slice(0, 5).map(item => <Link role="option" key={item.id} href={`/title/${item.slug}`} onClick={() => setSearch("")}>{item.title}<span>{item.release_year || item.type}</span></Link>)}</div>}
      {!types?.length && <select className="select-field" aria-label="Filter by content type" value={typeFilter} onChange={event => { setTypeFilter(event.target.value as ContentType | ""); setOffset(0); setRows([]); }}><option value="">All content types</option>{ALL_TYPES.map(type => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}</select>}
      <select className="select-field" aria-label="Filter by release year" value={year} onChange={event => resetAnd(setYear, event.target.value)}><option value="">All years</option>{Array.from({ length: 30 }, (_, index) => String(new Date().getFullYear() - index)).map(value => <option key={value}>{value}</option>)}</select>
      <select className="select-field" aria-label="Filter by category" value={category} onChange={event => resetAnd(setCategory, event.target.value)}><option value="">All categories</option>{categories.map(value => <option key={value}>{value}</option>)}</select>
      <span style={{ color: "var(--muted)", fontSize: 11, display: "inline-flex", gap: 5, alignItems: "center" }}><SlidersHorizontal size={14} />{rows.length} titles</span>
    </div>
    {error ? <div style={{ padding: "0 clamp(20px,4.5vw,72px) 30px" }}><CatalogStatus configured error="Catalog is temporarily unavailable." /></div> : loading && !rows.length ? <div style={{ padding: "0 clamp(20px,4.5vw,72px) 30px" }}><LoadingState label="Loading titles…" /></div> : rows.length ? <><div className="content-grid">{rows.map(item => <ContentCard key={item.id} item={item} />)}</div><div style={{ display: "flex", justifyContent: "center", padding: "0 20px 32px" }}>{hasMore && <button className="button button-quiet" disabled={loadingMore} onClick={() => setOffset(current => current + PAGE_SIZE)}>{loadingMore ? "Loading…" : "Load more"} <ChevronDown size={15} /></button>}</div></> : <div style={{ padding: "0 clamp(20px,4.5vw,72px) 30px" }}><EmptyState title="No published titles match" detail="Try another search or check back soon." action={<Link href="/" className="text-link">Back to SilaFlix home →</Link>} /></div>}
  </>;
}
