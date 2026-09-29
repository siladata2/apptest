import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: { default: "SilaFlix — Stories worth staying for", template: "%s · SilaFlix" },
  description: "Movies, series, reels and recaps — all in one place.",
  applicationName: "SilaFlix",
  appleWebApp: { capable: true, title: "SilaFlix", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#09090d", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><SiteShell>{children}</SiteShell></body>
    </html>
  );
}
