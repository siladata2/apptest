import { NextRequest, NextResponse } from "next/server";
import { getPublicContentBySlugOrId } from "@/lib/catalog-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  try {
    const item = await getPublicContentBySlugOrId(decodeURIComponent(slug));
    if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ item }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
  } catch {
    return NextResponse.json({ error: "Catalog is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
