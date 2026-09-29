import type { Metadata } from "next";
import { BrowseExperience } from "@/components/browse-experience";
export const metadata: Metadata = { title: "Series" };
export default function SeriesPage() { return <BrowseExperience heading="Series" types={["series"]} subtitle="Follow a story across seasons and episodes." />; }
