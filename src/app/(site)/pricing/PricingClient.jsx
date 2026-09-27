"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Calculator,
  Coins,
  DollarSign,
  HelpCircle,
  MapPin,
  Scale,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import PricingCalculator from "./pricing-calculator";
import drawerStyles from "./PricingDrawer.module.css";
import heroStyles from "../components/HeroSummaryCard.module.css";

export default function PricingClient() {
  const [open, setOpen] = useState(false);

  // Close drawer on Escape key press
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <main className="public-page bg-white">
      {/* Full-Height Hero Section with Photographic Image */}
      <section className="public-hero public-hero--photographic public-hero--full-height">
        <div className="public-hero-photo" aria-hidden="true">
          <Image
            src="/images/experience/cinematic/store.webp"
            alt="Tukaatu Express Pricing"
            fill
            priority
            sizes="100vw"
            quality={85}
          />
        </div>

        <div className={heroStyles.heroWrapper}>
          <div className={heroStyles.heroGrid}>
            {/* Left Column: Core Copy & CTAs */}
            <div className={heroStyles.copyCol}>
              <Link href="/" className="public-breadcrumb">
                Tukaatu Express <span>/</span> Pricing & calculator
              </Link>
              <p className="public-eyebrow">Pricing & calculator</p>
              <h1>
                Know the price.
                <br />
                <span>Then make your move.</span>
              </h1>
              <p className="public-hero-description">
                Transparent door-to-door delivery tariffs across Nepal in NPR.
                Calculate weight slabs, express upgrades and COD settlements
                with zero hidden fees.
              </p>

              <div className="public-hero-actions">
                <button
                  type="button"
                  className="public-button"
                  onClick={() => setOpen(true)}
                  style={{ cursor: "pointer", fontFamily: "inherit" }}
                >
                  <Calculator size={18} />
                  Calculate price
                  <ArrowRight size={18} />
                </button>
                <Link
                  className="public-button public-button--outline"
                  href="/contact"
                >
                  <Truck size={18} />
                  Bulk rates
                  <ArrowRight size={18} />
                </Link>
              </div>

              {/* Trust & Transparency Micro-Badges */}
              <div className={heroStyles.trustPills}>
                <span className={heroStyles.trustPill}>
                  <Coins size={14} className="text-amber-600" />
                  <span>0% COD remittance fees</span>
                </span>
                <span className={heroStyles.trustPill}>
                  <Scale size={14} className="text-[#027196]" />
                  <span>Transparent weight slabs</span>
                </span>
                <span className={heroStyles.trustPill}>
                  <ShieldCheck size={14} className="text-green-600" />
                  <span>No hidden surcharge</span>
                </span>
              </div>
            </div>

            {/* Right Column: Summarized Pricing Info Card */}
            <div className={heroStyles.summaryCard}>
              <div className={heroStyles.cardHeader}>
                <div>
                  <span className={heroStyles.cardBadge}>
                    <span className={heroStyles.liveDot} /> Transparent Tariffs
                  </span>
                  <h2 className={heroStyles.cardTitle}>Base Rate Slabs</h2>
                  <p className={heroStyles.cardSubtitle}>
                    First 1 kg door-to-door delivery starting fares
                  </p>
                </div>
              </div>

              <div className={heroStyles.infoGrid}>
                {/* Local Valley */}
                <div className={heroStyles.infoItem}>
                  <div className={heroStyles.itemIcon}>
                    <MapPin size={18} />
                  </div>
                  <div className={heroStyles.itemText}>
                    <span className={heroStyles.itemLabel}>Inside Valley</span>
                    <span className={heroStyles.itemValue}>From Rs. 70</span>
                    <span className={heroStyles.itemSub}>
                      Ring Road • Same / Next Day
                    </span>
                  </div>
                </div>

                {/* Suburbs */}
                <div className={heroStyles.infoItem}>
                  <div className={`${heroStyles.itemIcon} ${heroStyles.itemIconTeal}`}>
                    <Truck size={18} />
                  </div>
                  <div className={heroStyles.itemText}>
                    <span className={heroStyles.itemLabel}>Valley Suburbs</span>
                    <span className={heroStyles.itemValue}>From Rs. 100</span>
                    <span className={heroStyles.itemSub}>
                      Bhaktapur, Lalitpur semi-urban
                    </span>
                  </div>
                </div>

                {/* Major Hub Cities */}
                <div className={heroStyles.infoItem}>
                  <div className={`${heroStyles.itemIcon} ${heroStyles.itemIconGold}`}>
                    <DollarSign size={18} />
                  </div>
                  <div className={heroStyles.itemText}>
                    <span className={heroStyles.itemLabel}>Major Cities</span>
                    <span className={heroStyles.itemValue}>From Rs. 140</span>
                    <span className={heroStyles.itemSub}>
                      Pokhara, Biratnagar, Butwal
                    </span>
                  </div>
                </div>

                {/* Remote Districts */}
                <div className={heroStyles.infoItem}>
                  <div className={`${heroStyles.itemIcon} ${heroStyles.itemIconGreen}`}>
                    <Scale size={18} />
                  </div>
                  <div className={heroStyles.itemText}>
                    <span className={heroStyles.itemLabel}>Remote / Hill</span>
                    <span className={heroStyles.itemValue}>From Rs. 200</span>
                    <span className={heroStyles.itemSub}>
                      All 77 districts • Hub pickup
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Quick Actions */}
              <div className={heroStyles.cardFooter}>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className={heroStyles.cardActionBtn}
                >
                  <Calculator size={16} />
                  Open Live Fare Calculator
                </button>
                <Link href="/contact" className={heroStyles.cardSecondaryBtn}>
                  <HelpCircle size={16} />
                  Rate Help
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Side-of-Image Slide-in Calculator Drawer (opens only when clicked) */}
      {open && (
        <>
          <div
            className={drawerStyles.drawerBackdrop}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside
            className={drawerStyles.drawerPanel}
            aria-label="Delivery fare calculator"
            role="dialog"
            aria-modal="true"
          >
            <div className={drawerStyles.drawerHeader}>
              <div className={drawerStyles.drawerTitleWrap}>
                <span className={drawerStyles.drawerEyebrow}>
                  <span className={drawerStyles.liveDot} /> Instant Fare
                  Calculator
                </span>
                <h2 className={drawerStyles.drawerTitle}>
                  Calculate Delivery Price
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={drawerStyles.closeBtn}
                aria-label="Close calculator"
              >
                <X size={18} />
              </button>
            </div>

            <div className={drawerStyles.drawerBody}>
              <PricingCalculator />
            </div>
          </aside>
        </>
      )}
    </main>
  );
}
