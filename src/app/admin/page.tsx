import type { Metadata } from "next";
import { AdminExperience } from "@/components/admin-experience";
export const metadata: Metadata = { title: "Admin Console" };
export default function AdminPage() { return <AdminExperience />; }
