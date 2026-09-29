import type { Metadata } from "next";
import { LibraryExperience } from "@/components/library-experience";
export const metadata: Metadata = { title: "Downloads" };
export default function DownloadsPage() { return <LibraryExperience mode="downloads" />; }
