import "server-only";
import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "silaflix";
const globalForMongo = globalThis as typeof globalThis & { silaflixMongoPromise?: Promise<MongoClient>; silaflixIndexPromise?: Promise<void> };

export class DatabaseUnavailableError extends Error {
  constructor() {
    super("DATABASE_UNAVAILABLE");
    this.name = "DatabaseUnavailableError";
  }
}

export async function getMongoClient(): Promise<MongoClient> {
  if (!uri) throw new DatabaseUnavailableError();
  if (!globalForMongo.silaflixMongoPromise) {
    const client = new MongoClient(uri, {
      appName: "SilaFlix",
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
      maxPoolSize: 10,
      retryWrites: true,
    });
    globalForMongo.silaflixMongoPromise = client.connect().catch((error: unknown) => {
      globalForMongo.silaflixMongoPromise = undefined;
      throw error;
    });
  }
  return globalForMongo.silaflixMongoPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();
  const db = client.db(dbName);
  if (!globalForMongo.silaflixIndexPromise) {
    globalForMongo.silaflixIndexPromise = Promise.all([
      db.collection("content").createIndex({ slug: 1 }, { unique: true, name: "silaflix_unique_slug" }),
      db.collection("content").createIndex({ status: 1, type: 1, published_at: -1 }, { name: "silaflix_public_catalog" }),
      db.collection("content").createIndex({ status: 1, is_featured: -1, published_at: -1 }, { name: "silaflix_featured_catalog" }),
      db.collection("content").createIndex({ status: 1, categories: 1 }, { name: "silaflix_category_catalog" }),
    ]).then(() => undefined).catch(() => undefined);
  }
  await globalForMongo.silaflixIndexPromise;
  return db;
}

export function isMongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI);
}
