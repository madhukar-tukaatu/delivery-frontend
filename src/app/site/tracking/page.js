import Link from "next/link";
import styles from "../page.module.css";

export const metadata = {
  title: "Track Shipment | Tukaatu Express",
  description: "Track your Tukaatu Express shipment.",
};

export default function TrackingPage() {
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

      <section className={styles.cta}>
        <span className={styles.badge}>Shipment Tracking</span>
        <h2>Track your parcel</h2>
        <p>
          Enter your tracking number to check delivery status. Tracking system
          can be connected with the live backend API later.
        </p>

        <form
          style={{
            maxWidth: 580,
            margin: "30px auto 0",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            placeholder="Enter tracking number"
            style={{
              flex: 1,
              minWidth: 240,
              padding: "15px 16px",
              borderRadius: 14,
              border: "1px solid #e5e7eb",
              fontSize: 16,
            }}
          />

          <button
            type="button"
            className={styles.primaryBtn}
            style={{ border: 0, cursor: "pointer" }}
          >
            Track Shipment
          </button>
        </form>
      </section>
    </main>
  );
}