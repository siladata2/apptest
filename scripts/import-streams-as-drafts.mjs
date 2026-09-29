import { randomUUID } from "node:crypto";
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is required in the server-side environment.");
if (process.env.STREAM_SEED_CONFIRM !== "YES") throw new Error("Set STREAM_SEED_CONFIRM=YES after reviewing the imported stream list.");
const dbName = process.env.MONGODB_DB || "silaflix";

// The source list was checked with HTTPS HEAD requests only. Telemetry URLs, insecure HTTP,
// session-token URLs, raw .ts fragments, and sources returning 4xx were deliberately omitted.
const rawStreams = [
  { label: "Drive stream 01", url: "https://drive.google.com/file/d/1gIvp8WQiJ1eozCEu4njqqQ7mRxXFVEqw/view", type: "embed" },
  { label: "Drive stream 02", url: "https://drive.google.com/file/d/1lx_VD3oYfG8JBXz2bRgjv_G2X42hjl4U/view", type: "embed" },
  { label: "Drive stream 03", url: "https://drive.google.com/file/d/1Ahd1X4lqOl5MjqPwr2PcEsJ1WGg2hAiF/view", type: "embed" },
  { label: "Drive stream 04", url: "https://drive.google.com/file/d/1YDJnBrxnk3YNzv1mTLZthpaEZsdBDgb9/view", type: "embed" },
  { label: "Live stream 05", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", type: "hls" },
  { label: "Live stream 06", url: "https://stream.ecable.tv/afrobeats/index.m3u8", type: "hls" },
  { label: "Live stream 07", url: "https://test-streams.mux.dev/test_001/stream.m3u8", type: "hls" },
  { label: "Live stream 08", url: "https://test-streams.mux.dev/dai-discontinuity-deltatre/manifest.m3u8", type: "hls" },
  { label: "Live stream 09", url: "https://test-streams.mux.dev/issue666/playlists/cisq0gim60007xzvi505emlxx.m3u8", type: "hls" },
  { label: "Live stream 10", url: "https://test-streams.mux.dev/tos_ismc/main.m3u8", type: "hls" },
  { label: "Live stream 11", url: "https://stream-134630.castr.net/5fe35eae8c53540cab83659a/live_44ed95e05b6d11f18d5d85805abbdd6f/tracks-v1a1/mono.ts.m3u8", type: "hls" },
  { label: "Live stream 12", url: "https://stream8.cinerama.uz/1227/tracks-v1a1/mono.m3u8", type: "hls" },
  { label: "Live stream 13", url: "https://ml-pull-hwc.myco.io/MixTV/hls/MixTV_H264-360p.m3u8?pkg_media=video&pkg_hm=index.m3u8&pkg_svc=1&pkg_vcodec=avc1", type: "hls" },
  { label: "Live stream 14", url: "https://aegis-cloudfront-1.tubi.video/a1e671ae-d1c2-4e39-99c7-889e83056fd2/360p-cc/index.m3u8", type: "hls" },
  { label: "Live stream 15", url: "https://stmv6.voxtvhd.com.br/xtremacartoons/xtremacartoons/playlist.m3u8", type: "hls" },
];

const toPreview = value => {
  const match = value.match(/^https:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)\//);
  return match ? `https://drive.google.com/file/d/${match[1]}/preview` : value;
};
const now = new Date();
const client = new MongoClient(uri, { appName: "SilaFlix-stream-import", serverSelectionTimeoutMS: 10000 });
try {
  await client.connect();
  const collection = client.db(dbName).collection("content");
  let inserted = 0;
  let skipped = 0;
  for (const [index, entry] of rawStreams.entries()) {
    const slug = `owner-stream-${String(index + 1).padStart(2, "0")}`;
    const exists = await collection.findOne({ slug }, { projection: { _id: 1 } });
    if (exists) { skipped++; continue; }
    await collection.insertOne({
      _id: new ObjectId(),
      type: "live",
      title: entry.label,
      slug,
      description: "Draft imported from the owner-provided stream list. Rename and review before publishing.",
      poster_url: null,
      backdrop_url: null,
      thumbnail_url: null,
      release_year: null,
      language: null,
      country: null,
      age_rating: null,
      duration_seconds: null,
      status: "draft",
      is_featured: false,
      published_at: null,
      categories: ["Live"],
      sources: [{ id: randomUUID(), source_type: entry.type, stream_url: toPreview(entry.url), storage_path: null, quality: "adaptive", language: null, is_active: true, distribution_authorized: true, created_at: now }],
      downloads: [],
      subtitles: [],
      live_details: { is_live: false, starts_at: null, ends_at: null, logo_url: null },
      created_at: now,
      updated_at: now,
    });
    inserted++;
  }
  console.log(JSON.stringify({ inserted, skipped, total: rawStreams.length, initialStatus: "draft" }, null, 2));
} finally {
  await client.close();
}
