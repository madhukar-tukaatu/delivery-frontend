import Link from "next/link";
import Image from "next/image";
import styles from "./Footer.module.css";

const nav = [
  {
    heading: "Company",
    links: [
      { label: "About us",  href: "/about" },
      { label: "Services",  href: "/services" },
      { label: "Coverage",  href: "/coverage" },
      { label: "Contact",   href: "/contact" },
    ],
  },
  {
    heading: "Merchants",
    links: [
      { label: "Join as Partner",   href: "/public/merchant-register" },
      { label: "Business logistics", href: "/business" },
      { label: "Pricing",            href: "/pricing" },
      { label: "Franchise",          href: "/franchise" },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "Merchant login",    href: "/login" },
      { label: "Help centre",       href: "/contact" },
      { label: "Contact support",   href: "/contact" },
      { label: "Report an issue",   href: "/contact" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>

      {/* ── CTA band ── */}
      <div className={styles.cta}>
        <div className={styles.ctaInner}>
          <div className={styles.ctaText}>
            <p className={styles.ctaEyebrow}>Sell more. Deliver better.</p>
            <h2 className={styles.ctaHeading}>Grow your business with Tukaatu.</h2>
            <p className={styles.ctaSub}>
              Join hundreds of stores already delivering across Nepal with live tracking, POD collection and full settlement visibility.
            </p>
          </div>
          <div className={styles.ctaActions}>
            <Link href="/public/merchant-register" className={styles.ctaPrimary}>
              Join as Store Partner
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main footer body ── */}
      <div className={styles.body}>
        <div className={styles.bodyInner}>

          {/* Brand column */}
          <div className={styles.brand}>
            <Link href="/" className={styles.logoWrap}>
              <Image
                src="/images/logo.png"
                alt="Tukaatu Express"
                width={130}
                height={36}
                className={styles.logoImg}
              />
            </Link>
            <p className={styles.tagline}>
              A technology-enabled logistics network connecting people and businesses across Nepal through one intelligent delivery platform.
            </p>
            <div className={styles.badges}>
              <span className={styles.badge}>🇳🇵 Nepal</span>
              <span className={styles.badge}>7 Provinces</span>
              <span className={styles.badge}>Live tracking</span>
            </div>
          </div>

          {/* Nav columns */}
          <div className={styles.navGrid}>
            {nav.map((col) => (
              <div key={col.heading} className={styles.navCol}>
                <p className={styles.navHeading}>{col.heading}</p>
                <ul className={styles.navList}>
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className={styles.navLink}>{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className={styles.bottom}>
        <div className={styles.bottomInner}>
          <span className={styles.copy}>
            © {new Date().getFullYear()} Tukaatu Express Pvt. Ltd. All rights reserved.
          </span>
          <div className={styles.bottomLinks}>
            <Link href="/contact" className={styles.bottomLink}>Privacy</Link>
            <span className={styles.dot} />
            <Link href="/contact" className={styles.bottomLink}>Terms</Link>
            <span className={styles.dot} />
            <Link href="/contact" className={styles.bottomLink}>Cookies</Link>
          </div>
          <span className={styles.madeIn}>Made for Nepal 🇳🇵</span>
        </div>
      </div>

    </footer>
  );
}
