import Link from "next/link";
import Image from "next/image";
import {
  Clock,
  Package,
  ShieldCheck,
  Zap,
} from "lucide-react";
import styles from "../components/HeroSummaryCard.module.css";

export const metadata = {
  title: "Delivery Services - Tukaatu Express Nepal",
  description:
    "Explore Tukaatu Express delivery tiers: Standard 24-48hr door-to-door, Express priority routing, and Same-Day metro delivery across Nepal.",
};

export default function ServicesPage() {
  return (
    <main className="public-page bg-white">
      {/* Full-Height Hero Section with Photographic Image */}
      <section className="public-hero public-hero--photographic public-hero--full-height">
        <div className="public-hero-photo" aria-hidden="true">
          <Image
            src="/images/experience/cinematic/pickup.webp"
            alt="Tukaatu Express Delivery Services"
            fill
            priority
            sizes="100vw"
            quality={85}
          />
        </div>

        <div className={styles.heroWrapper}>
          <div className={styles.heroGrid}>
            {/* Left Column: Core Copy */}
            <div className={styles.copyCol}>
              <Link href="/" className="public-breadcrumb">
                Tukaatu Express <span>/</span> Delivery services
              </Link>
              <p className="public-eyebrow">Delivery services</p>
              <h1>
                Every parcel.
                <br />
                <span>The right service.</span>
              </h1>
              <p className="public-hero-description">
                From everyday store orders to time-sensitive urgent parcels,
                choose a service tailored to your timeline, budget and coverage
                needs.
              </p>

              {/* Trust & Speed Micro-Badges */}
              <div className={styles.trustPills}>
                <span className={styles.trustPill}>
                  <Zap size={14} className="text-[#017196]" />
                  <span>24-48h nationwide transit</span>
                </span>
                <span className={styles.trustPill}>
                  <Clock size={14} className="text-[#ffd025]" />
                  <span>Same-day valley dispatch</span>
                </span>
                <span className={styles.trustPill}>
                  <ShieldCheck size={14} className="text-green-600" />
                  <span>Digital proof of delivery</span>
                </span>
              </div>
            </div>

            {/* Right Column: Summarized Info Card */}
            <div className={styles.summaryCard}>
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.cardBadge}>
                    <span className={styles.liveDot} /> Nationwide Network
                  </span>
                  <h2 className={styles.cardTitle}>Core Delivery Services</h2>
                  <p className={styles.cardSubtitle}>
                    Door-to-door network serving all 77 districts
                  </p>
                </div>
              </div>

              <div className={styles.infoGridSingle}>
                {/* Standard Delivery */}
                <div className={styles.infoItem}>
                  <div className={styles.itemIcon}>
                    <Package size={18} />
                  </div>
                  <div className={styles.itemText}>
                    <div className="flex items-center justify-between">
                      <span className={styles.itemLabel}>Standard Delivery</span>
                      <span className="text-[11px] font-extrabold text-[#017196] bg-[#e0f2fe] px-2 py-0.5 rounded-md">
                        24 – 48 Hours
                      </span>
                    </div>
                    <span className={styles.itemValue}>
                      Nationwide Door-to-Door
                    </span>
                    <span className={styles.itemSub}>
                      Everyday e-commerce shipments, live SMS tracking & digital POD.
                    </span>
                  </div>
                </div>

                {/* Express Delivery */}
                <div className={styles.infoItem}>
                  <div className={`${styles.itemIcon} ${styles.itemIconGold}`}>
                    <Zap size={18} />
                  </div>
                  <div className={styles.itemText}>
                    <div className="flex items-center justify-between">
                      <span className={styles.itemLabel}>Express Delivery</span>
                      <span className="text-[11px] font-extrabold text-amber-900 bg-[#ffd025]/30 px-2 py-0.5 rounded-md border border-[#ffd025]/40">
                        Priority Hub Transit
                      </span>
                    </div>
                    <span className={styles.itemValue}>
                      Expedited Queue & Movement
                    </span>
                    <span className={styles.itemSub}>
                      Priority branch handling and dedicated provincial linehaul.
                    </span>
                  </div>
                </div>

                {/* Same Day Delivery */}
                <div className={styles.infoItem}>
                  <div className={`${styles.itemIcon} ${styles.itemIconTeal}`}>
                    <Clock size={18} />
                  </div>
                  <div className={styles.itemText}>
                    <div className="flex items-center justify-between">
                      <span className={styles.itemLabel}>Same Day Delivery</span>
                      <span className="text-[11px] font-extrabold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-md">
                        Intra-Valley
                      </span>
                    </div>
                    <span className={styles.itemValue}>
                      Kathmandu Valley Express
                    </span>
                    <span className={styles.itemSub}>
                      Urgent intra-city parcels, medical items & same-day orders.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
