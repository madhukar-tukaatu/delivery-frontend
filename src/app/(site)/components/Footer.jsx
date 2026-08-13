import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerTop}>
        <div className={styles.brand}>
          <div className={styles.logoMark}>T</div>

          <div>
            <strong>TUKAATU EXPRESS</strong>
            <span>Nepal Delivered. Simply.</span>
          </div>
        </div>

        <p>
          A connected delivery network built to move parcels across Nepal
          faster, smarter and with complete visibility.
        </p>
      </div>

      <div className={styles.footerLinks}>
        <div>
          <strong>Company</strong>
          <Link href="/about">About</Link>
          <Link href="/services">Services</Link>
          <Link href="/coverage">Coverage</Link>
          <Link href="/contact">Contact</Link>
        </div>

        <div>
          <strong>Business</strong>
          <Link href="/business">For Business</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/franchise">Franchise</Link>
        </div>

        <div>
          <strong>Support</strong>
          <Link href="/track">Track Parcel</Link>
          <Link href="/contact">Help Center</Link>
          <Link href="/contact">Contact Support</Link>
        </div>
      </div>

      <div className={styles.bottom}>
        <span>© {new Date().getFullYear()} Tukaatu Express.</span>
        <span>Made for Nepal.</span>
      </div>
    </footer>
  );
}