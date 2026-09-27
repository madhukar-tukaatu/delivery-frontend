"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Footer.module.css";

export default function Footer() {
  const pathname = usePathname() || "";

  // Never render on home (story / film reel page)
  if (pathname === "/") return null;

  return (
    <footer className={styles.footer} aria-label="Tukaatu Express Footer">
      <div className={styles.inner}>
        <span className={styles.copyright}>
          &copy; {new Date().getFullYear()} Tukaatu Express. All Rights Reserved.
        </span>

        <div className={styles.links}>
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
