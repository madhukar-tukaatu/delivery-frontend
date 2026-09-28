import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  DollarSign,
  Headphones,
  MapPinned,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import styles from "../components/HeroSummaryCard.module.css";

export const metadata = {
  title: "Franchise Opportunity - Tukaatu Express Nepal",
  description:
    "Partner with Tukaatu Express. Launch an exclusive delivery branch in your district with protected territory, tech platform, and nationwide volume.",
};

export default function FranchisePage() {
  return (
    <main className="public-page bg-white">
      {/* Full-Height Hero Section with Photographic Image */}
      <section className="public-hero public-hero--photographic public-hero--full-height">
        <div className="public-hero-photo" aria-hidden="true">
          <Image
            src="/images/experience/cinematic/origin.webp"
            alt="Tukaatu Express Franchise Opportunity"
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
                Tukaatu Express <span>/</span> Partner with Tukaatu
              </Link>
              <p className="public-eyebrow">Partner with Tukaatu</p>
              <h1>
                Local knowledge.
                <br />
                <span>Nationwide ambition.</span>
              </h1>
              <p className="public-hero-description">
                Build a delivery business in your community, supported by
                Tukaatu’s technology, operational playbooks and growing
                nationwide merchant network.
              </p>

              <div className="public-hero-actions">
                <Link
                  className="public-button"
                  href="/contact?subject=Franchise%20Application#contact-form"
                >
                  Apply for a franchise
                  <ArrowRight size={18} />
                </Link>
                <Link
                  className="public-button public-button--outline"
                  href="/contact"
                >
                  <Headphones size={18} />
                  Contact partner desk
                  <ArrowRight size={18} />
                </Link>
              </div>

              {/* Trust & Model Micro-Badges */}
              <div className={styles.trustPills}>
                <span className={styles.trustPill}>
                  <ShieldCheck size={14} className="text-green-600" />
                  <span>Exclusive territory rights</span>
                </span>
                <span className={styles.trustPill}>
                  <TrendingUp size={14} className="text-[#017196]" />
                  <span>Multiple revenue streams</span>
                </span>
                <span className={styles.trustPill}>
                  <Building2 size={14} className="text-[#ffd025]" />
                  <span>Tech platform & training included</span>
                </span>
              </div>
            </div>

            {/* Right Column: Summarized Franchise Info Card */}
            <div className={styles.summaryCard}>
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.cardBadge}>
                    <span className={styles.liveDot} /> Franchise Opportunity
                  </span>
                  <h2 className={styles.cardTitle}>Franchise Model & Pillars</h2>
                  <p className={styles.cardSubtitle}>
                    Launch an authorized logistics branch in your district
                  </p>
                </div>
              </div>

              <div className={styles.infoGrid}>
                {/* Territory */}
                <div className={styles.infoItem}>
                  <div className={styles.itemIcon}>
                    <MapPinned size={18} />
                  </div>
                  <div className={styles.itemText}>
                    <span className={styles.itemLabel}>Protected Territory</span>
                    <span className={styles.itemValue}>Exclusive Local Zone</span>
                    <span className={styles.itemSub}>
                      Protected postal coverage & local commercial monopoly.
                    </span>
                  </div>
                </div>

                {/* Revenue */}
                <div className={styles.infoItem}>
                  <div className={`${styles.itemIcon} ${styles.itemIconGold}`}>
                    <DollarSign size={18} />
                  </div>
                  <div className={styles.itemText}>
                    <span className={styles.itemLabel}>Revenue Streams</span>
                    <span className={styles.itemValue}>Deliveries & POD</span>
                    <span className={styles.itemSub}>
                      Earn on shipments, express upgrades & cash collection fees.
                    </span>
                  </div>
                </div>

                {/* Technology */}
                <div className={styles.infoItem}>
                  <div className={`${styles.itemIcon} ${styles.itemIconTeal}`}>
                    <Building2 size={18} />
                  </div>
                  <div className={styles.itemText}>
                    <span className={styles.itemLabel}>Platform & Apps</span>
                    <span className={styles.itemValue}>Full Tech Suite</span>
                    <span className={styles.itemSub}>
                      Rider app, live routing, merchant portal & digital bills.
                    </span>
                  </div>
                </div>

                {/* Support */}
                <div className={styles.infoItem}>
                  <div className={`${styles.itemIcon} ${styles.itemIconGreen}`}>
                    <Users size={18} />
                  </div>
                  <div className={styles.itemText}>
                    <span className={styles.itemLabel}>Training & Growth</span>
                    <span className={styles.itemValue}>Ongoing Playbooks</span>
                    <span className={styles.itemSub}>
                      Staff onboarding, operational manuals & dedicated manager.
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Quick Actions */}
              <div className={styles.cardFooter}>
                <Link
                  href="/contact?subject=Franchise%20Application#contact-form"
                  className={styles.cardActionBtn}
                >
                  <CheckCircle2 size={16} />
                  Start Territory Application
                </Link>
                <Link href="/contact" className={styles.cardSecondaryBtn}>
                  <Headphones size={16} />
                  Enquiry Desk
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
