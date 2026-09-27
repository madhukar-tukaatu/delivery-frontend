import Link from "next/link";
import styles from "./Footer.module.css";

const links = [
  ["Track parcel", "/tracking"],
  ["Services", "/services"],
  ["Pricing", "/pricing"],
  ["Franchise", "/franchise"],
  ["About", "/about"],
  ["Support", "/contact"],
  ["Terms of Use", "/terms-conditions"],
  ["Privacy", "/privacy-policy"],
  ["Merchant login", "/login"],
];

export default function Footer({ showCta = false } = {}) {
  return (
    <footer className={styles.footer} aria-label="Tukaatu Express footer">
      <div className={styles.inner}>
        <p>© {new Date().getFullYear()} Tukaatu Express. All rights reserved.</p>
        <nav aria-label="Footer links">
          {links.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
