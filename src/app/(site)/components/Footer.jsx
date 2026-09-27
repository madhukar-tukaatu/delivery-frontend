import Link from "next/link";
import Image from "next/image";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer} aria-label="Tukaatu Express footer">
      <div className={styles.inner}>
        <div className={styles.footerGrid}>
          {/* Column 1: Brand */}
          <div className={styles.brandCol}>
            <Link href="/" className={styles.logoWrap}>
              <Image
                src="/images/logo.png"
                alt="Tukaatu Express"
                width={135}
                height={38}
                className={styles.logoImg}
              />
            </Link>
            <p className={styles.brandDesc}>
              Nepal's Next-Generation Logistics Network. Unifying live parcel
              tracking, same-day POD cash settlement, and nationwide door-to-door
              delivery into one platform.
            </p>
            <div className={styles.statusBadge}>
              <span className={styles.statusDot} /> System Status: 100% Operational
            </div>
          </div>

          {/* Column 2: Navigation */}
          <div className={styles.navCol}>
            <p className={styles.colTitle}>Navigation</p>
            <div className={styles.linkList}>
              <Link href="/about" className={styles.link}>About Tukaatu</Link>
              <Link href="/services" className={styles.link}>Delivery Services</Link>
              <Link href="/pricing" className={styles.link}>Pricing Calculator</Link>
              <Link href="/franchise" className={styles.link}>Franchise Network</Link>
              <Link href="/contact" className={styles.link}>Contact Us</Link>
            </div>
          </div>

          {/* Column 3: Services (links directly to service details on the services page) */}
          <div className={styles.navCol}>
            <p className={styles.colTitle}>Services</p>
            <div className={styles.linkList}>
              <Link href="/services#standard" className={styles.link}>Standard Delivery</Link>
              <Link href="/services#express" className={styles.link}>Express Delivery</Link>
              <Link href="/services#same-day" className={styles.link}>Same Day Delivery</Link>
              <Link href="/services#pod" className={styles.link}>POD & Cash Settlement</Link>
              <Link href="/tracking" className={styles.link}>Smart Parcel Tracking</Link>
            </div>
          </div>

          {/* Column 4: Portals & Access */}
          <div className={styles.navCol}>
            <p className={styles.colTitle}>Portals & Access</p>
            <div className={styles.linkList}>
              <Link href="/login" className={styles.link}>Merchant Portal →</Link>
              <Link href="/public/merchant-register" className={styles.link}>Register New Store</Link>
              <Link href="/franchise/apply" className={styles.link}>Franchise Application</Link>
              <Link href="/contact" className={styles.link}>Help & Support</Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <div className={styles.copyright}>
            © {new Date().getFullYear()} Tukaatu Express. All rights reserved.
          </div>
          <div className={styles.bottomLinks}>
            <Link href="/privacy-policy" className={styles.bottomLink}>Privacy Policy</Link>
            <span className={styles.dot} />
            <Link href="/terms-conditions" className={styles.bottomLink}>Terms of Service</Link>
            <span className={styles.dot} />
            <Link href="/contact" className={styles.bottomLink}>Contact</Link>
            <span className={styles.dot} />
            <span className={styles.madeIn}>Made for Nepal 🇳🇵</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
