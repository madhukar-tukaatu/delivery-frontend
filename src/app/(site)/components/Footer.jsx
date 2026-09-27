"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Footer.module.css";

export default function Footer() {
  const pathname = usePathname() || "";

  // Never render on home (story / film reel page)
  if (pathname === "/") return null;

  // Determine {page_name} Info dynamically based on current page
  let pageInfo = null;

  if (pathname === "/services") {
    pageInfo = { label: "Services Info", href: "/services/info" };
  } else if (pathname === "/services/info") {
    pageInfo = { label: "← Back to Services", href: "/services" };
  } else if (pathname === "/about") {
    pageInfo = { label: "About Info", href: "/about/info" };
  } else if (pathname === "/about/info") {
    pageInfo = { label: "← Back to About", href: "/about" };
  } else if (pathname === "/franchise") {
    pageInfo = { label: "Franchise Info", href: "/franchise/info" };
  } else if (pathname === "/franchise/info") {
    pageInfo = { label: "← Back to Franchise", href: "/franchise" };
  } else if (pathname === "/pricing") {
    pageInfo = { label: "Pricing Info", href: "/pricing/info" };
  } else if (pathname === "/pricing/info") {
    pageInfo = { label: "← Back to Pricing", href: "/pricing" };
  } else if (pathname === "/tracking") {
    pageInfo = { label: "Tracking Info", href: "/services/info" };
  } else if (pathname === "/contact") {
    pageInfo = { label: "Contact Info", href: "/contact/info" };
  } else if (pathname === "/contact/info") {
    pageInfo = { label: "← Back to Contact", href: "/contact" };
  } else if (pathname.startsWith("/franchise/")) {
    pageInfo = { label: "Franchise Info", href: "/franchise/info" };
  } else {
    // Dynamic fallback for any nested or other routes
    const segment = pathname.split("/").filter(Boolean)[0];
    if (segment) {
      const formatted =
        segment.charAt(0).toUpperCase() +
        segment.slice(1).replace(/-/g, " ");
      pageInfo = { label: `${formatted} Info`, href: `/${segment}/info` };
    }
  }

  return (
    <footer className={styles.footer} aria-label="Tukaatu Express Footer">
      <div className={styles.inner}>
        <span className={styles.copyright}>
          &copy; {new Date().getFullYear()} Tukaatu Express. All Rights Reserved.
        </span>

        <div className={styles.links}>
          {pageInfo && (
            <Link href={pageInfo.href} className={styles.infoLink}>
              <span className={styles.infoDot} />
              {pageInfo.label}
              {!pageInfo.label.startsWith("←") && (
                <span aria-hidden="true" style={{ fontSize: "11px", fontWeight: 800 }}>→</span>
              )}
            </Link>
          )}
          <Link href="/login" className={styles.link}>
            Admin/Staff
          </Link>
          <a
            href="https://store.tukaatu.com/login"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            Store Manager
          </a>
          <Link href="/terms-conditions" className={styles.link}>
            Terms
          </Link>
          <Link href="/privacy-policy" className={styles.link}>
            Privacy
          </Link>
          <Link href="/contact" className={styles.link}>
            Support
          </Link>
        </div>
      </div>
    </footer>
  );
}
