"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Headphones,
  Mail,
  MapPin,
  PackageSearch,
  X,
} from "lucide-react";
import ContactForm from "./contact-form";
import styles from "./ContactDrawer.module.css";

export default function ContactClient() {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();

  // If redirected with subject or open parameter, auto-open drawer
  useEffect(() => {
    const hasSubject = Boolean(searchParams?.get("subject"));
    const shouldOpen = Boolean(searchParams?.get("open"));
    const hasHash = typeof window !== "undefined" && window.location.hash === "#contact-form";

    if (hasSubject || shouldOpen || hasHash) {
      setOpen(true);
    }
  }, [searchParams]);

  // Close drawer on Escape key press and manage body lock
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
            src="/images/contact-us.webp"
            alt="Tukaatu Express Customer Support"
            fill
            priority
            sizes="100vw"
            quality={85}
          />
        </div>

        <div className="public-hero-inner">
          <div className="public-hero-copy">
            <Link href="/" className="public-breadcrumb">
              Tukaatu Express <span>/</span> Contact & pickups
            </Link>
            <p className="public-eyebrow">Contact & pickups</p>
            <h1>
              A real team.
              <br />
              <span>Ready to help.</span>
            </h1>
            <p className="public-hero-description">
              Booking a pickup, growing your business or checking a delivery?
              Tell us what you need and we’ll help you take the next step.
            </p>

            <div className="public-hero-actions">
              <button
                type="button"
                className="public-button"
                onClick={() => setOpen(true)}
                style={{ cursor: "pointer", fontFamily: "inherit" }}
              >
                <Headphones size={18} />
                Contact Us
                <ArrowRight size={18} />
              </button>
              <Link
                className="public-button public-button--outline"
                href="/contact/info"
              >
                Contact Info
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Side-of-Image Slide-in Contact Drawer (opens only when Contact Us is clicked) */}
      {open && (
        <>
          <div
            className={styles.drawerBackdrop}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside
            className={styles.drawerPanel}
            aria-label="Contact and pickup form"
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.drawerHeader}>
              <div className={styles.drawerTitleWrap}>
                <span className={styles.drawerEyebrow}>
                  <span className={styles.liveDot} /> Direct Dispatch & Support
                </span>
                <h2 className={styles.drawerTitle}>Get in Touch</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={styles.closeBtn}
                aria-label="Close contact drawer"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.drawerBody}>
              {/* Quick Contact Info Strip */}
              <div className={styles.quickInfoStrip}>
                <div className={styles.infoPill}>
                  <div className={styles.infoPillIcon}>
                    <Mail size={16} />
                  </div>
                  <div className={styles.infoPillText}>
                    <strong>Email Us</strong>
                    <a href="mailto:hello@tukaatuexpress.com">
                      hello@tukaatuexpress.com
                    </a>
                  </div>
                </div>

                <div className={styles.infoPill}>
                  <div className={styles.infoPillIcon}>
                    <MapPin size={16} />
                  </div>
                  <div className={styles.infoPillText}>
                    <strong>Location</strong>
                    <span>Kathmandu, Nepal</span>
                  </div>
                </div>
              </div>

              {/* The Form */}
              <ContactForm />

              {/* Quick Tracking Link Footer */}
              <div className="mt-6 flex items-center justify-between rounded-xl bg-white border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <PackageSearch className="h-5 w-5 text-[#1677b8]" />
                  <span className="text-xs font-semibold text-gray-700">
                    Already shipped an item?
                  </span>
                </div>
                <Link
                  href="/tracking"
                  className="text-xs font-bold text-[#1677b8] hover:underline"
                >
                  Track parcel →
                </Link>
              </div>
            </div>
          </aside>
        </>
      )}
    </main>
  );
}
