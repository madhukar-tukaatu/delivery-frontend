"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./Header.module.css";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>
        <div className={styles.logoMark}>
          <span className={styles.logoYellow} />
          <span className={styles.logoBlue} />
        </div>

        <div>
          <strong>TUKAATU</strong>
          <small>EXPRESS</small>
        </div>
      </Link>

      <nav className={`${styles.nav} ${open ? styles.open : ""}`}>
        <Link href="/services">Services</Link>
        <Link href="/tracking">Track</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/business">Business</Link>
        <Link href="/coverage">Coverage</Link>
        <Link href="/franchise">Franchise</Link>
      </nav>

      <div className={styles.actions}>
        <Link href="/login" className={styles.login}>
          Login
        </Link>

        <Link href="/track" className={styles.track}>
          Track parcel →
        </Link>
      </div>

      <button
        type="button"
        className={styles.menu}
        onClick={() => setOpen((value) => !value)}
        aria-label="Toggle navigation"
      >
        <span />
        <span />
        <span />
      </button>
    </header>
  );
}