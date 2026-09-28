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
                  <Coins size={14} className="text-[#ffd025]" />
                  <span>0% COD remittance fees</span>
                </span>
                <span className={heroStyles.trustPill}>
                  <Scale size={14} className="text-[#017196]" />
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
                    <span className={heroStyles.liveDot} /> Pricing Guarantees
                  </span>
                  <h2 className={heroStyles.cardTitle}>Fair, Transparent Billing</h2>
                  <p className={heroStyles.cardSubtitle}>
                    Honest delivery costs designed for Nepali businesses
                  </p>
                </div>
              </div>

              <div className={heroStyles.infoGrid}>
                {/* Zero Hidden Fees */}
                <div className={heroStyles.infoItem}>
                  <div className={heroStyles.itemIcon}>
                    <ShieldCheck size={18} />
                  </div>
                  <div className={heroStyles.itemText}>
                    <span className={heroStyles.itemLabel}>Upfront Pricing</span>
                    <span className={heroStyles.itemValue}>Zero Hidden Fees</span>
                    <span className={heroStyles.itemSub}>
                      No surprise fuel or terminal surcharges.
                    </span>
                  </div>
                </div>

                {/* 0% COD Remittance */}
                <div className={heroStyles.infoItem}>
                  <div className={`${heroStyles.itemIcon} ${heroStyles.itemIconGold}`}>
                    <Coins size={18} />
                  </div>
                  <div className={heroStyles.itemText}>
                    <span className={heroStyles.itemLabel}>COD Remittance</span>
                    <span className={heroStyles.itemValue}>0% Settlement Fee</span>
                    <span className={heroStyles.itemSub}>
                      Automated bank payouts for merchants.
                    </span>
                  </div>
                </div>

                {/* Dynamic Calculator */}
                <div className={heroStyles.infoItem}>
                  <div className={`${heroStyles.itemIcon} ${heroStyles.itemIconTeal}`}>
                    <Calculator size={18} />
                  </div>
                  <div className={heroStyles.itemText}>
                    <span className={heroStyles.itemLabel}>Fare Calculator</span>
                    <span className={heroStyles.itemValue}>Dynamic Estimation</span>
                    <span className={heroStyles.itemSub}>
                      Instant door-to-door quote across 77 districts.
                    </span>
                  </div>
                </div>

                {/* Commercial Volume */}
                <div className={heroStyles.infoItem}>
                  <div className={`${heroStyles.itemIcon} ${heroStyles.itemIconGreen}`}>
                    <Truck size={18} />
                  </div>
                  <div className={heroStyles.itemText}>
                    <span className={heroStyles.itemLabel}>Merchant Volume</span>
                    <span className={heroStyles.itemValue}>Bulk Shipping Rates</span>
                    <span className={heroStyles.itemSub}>
                      Volume discounts for regular store shippers.
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
