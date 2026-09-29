import { NextRequest, NextResponse } from "next/server";
import { queryPublicCatalog } from "@/lib/catalog-db";
import { DatabaseUnavailableError } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const yearValue = Number(params.get("year"));
  try {
    const result = await queryPublicCatalog({
      type: params.get("type") || undefined,
      q: params.get("q") || undefined,
      category: params.get("category") || undefined,
      year: Number.isFinite(yearValue) && yearValue > 0 ? yearValue : undefined,
      limit: Number(params.get("limit")) || 24,
      skip: Number(params.get("skip")) || 0,
      featured: params.get("featured") === "true",
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
  } catch (error) {
    const status = error instanceof DatabaseUnavailableError ? 503 : 503;
    return NextResponse.json({ error: "Catalog is temporarily unavailable." }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
