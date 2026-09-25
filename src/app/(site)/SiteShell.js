"use client";
import { usePathname } from "next/navigation";
import "./public-pages.css";
import Header from "./components/Header";
import Footer from "./components/Footer";

export default function SiteShell({ children }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  return (
    <div className={isHome ? undefined : "public-site"}>
      {!isHome && <Header />}
      {children}
      {!isHome && <Footer showCta={false} />}
    </div>
  );
}
