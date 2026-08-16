"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./Header.module.css";

export default function Header({ transparent = false }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!transparent) return;
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [transparent]);

  const isTransparent = transparent && !scrolled;

  return (
    <header
      className={[
        styles.header,
        transparent ? styles.fixed : styles.sticky,
        isTransparent ? styles.clear : styles.solid,
      ].join(" ")}
    >
      <Link href="/" className={styles.logo}>
        <Image
          src="/images/logo.png"
          alt="Tukaatu Express"
          width={140}
          height={40}
          className={styles.logoImg}
          priority
        />
      </Link>

      <nav className={`${styles.nav} ${open ? styles.open : ""}`}>
        <Link href="/services" onClick={() => setOpen(false)}>Services</Link>
        <Link href="/pricing" onClick={() => setOpen(false)}>Pricing</Link>
        <Link href="/business" onClick={() => setOpen(false)}>Business</Link>
        <Link href="/coverage" onClick={() => setOpen(false)}>Coverage</Link>
        <Link href="/franchise" onClick={() => setOpen(false)}>Franchise</Link>
        <Link href="/about" onClick={() => setOpen(false)}>About</Link>
      </nav>

      <div className={styles.actions}>
        <Link href="/login" className={styles.login}>Login</Link>
        <Link href="/public/merchant-register" className={styles.track}>Join as Partner →</Link>
      </div>

      <button
        type="button"
        className={styles.menu}
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle navigation"
      >
        <span className={open ? styles.bar1open : ""} />
        <span className={open ? styles.bar2open : ""} />
        <span className={open ? styles.bar3open : ""} />
      </button>
    </header>
  );
}
