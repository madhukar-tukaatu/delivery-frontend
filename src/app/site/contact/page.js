import Link from "next/link";
import styles from "../page.module.css";

export const metadata = {
  title: "Contact | Tukaatu Express",
  description: "Contact Tukaatu Express for courier delivery support.",
};

export default function ContactPage() {
  return (
    <main className={styles.site}>
      <header className={styles.header}>
        <Link href="/site" className={styles.logoWrap}>
          <div className={styles.logo}>T</div>
          <div>
            <strong>Tukaatu Express</strong>
            <span>Courier Delivery Gateway</span>
          </div>
        </Link>

        <Link href="/login" className={styles.loginBtn}>
          Login
        </Link>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span>Contact</span>
          <h2>Contact Tukaatu Express</h2>
          <p>
            For delivery support, merchant onboarding, branch operations or
            shipment questions, contact the Tukaatu Express team.
          </p>
        </div>

        <div className={styles.grid}>
          <div className={styles.serviceCard}>
            <h3>Customer Support</h3>
            <p>Get help with parcel tracking and delivery questions.</p>
          </div>

          <div className={styles.serviceCard}>
            <h3>Merchant Support</h3>
            <p>Contact us for business delivery and COD settlement support.</p>
          </div>

          <div className={styles.serviceCard}>
            <h3>Branch Operations</h3>
            <p>Manage dispatch, pickup and branch-level delivery workflow.</p>
          </div>
        </div>
      </section>
    </main>
  );
}