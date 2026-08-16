import DeliveryExperience from "./components/experience/DeliveryExperience";
import Footer from "./components/Footer";
import Header from "./components/Header";
import styles from "./page.module.css";

export const metadata = {
  title: "Tukaatu Express — Nepal Delivered. Simply.",
  description:
    "Fast, reliable and trackable parcel delivery across Nepal with Tukaatu Express.",
};

export default function SiteHome() {
  return (
    
    <main className={styles.page}>
      <Header transparent />
      <DeliveryExperience />

      <section className={styles.afterExperience}>
        <div className={styles.afterGrid} />

        <div className={styles.afterContent}>
          <div className={styles.eyebrow}>
            <span />
            ONE NETWORK. EVERY DELIVERY.
          </div>

          <h2>
            Built for the way
            <br />
            <strong>Nepal moves.</strong>
          </h2>

          <p>
            Whether you are sending a parcel across Kathmandu or moving
            products from Kathmandu to Pokhara, Tukaatu Express connects the
            entire delivery journey through one intelligent network.
          </p>

          <div className={styles.serviceCards}>
            <a href="/services" className={styles.serviceCard}>
              <span className={styles.serviceIcon}>01</span>
              <strong>Express Delivery</strong>
              <small>Fast movement for urgent shipments</small>
              <span className={styles.arrow}>→</span>
            </a>

            <a href="/business" className={styles.serviceCard}>
              <span className={styles.serviceIcon}>02</span>
              <strong>Merchant Platform</strong>
              <small>Ship, track and settle — all in one place</small>
              <span className={styles.arrow}>→</span>
            </a>

            <a href="/franchise" className={styles.serviceCard}>
              <span className={styles.serviceIcon}>03</span>
              <strong>Franchise Network</strong>
              <small>Build the next generation delivery network</small>
              <span className={styles.arrow}>→</span>
            </a>
          </div>
        </div>
      </section>
    <Footer/>
    </main>
  );
}