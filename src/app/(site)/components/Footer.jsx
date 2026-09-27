import Link from "next/link";
import Image from "next/image";
import styles from "./Footer.module.css";

const navGroups = [
  {
    heading: "Company",
    links: [
      { label: "About us", href: "/about" },
      { label: "Delivery Services", href: "/services" },
      { label: "Pricing Calculator", href: "/pricing" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    heading: "Merchants & Partners",
    links: [
      { label: "Join as Partner", href: "/public/merchant-register" },
      { label: "Business Logistics", href: "/business" },
      { label: "Franchise Network", href: "/franchise" },
      { label: "Apply for Franchise", href: "/franchise/apply" },
      { label: "Merchant Sign In", href: "/login" },
    ],
  },
  {
    heading: "Support & Legal",
    links: [
      { label: "Track a Parcel", href: "/tracking" },
      { label: "Help & Support", href: "/contact" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms & Conditions", href: "/terms-conditions" },
    ],
  },
];

export default function Footer({ showCta = true } = {}) {
  return (
    <footer className={styles.footer} aria-label="Tukaatu Express footer">
      {/* ── CTA Band ── */}
      {showCta && (
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
                Join as Store Partner →
              </Link>
              <Link href="/contact" className={styles.ctaSecondary}>
                Get in Touch
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Footer Body ── */}
      <div className={styles.body}>
        <div className={styles.bodyInner}>
          {/* Brand Column */}
          <div className={styles.brand}>
            <Link href="/" className={styles.logoWrap}>
              <Image
                src="/images/logo.png"
                alt="Tukaatu Express"
                width={140}
                height={40}
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

          {/* Navigation Columns */}
          <div className={styles.navGrid}>
            {navGroups.map((group) => (
              <div key={group.heading} className={styles.navCol}>
                <p className={styles.navHeading}>{group.heading}</p>
                <ul className={styles.navList}>
                  {group.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link href={link.href} className={styles.navLink}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className={styles.bottom}>
        <div className={styles.bottomInner}>
          <span className={styles.copy}>
            © {new Date().getFullYear()} Tukaatu Express Pvt. Ltd. All rights reserved.
          </span>
          <div className={styles.bottomLinks}>
            <Link href="/privacy-policy" className={styles.bottomLink}>
              Privacy Policy
            </Link>
            <span className={styles.dot} />
            <Link href="/terms-conditions" className={styles.bottomLink}>
              Terms & Conditions
            </Link>
            <span className={styles.dot} />
            <Link href="/contact" className={styles.bottomLink}>
              Contact
            </Link>
          </div>
          <span className={styles.madeIn}>Made for Nepal 🇳🇵</span>
        </div>
      </div>
    </footer>
  );
}
