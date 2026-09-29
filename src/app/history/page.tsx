import type { Metadata } from "next";
import { LibraryExperience } from "@/components/library-experience";
export const metadata: Metadata = { title: "Continue Watching" };
export default function HistoryPage() { return <LibraryExperience mode="history" />; }
