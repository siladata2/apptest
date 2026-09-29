"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Film, House, Library, Menu, Radio, Search, TvMinimalPlay, X } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/movies", label: "Movies" },
  { href: "/series", label: "Series" },
  { href: "/reels", label: "Reels" },
  { href: "/recaps", label: "Recaps" },
  { href: "/live", label: "Live" },
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const active = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);
  return <div className="app-shell">
    <header className="topbar">
      <button className="icon-button mobile-menu" aria-label={menuOpen ? "Close navigation" : "Open navigation"} onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
      <Link href="/" className="brand" aria-label="SilaFlix home"><span className="brand-mark">S</span><span className="brand-word">Sila<span>Flix</span></span></Link>
      <nav className="primary-nav" aria-label="Main navigation">{links.map(item => <Link key={item.href} href={item.href} className={active(item.href) ? "active" : ""}>{item.label}</Link>)}</nav>
      <div className="topbar-actions"><Link className="icon-button" href="/search" aria-label="Search"><Search size={18} /></Link><Link className="icon-button" href="/watchlist" aria-label="Watchlist saved on this device"><Library size={18} /></Link></div>
      {menuOpen && <nav className="mobile-drawer" aria-label="Mobile navigation">{links.map(item => <Link onClick={() => setMenuOpen(false)} key={item.href} href={item.href}>{item.label}</Link>)}<Link onClick={() => setMenuOpen(false)} href="/watchlist">Watchlist</Link><Link onClick={() => setMenuOpen(false)} href="/search">Search</Link></nav>}
    </header>
    <main className="app-content">{children}</main>
    <footer className="footer"><div className="footer-main"><div><Link href="/" className="brand"><span className="brand-mark">S</span><span className="brand-word">Sila<span>Flix</span></span></Link><div className="footer-contact">Stories worth staying for.<br />Free to watch, no viewer account needed.<br />Contact: <a href="mailto:silatrix22@gmail.com">silatrix22@gmail.com</a><br /><a href="https://wa.me/255789661031" target="_blank" rel="noreferrer">WhatsApp: +255 789 661 031</a><br /><a href="https://whatsapp.com/channel/0029VbBG4gfISTkCpKxyMH02" target="_blank" rel="noreferrer">Join our WhatsApp Channel</a></div></div><div className="footer-links"><Link href="/movies">Movies</Link><Link href="/series">Series</Link><Link href="/reels">Reels</Link><Link href="/recaps">Recaps</Link><Link href="/live">Live</Link><Link href="/watchlist">Watchlist</Link><Link href="/about">About SilaFlix</Link><Link href="/contact">Contact</Link><Link href="/help">Help Centre</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms of Use</Link><Link href="/admin">Admin</Link></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} SilaFlix. All rights reserved.</span><span>Free public viewing of authorized content.</span></div></footer>
    <nav className="mobile-bottom-nav" aria-label="Quick navigation"><Link className={active("/") ? "active" : ""} href="/"><House /><span>Home</span></Link><Link className={active("/movies") ? "active" : ""} href="/movies"><Film /><span>Movies</span></Link><Link className={active("/series") ? "active" : ""} href="/series"><TvMinimalPlay /><span>Series</span></Link><Link className={active("/reels") ? "active" : ""} href="/reels"><Compass /><span>Reels</span></Link><Link className={active("/live") ? "active" : ""} href="/live"><Radio /><span>Live</span></Link></nav>
  </div>;
}
