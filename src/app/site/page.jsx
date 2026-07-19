import Link from "next/link";
// import styles from "./page.module.css";
import Footer from "./components/footer";
import Header from "./components/header";
import styles from "./site.module.css"; // Double-check if the file name is site.module.css or page.module.css

export const metadata = {
  title: "Tukaatu Express | Courier Delivery Across Nepal",
  description:
    "Fast, reliable courier delivery, shipment tracking, merchant delivery support and POD settlement across Nepal.",
};

function Status({ text, active }) {
  return (
    <div className={`${styles.status} ${active ? styles.active : ""}`}>
      <span></span>
      {text}
    </div>
  );
}
export default function SiteHomePage() {
  return (
    <main className={styles.site}>
      <Header />

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.badge}>Fast • Reliable • Trackable</span>

          <h1>Fast, Reliable Courier Delivery Across Nepal</h1>

          <p>
            Tukaatu Express helps customers and businesses send, track and
            manage deliveries with a smarter courier system built for modern
            logistics.
          </p>

          <div className={styles.heroActions}>
            <Link href="/site/tracking" className={styles.primaryBtn}>
              Track Your Shipment
            </Link>

            <Link href="/login" className={styles.secondaryBtn}>
              Login to Dashboard
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.deliveryCard}>
            <div className={styles.cardTop}>
              <span>Live Shipment</span>
              <strong>In Transit</strong>
            </div>

            <div className={styles.routeBox}>
              <div>
                <strong>Pickup</strong>
                <span>Kathmandu</span>
              </div>
              <div className={styles.routeLine}></div>
              <div>
                <strong>Delivery</strong>
                <span>Lalitpur</span>
              </div>
            </div>

            <div className={styles.statusList}>
              <Status text="Shipment created" active />
              <Status text="Parcel picked up" active />
              <Status text="Out for delivery" active />
              <Status text="Delivered" />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.stats}>
        <Stat title="Fast Pickup" text="Quick parcel collection and delivery workflow." />
        <Stat title="Live Tracking" text="Track shipment status from pickup to delivery." />
        <Stat title="Merchant Support" text="Built for sellers, stores and businesses." />
        <Stat title="POD Ready" text="Manage cash collection and settlement." />
      </section>

      <section id="services" className={styles.section}>
        <div className={styles.sectionHeader}>
          <span>Our Services</span>
          <h2>Courier services designed for modern delivery</h2>
          <p>
            From single parcel delivery to merchant logistics, Tukaatu Express
            supports reliable delivery operations for businesses and customers.
          </p>
        </div>

        <div className={styles.grid}>
          <Service title="Express Delivery" text="Fast delivery support for urgent parcels and customer orders." />
          <Service title="Merchant Parcel Delivery" text="Delivery workflow for online sellers and retail businesses." />
          <Service title="Branch Dispatch" text="Move parcels between branches, hubs and delivery zones." />
          <Service title="POD Collection" text="Track cash collection, confirmation and merchant settlement." />
          <Service title="Pickup Management" text="Create and manage pickup requests from customers and merchants." />
          <Service title="Shipment Tracking" text="Keep customers informed with clear delivery status updates." />
        </div>
      </section>

      <section className={styles.howItWorks}>
        <div className={styles.sectionHeader}>
          <span>How It Works</span>
          <h2>Simple delivery flow from booking to delivery</h2>
        </div>

        <div className={styles.steps}>
          <Step number="01" title="Create Shipment" text="Customer or merchant creates a parcel request." />
          <Step number="02" title="Pickup or Drop" text="Parcel is collected or dropped at a branch." />
          <Step number="03" title="Dispatch & Track" text="Shipment is dispatched and tracked in real time." />
          <Step number="04" title="Deliver & Settle" text="Delivery is completed and POD is settled." />
        </div>
      </section>

      <section className={styles.merchant}>
        <div>
          <span className={styles.badge}>For Businesses</span>
          <h2>Built for online sellers and growing businesses</h2>
          <p>
            Tukaatu Express gives merchants a simple dashboard to create
            shipments, request pickups, track POD, view invoices and manage
            delivery operations from one place.
          </p>

          <ul>
            <li>Bulk shipment creation</li>
            <li>POD tracking and settlement</li>
            <li>Pickup request management</li>
            <li>Invoices and delivery reports</li>
            <li>Delivery status updates</li>
            <li>Branch and rider workflow</li>
          </ul>

          <Link href="/login" className={styles.primaryBtn}>
            Merchant Login
          </Link>
        </div>

        <div className={styles.panel}>
          <h3>Merchant Dashboard</h3>
          <div className={styles.panelRow}>
            <span>Total Shipments</span>
            <strong>1,248</strong>
          </div>
          <div className={styles.panelRow}>
            <span>Out for Delivery</span>
            <strong>86</strong>
          </div>
          <div className={styles.panelRow}>
            <span>POD Pending</span>
            <strong>NPR 245,000</strong>
          </div>
          <div className={styles.panelRow}>
            <span>Settled</span>
            <strong>NPR 1.2M</strong>
          </div>
        </div>
      </section>

      <section id="coverage" className={styles.section}>
        <div className={styles.sectionHeader}>
          <span>Coverage</span>
          <h2>Serving Kathmandu and expanding across Nepal</h2>
          <p>
            Tukaatu Express is built to support delivery operations across major
            cities, branches and delivery zones.
          </p>
        </div>

        <div className={styles.chips}>
          {[
            "Kathmandu",
            "Lalitpur",
            "Bhaktapur",
            "Pokhara",
            "Chitwan",
            "Biratnagar",
            "Butwal",
            "Nepalgunj",
          ].map((city) => (
            <span key={city}>{city}</span>
          ))}
        </div>
      </section>

      <section className={styles.cta}>
        <h2>Ready to manage deliveries smarter?</h2>
        <p>
          Login to the Tukaatu Express dashboard to manage shipments, merchants,
          riders, POD and delivery operations.
        </p>

        <div className={styles.heroActions}>
          <Link href="/login" className={styles.primaryBtn}>
            Login to Dashboard
          </Link>
          <Link href="/site/contact" className={styles.secondaryBtn}>
            Contact Tukaatu Express
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Stat({ title, text }) {
  return (
    <div className={styles.statCard}>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function Service({ title, text }) {
  return (
    <div className={styles.serviceCard}>
      <div className={styles.icon}>↗</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function Step({ number, title, text }) {
  return (
    <div className={styles.stepCard}>
      <span>{number}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}