import { ObjectId, type Document } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, isSameOriginRequest } from "@/lib/admin-auth";
import { createContentSlug, mapCatalogDocument } from "@/lib/catalog-db";
import { getMongoDb } from "@/lib/mongodb";
import type { ContentType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const types: ContentType[] = ["movie", "series", "episode", "reel", "recap", "live"];

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const db = await getMongoDb();
    const docs = await db.collection("content").find({}).sort({ updated_at: -1, created_at: -1 }).limit(300).toArray();
    return NextResponse.json({ items: docs.map(doc => mapCatalogDocument(doc, true)) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Admin content is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 160) : "";
    const type = body.type as ContentType;
    if (!title || !types.includes(type)) return NextResponse.json({ error: "Enter a title and valid content type." }, { status: 400 });
    const slug = createContentSlug(typeof body.slug === "string" && body.slug.trim() ? body.slug : title);
    if (!slug) return NextResponse.json({ error: "A valid slug is required." }, { status: 400 });
    const db = await getMongoDb();
    if (await db.collection("content").findOne({ slug })) return NextResponse.json({ error: "That slug is already in use." }, { status: 409 });
    const now = new Date();
    const doc: Document = {
      _id: new ObjectId(), type, title, slug,
      description: typeof body.description === "string" ? body.description.trim().slice(0, 5000) : "",
      poster_url: null, backdrop_url: null, thumbnail_url: null,
      release_year: null, language: null, country: null, age_rating: null, duration_seconds: null,
      status: "draft", is_featured: false, published_at: null,
      categories: [], sources: [], downloads: [], subtitles: [],
      live_details: type === "live" ? { is_live: false, starts_at: null, ends_at: null, logo_url: null } : null,
      created_at: now, updated_at: now,
    };
    const result = await db.collection("content").insertOne(doc);
    return NextResponse.json({ item: mapCatalogDocument({ ...doc, _id: result.insertedId }, true) }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not create this item. Please try again." }, { status: 503 });
  }
}
