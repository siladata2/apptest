import { ObjectId, type Document } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, isSameOriginRequest } from "@/lib/admin-auth";
import { createContentSlug, mapCatalogDocument, isSafeHttpsUrl } from "@/lib/catalog-db";
import { getMongoDb } from "@/lib/mongodb";
import type { ContentStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const statuses: ContentStatus[] = ["draft", "in_review", "published", "unpublished", "archived"];
const optionalUrlFields = ["poster_url", "backdrop_url", "thumbnail_url"] as const;

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const update: Document = { updated_at: new Date() };
    if (typeof body.title === "string") update.title = body.title.trim().slice(0, 160);
    if (typeof body.slug === "string") update.slug = createContentSlug(body.slug);
    if (typeof body.description === "string") update.description = body.description.trim().slice(0, 5000);
    for (const field of optionalUrlFields) {
      if (field in body) {
        const value = body[field];
        if (value !== null && typeof value !== "string") return NextResponse.json({ error: "Invalid artwork URL." }, { status: 400 });
        if (typeof value === "string" && value && !isSafeHttpsUrl(value)) return NextResponse.json({ error: "Artwork URLs must use HTTPS." }, { status: 400 });
        update[field] = value || null;
      }
    }
    for (const field of ["release_year", "duration_seconds"] as const) {
      if (field in body) {
        const value = body[field];
        if (value !== null && (typeof value !== "number" || !Number.isFinite(value) || value < 0)) return NextResponse.json({ error: "Invalid numeric value." }, { status: 400 });
        update[field] = value;
      }
    }
    for (const field of ["language", "country", "age_rating"] as const) {
      if (field in body) update[field] = typeof body[field] === "string" ? (body[field] as string).trim().slice(0, 80) || null : null;
    }
    if ("categories" in body) {
      if (!Array.isArray(body.categories) || body.categories.some(value => typeof value !== "string")) return NextResponse.json({ error: "Invalid categories." }, { status: 400 });
      update.categories = [...new Set((body.categories as string[]).map(value => value.trim().slice(0, 60)).filter(Boolean))].slice(0, 20);
    }
    if ("is_featured" in body) update.is_featured = body.is_featured === true;
    if ("live_details" in body) {
      const live = body.live_details;
      if (!live || typeof live !== "object") return NextResponse.json({ error: "Invalid live metadata." }, { status: 400 });
      const data = live as Record<string, unknown>;
      update.live_details = {
        is_live: data.is_live === true,
        starts_at: typeof data.starts_at === "string" && data.starts_at ? new Date(data.starts_at) : null,
        ends_at: typeof data.ends_at === "string" && data.ends_at ? new Date(data.ends_at) : null,
        logo_url: typeof data.logo_url === "string" && isSafeHttpsUrl(data.logo_url) ? data.logo_url : null,
      };
    }
    if ("status" in body) {
      if (typeof body.status !== "string" || !statuses.includes(body.status as ContentStatus)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
      update.status = body.status;
      update.published_at = body.status === "published" ? new Date() : null;
    }
    if (update.title !== undefined && !update.title) return NextResponse.json({ error: "Title cannot be empty." }, { status: 400 });
    if (update.slug !== undefined && !update.slug) return NextResponse.json({ error: "Slug cannot be empty." }, { status: 400 });
    const db = await getMongoDb();
    const existing = await db.collection("content").findOne({ _id: new ObjectId(id) });
    if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (update.status === "published") {
      const sources = Array.isArray(existing.sources) ? existing.sources as Record<string, unknown>[] : [];
      const hasAuthorizedSource = sources.some(source => source.is_active === true && source.distribution_authorized === true && typeof source.stream_url === "string" && isSafeHttpsUrl(source.stream_url));
      if (!hasAuthorizedSource) return NextResponse.json({ error: "Add an active authorized stream before publishing." }, { status: 400 });
    }
    if (update.slug && update.slug !== existing.slug && await db.collection("content").findOne({ slug: update.slug, _id: { $ne: new ObjectId(id) } })) return NextResponse.json({ error: "That slug is already in use." }, { status: 409 });
    await db.collection("content").updateOne({ _id: new ObjectId(id) }, { $set: update });
    const updated = await db.collection("content").findOne({ _id: new ObjectId(id) });
    return NextResponse.json({ item: updated ? mapCatalogDocument(updated, true) : null }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not update this item. Please try again." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    const db = await getMongoDb();
    const result = await db.collection("content").deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount ? NextResponse.json({ deleted: true }) : NextResponse.json({ error: "Not found." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Could not delete this item. Please try again." }, { status: 503 });
  }
}
