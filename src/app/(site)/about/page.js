import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import styles from "../components/HeroSummaryCard.module.css";

export const metadata = {
  title: "About Tukaatu Express - Nepal's Delivery Network",
  description:
    "Learn about Tukaatu Express, our nationwide delivery network, core operational values, and commitment to connecting communities across Nepal.",
};

export default function AboutPage() {
  return (
    <main className="public-page bg-white">
      {/* Full-Height Hero Section with Photographic Image */}
      <section className="public-hero public-hero--photographic public-hero--full-height">
        <div className="public-hero-photo" aria-hidden="true">
          <Image
            src="/images/experience/cinematic/door.webp"
            alt="About Tukaatu Express"
            fill
            priority
            sizes="100vw"
            quality={85}
          />
        </div>

        <div className={styles.heroWrapper}>
          <div className={styles.heroGrid}>
            {/* Left Column: Core Copy & CTAs */}
            <div className={styles.copyCol}>
              <Link href="/" className="public-breadcrumb">
                Tukaatu Express <span>/</span> About Tukaatu
              </Link>
              <p className="public-eyebrow">Built for Nepal</p>
              <h1>
                Built in Nepal.
                <br />
                <span>Built around people.</span>
              </h1>
              <p className="public-hero-description">
                We connect local enterprises, independent merchants and dispatch
                riders through a dependable, technology-enabled logistics network
                built specifically for Nepal.
              </p>

              <div className="public-hero-actions">
                <Link className="public-button" href="/services">
                  <Truck size={18} />
                  Explore our services
                  <ArrowRight size={18} />
                </Link>
                <Link
                  className="public-button public-button--outline"
                  href="/franchise"
                >
                  <Building2 size={18} />
                  Partner with us
                  <ArrowRight size={18} />
                </Link>
              </div>

              {/* Trust & Network Micro-Badges */}
              <div className={styles.trustPills}>
                <span className={styles.trustPill}>
                  <Zap size={14} className="text-[#027196]" />
                  <span>99.4% on-time delivery rate</span>
                </span>
                <span className={styles.trustPill}>
                  <MapPin size={14} className="text-amber-600" />
                  <span>All 77 districts covered</span>
                </span>
                <span className={styles.trustPill}>
                  <HeartHandshake size={14} className="text-green-600" />
                  <span>Community-driven team</span>
                </span>
              </div>
            </div>

            {/* Right Column: Summarized About Info Card */}
            <div className={styles.summaryCard}>
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.cardBadge}>
                    <span className={styles.liveDot} /> Network & Vision
                  </span>
                  <h2 className={styles.cardTitle}>Tukaatu at a Glance</h2>
                  <p className={styles.cardSubtitle}>
                    Empowering commerce from Mechi to Mahakali
                  </p>
                </div>
              </div>

              <div className={styles.infoGrid}>
                {/* 77 Districts */}
                <div className={styles.infoItem}>
                  <div className={styles.itemIcon}>
                    <MapPin size={18} />
                  </div>
                  <div className={styles.itemText}>
                    <span className={styles.itemLabel}>Nationwide Reach</span>
                    <span className={styles.itemValue}>All 77 Districts</span>
                    <span className={styles.itemSub}>
                      Connecting valley metros and remote provincial hubs.
                    </span>
                  </div>
                </div>

                {/* Reliability */}
                <div className={styles.infoItem}>
                  <div className={`${styles.itemIcon} ${styles.itemIconGold}`}>
                    <ShieldCheck size={18} />
                  </div>
                  <div className={styles.itemText}>
                    <span className={styles.itemLabel}>Reliability Rate</span>
                    <span className={styles.itemValue}>99.4% Handover Success</span>
                    <span className={styles.itemSub}>
                      Digital proof of delivery & verified milestone tracking.
                    </span>
                  </div>
                </div>

                {/* Tech First */}
                <div className={styles.infoItem}>
                  <div className={`${styles.itemIcon} ${styles.itemIconTeal}`}>
                    <Zap size={18} />
                  </div>
                  <div className={styles.itemText}>
                    <span className={styles.itemLabel}>Technology-First</span>
                    <span className={styles.itemValue}>Live Parcel GPS</span>
                    <span className={styles.itemSub}>
                      Real-time updates, SMS alerts & automated billing.
                    </span>
                  </div>
                </div>

                {/* Local Teams */}
                <div className={styles.infoItem}>
                  <div className={`${styles.itemIcon} ${styles.itemIconGreen}`}>
                    <Users size={18} />
                  </div>
                  <div className={styles.itemText}>
                    <span className={styles.itemLabel}>Local Community</span>
                    <span className={styles.itemValue}>Franchise Partners</span>
                    <span className={styles.itemSub}>
                      Local entrepreneurs & riders who know their terrain best.
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Quick Actions */}
              <div className={styles.cardFooter}>
                <Link href="/services" className={styles.cardActionBtn}>
                  <Truck size={16} />
                  View All Services
                </Link>
                <Link href="/contact" className={styles.cardSecondaryBtn}>
                  <CheckCircle2 size={16} />
                  Get in Touch
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
