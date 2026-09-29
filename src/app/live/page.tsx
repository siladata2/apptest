import type { Metadata } from "next";
import { BrowseExperience } from "@/components/browse-experience";
export const metadata: Metadata = { title: "Live" };
export default function LivePage() { return <BrowseExperience heading="Live" types={["live"]} subtitle="Watch streams that are currently published and authorized." />; }
