import type { Metadata } from "next";
import { BrowseExperience } from "@/components/browse-experience";
export const metadata: Metadata = { title: "Movies" };
export default function MoviesPage() { return <BrowseExperience heading="Movies" types={["movie"]} subtitle="Browse the published movie catalog." />; }
