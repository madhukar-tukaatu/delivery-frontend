"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";
import PricingCalculator from "./pricing-calculator";
import styles from "./PricingDrawer.module.css";

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

        <div className="public-hero-inner">
          {/* Left Column: Copy */}
          <div className="public-hero-copy">
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
              Choose your route, service and parcel details for an instant
              door-to-door delivery estimate in NPR across Nepal.
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
                href="/pricing/info"
              >
                Pricing Info
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          {/* Right Column (Side of the image): Interactive Card trigger */}
          <div className="hidden lg:block">
            <div className={styles.heroCard}>
              <span className={styles.heroCardBadge}>
                <span className={styles.liveDot} /> Instant Fare Engine
              </span>
              <h3 className={styles.heroCardTitle}>Delivery Fare Estimator</h3>
              <p className={styles.heroCardDesc}>
                Real-time door-to-door calculation based on distance, weight, and
                service urgency across 77 districts.
              </p>
              <ul className={styles.heroCardList}>
                <li className={styles.heroCardItem}>
                  <CheckCircle2 size={16} className="text-[#027196]" />
                  Base rate starting at Rs. 70 inside valley
                </li>
                <li className={styles.heroCardItem}>
                  <CheckCircle2 size={16} className="text-[#027196]" />
                  Automated 1% Cash on Delivery (COD) settlement
                </li>
                <li className={styles.heroCardItem}>
                  <CheckCircle2 size={16} className="text-[#027196]" />
                  Express & same-day delivery options
                </li>
              </ul>
              <button
                type="button"
                className={styles.heroCardBtn}
                onClick={() => setOpen(true)}
              >
                Open Calculator <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Side-of-Image Slide-in Calculator Drawer (opens only when clicked) */}
      {open && (
        <>
          <div
            className={styles.drawerBackdrop}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside
            className={styles.drawerPanel}
            aria-label="Delivery fare calculator"
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.drawerHeader}>
              <div className={styles.drawerTitleWrap}>
                <span className={styles.drawerEyebrow}>
                  <span className={styles.liveDot} /> Instant Fare Calculator
                </span>
                <h2 className={styles.drawerTitle}>Calculate Delivery Price</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={styles.closeBtn}
                aria-label="Close calculator"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.drawerBody}>
              <PricingCalculator />
            </div>
          </aside>
        </>
      )}
    </main>
  );
}
