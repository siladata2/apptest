import type { Metadata } from "next";
import { TitleExperience } from "@/components/title-experience";
import { EmptyState } from "@/components/catalog-ui";
import { getPublicContentBySlugOrId } from "@/lib/catalog-db";
import type { CatalogItem } from "@/lib/types";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try { const item = await getPublicContentBySlugOrId(slug); return { title: item?.title || "Title unavailable", description: item?.description || undefined }; }
  catch { return { title: "Title unavailable" }; }
}
export default async function TitlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let item: CatalogItem | null = null;
  try { item = await getPublicContentBySlugOrId(slug); } catch { item = null; }
  if (item) return <TitleExperience item={item} />;
  return <div className="page-heading"><h1>Title unavailable</h1><EmptyState title="Content temporarily unavailable" detail="Please try again shortly." icon="error" /></div>;
}
