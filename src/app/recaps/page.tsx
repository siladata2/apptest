import type { Metadata } from "next";
import { BrowseExperience } from "@/components/browse-experience";
export const metadata: Metadata = { title: "Recaps" };
export default function RecapsPage() { return <BrowseExperience heading="Recaps" types={["recap"]} subtitle="Catch up with authorized story recaps." />; }
