"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import PublicHero from "../components/PublicHero";
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
      <PublicHero
        fullHeight
        backgroundImage="/images/experience/cinematic/store.webp"
        eyebrow="Pricing & calculator"
        title="Know the price."
        accent="Then make your move."
        description="Choose your route, service and parcel details for an instant door-to-door delivery estimate across Nepal."
        note="Clear pricing. Confident sending."
        primary={{
          onClick: () => setOpen(true),
          label: "Calculate price",
        }}
        secondary={{ href: "/pricing/info", label: "Pricing Info" }}
      />

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
                <span className={styles.drawerEyebrow}>Instant Estimate</span>
                <h2 className={styles.drawerTitle}>Calculate Price</h2>
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
