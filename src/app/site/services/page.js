import Link from "next/link";
import styles from "../page.module.css";

export const metadata = {
  title: "Courier Services | Tukaatu Express",
  description: "Courier, merchant delivery, POD and parcel tracking services.",
};

export default function ServicesPage() {
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
          <span>Services</span>
          <h2>Delivery services for customers and businesses</h2>
          <p>
            Tukaatu Express supports parcel delivery, pickup requests, merchant
            logistics, POD collection and branch dispatch operations.
          </p>
        </div>

        <div className={styles.grid}>
          <div className={styles.serviceCard}>
            <h3>Express Delivery</h3>
            <p>Fast delivery support for urgent and regular parcels.</p>
          </div>

          <div className={styles.serviceCard}>
            <h3>Merchant Delivery</h3>
            <p>Delivery workflow for online shops and business sellers.</p>
          </div>

          <div className={styles.serviceCard}>
            <h3>POD Collection</h3>
            <p>Cash collection, tracking and merchant settlement support.</p>
          </div>

          <div className={styles.serviceCard}>
            <h3>Pickup Requests</h3>
            <p>Manage parcel pickups from customers and merchant locations.</p>
          </div>

          <div className={styles.serviceCard}>
            <h3>Branch Dispatch</h3>
            <p>Move parcels between hubs, branches and delivery zones.</p>
          </div>

          <div className={styles.serviceCard}>
            <h3>Shipment Tracking</h3>
            <p>Track parcel progress from creation to final delivery.</p>
          </div>
        </div>
      </section>
    </main>
  );
}