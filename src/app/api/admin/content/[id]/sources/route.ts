import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, isSameOriginRequest } from "@/lib/admin-auth";
import { guessSourceType, googleDrivePreviewUrl, isSafeHttpsUrl } from "@/lib/catalog-db";
import { getMongoDb } from "@/lib/mongodb";
import type { Quality } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const qualities: Quality[] = ["360p", "480p", "720p", "1080p", "4k", "adaptive"];
type ContentRecord = { _id?: ObjectId; sources?: Record<string, unknown>[]; updated_at?: Date };

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const rawUrl = typeof body.stream_url === "string" ? body.stream_url.trim() : "";
    if (!isSafeHttpsUrl(rawUrl)) return NextResponse.json({ error: "Use a public HTTPS stream URL without embedded credentials." }, { status: 400 });
    const preview = googleDrivePreviewUrl(rawUrl);
    const streamUrl = preview || rawUrl;
    const requestedType = typeof body.source_type === "string" ? body.source_type : guessSourceType(streamUrl);
    const sourceType = preview ? "embed" : requestedType;
    if (!["mp4", "hls", "dash", "youtube", "embed"].includes(sourceType)) return NextResponse.json({ error: "Unsupported stream type." }, { status: 400 });
    const quality = qualities.includes(body.quality as Quality) ? body.quality as Quality : "adaptive";
    const source = {
      id: new ObjectId().toHexString(),
      source_type: sourceType,
      stream_url: streamUrl,
      storage_path: null,
      quality,
      language: typeof body.language === "string" ? body.language.trim().slice(0, 40) || null : null,
      is_active: body.is_active !== false,
      distribution_authorized: body.distribution_authorized === true,
      created_at: new Date(),
    };
    const db = await getMongoDb();
    const content = db.collection<ContentRecord>("content");
    const result = await content.updateOne({ _id: new ObjectId(id) }, { $push: { sources: source }, $set: { updated_at: new Date() } });
    if (!result.matchedCount) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ source: { ...source, content_id: id } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not add this stream." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await context.params;
  const sourceId = request.nextUrl.searchParams.get("sourceId");
  if (!ObjectId.isValid(id) || !sourceId) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    const db = await getMongoDb();
    await db.collection<ContentRecord>("content").updateOne({ _id: new ObjectId(id) }, { $pull: { sources: { id: sourceId } }, $set: { updated_at: new Date() } });
    return NextResponse.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not remove this stream." }, { status: 503 });
  }
}
