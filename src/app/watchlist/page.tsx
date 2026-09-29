import type { Metadata } from "next";
import { LibraryExperience } from "@/components/library-experience";
export const metadata: Metadata = { title: "Watchlist" };
export default function WatchlistPage() { return <LibraryExperience mode="watchlist" />; }
