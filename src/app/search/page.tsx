import type { Metadata } from "next";
import { BrowseExperience } from "@/components/browse-experience";
export const metadata: Metadata = { title: "Search" };
export default function SearchPage() { return <BrowseExperience heading="Find your next watch" subtitle="Search published movies, series, episodes, reels and recaps." />; }
