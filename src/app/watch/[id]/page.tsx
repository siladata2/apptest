import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/catalog-ui";
import { TitleExperience } from "@/components/title-experience";
import { getPublicContentBySlugOrId } from "@/lib/catalog-db";
import type { CatalogItem } from "@/lib/types";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Watch free" };
export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let item: CatalogItem | null = null;
  try { item = await getPublicContentBySlugOrId(id); } catch { item = null; }
  if (item) return <TitleExperience item={item} />;
  return <div className="page-heading"><h1>Playback unavailable</h1><EmptyState title="Content temporarily unavailable" detail="Please try again shortly." icon="error" /><Link className="text-link" href="/movies">Browse movies →</Link></div>;
}
