"use client";
import { usePathname } from "next/navigation";
import "./public-pages.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import MobileBottomNav from "./components/MobileBottomNav";

const HERO_ONLY_PAGES = ["/about", "/services", "/franchise", "/pricing"];

export default function SiteShell({ children }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isHeroOnly = HERO_ONLY_PAGES.includes(pathname);

  return (
    <div className={isHome ? undefined : `public-site ${isHeroOnly ? "public-site--hero-only" : ""}`}>
      {!isHome && <Header />}
      {children}
      {!isHome && !isHeroOnly && <Footer showCta={false} />}
      <MobileBottomNav />
    </div>
  );
}
