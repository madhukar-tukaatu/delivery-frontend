"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Clock,
  Headphones,
  Mail,
  MapPin,
  MessageSquare,
  PackageSearch,
  ShieldCheck,
  Truck,
  Zap,
  X,
} from "lucide-react";
import ContactForm from "./contact-form";
import drawerStyles from "./ContactDrawer.module.css";
import heroStyles from "./ContactHero.module.css";

export default function ContactClient() {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();

  // If redirected with subject or open parameter, auto-open drawer
  useEffect(() => {
    const hasSubject = Boolean(searchParams?.get("subject"));
    const shouldOpen = Boolean(searchParams?.get("open"));
    const hasHash =
      typeof window !== "undefined" && window.location.hash === "#contact-form";

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

        <div className={heroStyles.heroWrapper}>
          <div className={heroStyles.heroGrid}>
            {/* Left Column: Core Copy & CTAs */}
            <div className={heroStyles.copyCol}>
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

              {/* Trust & Speed Micro-Badges */}
              <div className={heroStyles.trustPills}>
                <span className={heroStyles.trustPill}>
                  <Zap size={14} className="text-[#027196]" />
                  <span>15-min dispatch response</span>
                </span>
                <span className={heroStyles.trustPill}>
                  <ShieldCheck size={14} className="text-green-600" />
                  <span>Verified central support</span>
                </span>
                <span className={heroStyles.trustPill}>
                  <Truck size={14} className="text-[#027196]" />
                  <span>All 77 districts covered</span>
                </span>
              </div>
            </div>

            {/* Right Column: Summarized Info Card */}
            <div className={heroStyles.summaryCard}>
              <div className={heroStyles.cardHeader}>
                <div>
                  <span className={heroStyles.cardBadge}>
                    <span className={heroStyles.liveDot} /> Active Dispatch Desk
                  </span>
                  <h2 className={heroStyles.cardTitle}>
                    Direct Support & Hub
                  </h2>
                  <p className={heroStyles.cardSubtitle}>
                    Real-time operational coordination across Nepal
                  </p>
                </div>
              </div>

              <div className={heroStyles.infoGrid}>
                {/* Hub Location */}
                <div className={heroStyles.infoItem}>
                  <div className={heroStyles.itemIcon}>
                    <MapPin size={18} />
                  </div>
                  <div className={heroStyles.itemText}>
                    <span className={heroStyles.itemLabel}>Central Hub</span>
                    <span className={heroStyles.itemValue}>
                      Kathmandu, Nepal
                    </span>
                    <span className={heroStyles.itemSub}>
                      Valley & province routing
                    </span>
                  </div>
                </div>

                {/* Email Support */}
                <div className={heroStyles.infoItem}>
                  <div className={heroStyles.itemIcon}>
                    <Mail size={18} />
                  </div>
                  <div className={heroStyles.itemText}>
                    <span className={heroStyles.itemLabel}>Direct Email</span>
                    <span className={heroStyles.itemValue}>
                      hello@tukaatuexpress.com
                    </span>
                    <span className={heroStyles.itemSub}>
                      Direct ticketing & enquiries
                    </span>
                  </div>
                </div>

                {/* Hours & Response */}
                <div className={heroStyles.infoItem}>
                  <div className={heroStyles.itemIcon}>
                    <Clock size={18} />
                  </div>
                  <div className={heroStyles.itemText}>
                    <span className={heroStyles.itemLabel}>Dispatch Hours</span>
                    <span className={heroStyles.itemValue}>
                      Sun – Fri: 7am – 9pm
                    </span>
                    <span className={heroStyles.itemSub}>
                      Under 15 min response
                    </span>
                  </div>
                </div>

                {/* Pickups & Delivery */}
                <div className={heroStyles.infoItem}>
                  <div className={heroStyles.itemIcon}>
                    <Truck size={18} />
                  </div>
                  <div className={heroStyles.itemText}>
                    <span className={heroStyles.itemLabel}>Pickups</span>
                    <span className={heroStyles.itemValue}>
                      Scheduled & On-Demand
                    </span>
                    <span className={heroStyles.itemSub}>
                      Merchant & bulk parcels
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Quick Actions */}
              <div className={heroStyles.cardFooter}>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className={heroStyles.quickOpenBtn}
                >
                  <MessageSquare size={16} />
                  Send a message
                </button>
                <Link href="/tracking" className={heroStyles.quickTrackLink}>
                  <PackageSearch size={16} />
                  Track parcel
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Side-of-Image Slide-in Contact Drawer (opens when Contact Us / Send message is clicked) */}
      {open && (
        <>
          <div
            className={drawerStyles.drawerBackdrop}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside
            className={drawerStyles.drawerPanel}
            aria-label="Contact and pickup form"
            role="dialog"
            aria-modal="true"
          >
            <div className={drawerStyles.drawerHeader}>
              <div className={drawerStyles.drawerTitleWrap}>
                <span className={drawerStyles.drawerEyebrow}>
                  <span className={drawerStyles.liveDot} /> Direct Dispatch &
                  Support
                </span>
                <h2 className={drawerStyles.drawerTitle}>Get in Touch</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={drawerStyles.closeBtn}
                aria-label="Close contact drawer"
              >
                <X size={18} />
              </button>
            </div>

            <div className={drawerStyles.drawerBody}>
              {/* Quick Contact Info Strip */}
              <div className={drawerStyles.quickInfoStrip}>
                <div className={drawerStyles.infoPill}>
                  <div className={drawerStyles.infoPillIcon}>
                    <Mail size={16} />
                  </div>
                  <div className={drawerStyles.infoPillText}>
                    <strong>Email Us</strong>
                    <a href="mailto:hello@tukaatuexpress.com">
                      hello@tukaatuexpress.com
                    </a>
                  </div>
                </div>

                <div className={drawerStyles.infoPill}>
                  <div className={drawerStyles.infoPillIcon}>
                    <MapPin size={16} />
                  </div>
                  <div className={drawerStyles.infoPillText}>
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
