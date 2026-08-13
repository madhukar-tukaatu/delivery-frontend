
import Link from "next/link";
import styles from "../site.module.css";
export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div>
        <strong>Tukaatu Express</strong>
        <p>Fast, reliable courier delivery across Nepal.</p>
      </div>

      <div className={styles.footerLinks}>
        <Link href="/site/services">Services</Link>
        <Link href="/site/tracking">Track Shipment</Link>
        <Link href="/login">Login</Link>
        <Link href="/site/contact">Contact</Link>
      </div>

      <span>© 2026 Tukaatu Express. All rights reserved.</span>
    </footer>
  );
}
