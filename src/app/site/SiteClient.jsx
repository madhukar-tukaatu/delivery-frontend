"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./site.module.css";
import dynamic from "next/dynamic";
import api from "@/lib/api";
import siteApi from "@/services/siteApi";

const TrackingMap = dynamic(() => import("./components/TrackingMap"), { ssr: false });
const CoverageMap = dynamic(() => import("./components/CoverageMap"), { ssr: false });
const LocationPicker = dynamic(() => import("./components/LocationPicker"), { ssr: false });


const HERO_SLOGANS = [
  {
    part1: "Your Money,",
    part1Color: "#027196",
    part2: "Your Rules.",
    part2Color: "#FFD026"
  },
  {
    part1: "Deliver First,",
    part1Color: "#FFD026",
    part2: "Pay Later.",
    part2Color: "#027196"
  }
];

const BENTO_FEATURES = [
  {
    tag: "AI ROUTING ENGINE",
    title: "Dynamic Route Optimization",
    desc: "Multi-stop algorithms analyze real-time Kathmandu traffic and rider positions to deliver parcels up to 40% faster than standard routing.",
    accent: "#FFD026",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFD026" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    )
  },
  {
    tag: "FINANCIAL OS",
    title: "Same-Day COD",
    desc: "Cash settled into merchant bank accounts daily.",
    accent: "#4ADE80",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="14" rx="2" /><path d="M2 10h20" /><path d="M6 14h4" />
      </svg>
    )
  },
  {
    tag: "DEVELOPER APIS",
    title: "REST APIs & Webhooks",
    desc: "Plug into Shopify, WooCommerce or any custom storefront.",
    accent: "#60A5FA",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    )
  },
  {
    tag: "SORTING HUBS",
    title: "Barcode Hub Sorting",
    desc: "High-speed scanners sort packages into district dispatches in minutes.",
    accent: "#F472B6",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F472B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    )
  },
  {
    tag: "SECURITY & AUDIT",
    title: "Digital e-POD Signature",
    desc: "Doorstep photo capture and GPS geotagging for undeniable proof of delivery.",
    accent: "#A78BFA",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" /><circle cx="12" cy="10" r="3" />
      </svg>
    )
  },
  {
    tag: "FLEET TELEMETRY",
    title: "24/7 Live Telemetry",
    desc: "Live rider GPS and automated SMS checkpoints keep buyers informed at every step.",
    accent: "#34D399",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
    )
  }
];

export default function SiteClient() {
  // Slogan Rotator State
  const [sloganIndex, setSloganIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSloganIndex((prev) => (prev + 1) % HERO_SLOGANS.length);
    }, 3400);
    return () => clearInterval(timer);
  }, []);

  // Console Tab State
  const [consoleTab, setConsoleTab] = useState("track");

  // Parcel Tracking
  const [trackingNumber, setTrackingNumber] = useState("TKX-2048");
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);
  const [activeTracking, setActiveTracking] = useState({
    id: "TKX-2048",
    status: "Out for delivery",
    statusSub: "Rider: Bikram S. • Live GPS Active",
    origin: "Bhaktapur",
    destination: "Lalitpur",
    stagesText: "Dispatched from Kathmandu Sorting Hub"
  });

  // Rate Estimator
  const [pickupLocation, setPickupLocation] = useState({
    address: "",
    latitude: "",
    longitude: "",
  });

  const [deliveryLocation, setDeliveryLocation] = useState({
    address: "",
    latitude: "",
    longitude: "",
  });

  const [rateParcel, setRateParcel] = useState({
    actualWeightKg: 1,
    lengthCm: "",
    widthCm: "",
    heightCm: "",
    parcelType: "non_fragile",
  });

  const [rateServiceType, setRateServiceType] = useState("standard");
  const [rateEstimate, setRateEstimate] = useState(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [rateError, setRateError] = useState("");

  const volumetricWeightPreview = (() => {
    const length = Number(rateParcel.lengthCm);
    const width = Number(rateParcel.widthCm);
    const height = Number(rateParcel.heightCm);

    if (
      !Number.isFinite(length) ||
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      length <= 0 ||
      width <= 0 ||
      height <= 0
    ) {
      return null;
    }

    return Number(((length * width * height) / 5000).toFixed(3));
  })();

  const chargeableWeightPreview = (() => {
    const actualWeight = Number(rateParcel.actualWeightKg);

    if (
      !Number.isFinite(actualWeight) ||
      actualWeight <= 0 ||
      volumetricWeightPreview === null
    ) {
      return null;
    }

    return Number(
      Math.max(actualWeight, volumetricWeightPreview).toFixed(3),
    );
  })();

  // Book Pickup
  const [pickupData, setPickupData] = useState({ name: "", phone: "", address: "", city: "Kathmandu" });
  const [pickupSubmitted, setPickupSubmitted] = useState(false);

  // Full-Screen Slide Deck Presentation Engine State
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isDark, setIsDark] = useState(true);
  const TOTAL_SLIDES = 6;

  // Theme-aware color helpers
  const tc = isDark ? '#F1F5F9' : '#0F172A';      // primary text
  const mc = isDark ? '#94A3B8' : '#475569';      // muted text
  const mc2 = isDark ? '#64748B' : '#64748B';     // extra muted (same both)
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)';
  const darkPanelBg = isDark ? '#071722' : '#E8EFF5';


  useEffect(() => {
    let lastWheelTime = 0;

    const handleWheel = (e) => {
      if (document.querySelector('[data-location-picker-modal="true"]')) return;
      if (e.target instanceof Element && e.target.closest('[data-prevent-slide-wheel="true"]')) return;

      const now = Date.now();
      if (now - lastWheelTime < 650) return;

      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta > 25) {
        lastWheelTime = now;
        setCurrentSlide((prev) => Math.min(prev + 1, TOTAL_SLIDES - 1));
      } else if (delta < -25) {
        lastWheelTime = now;
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      }
    };

    const handleKeyDown = (e) => {
      if (document.querySelector('[data-location-picker-modal="true"]')) return;

      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        setCurrentSlide((prev) => Math.min(prev + 1, TOTAL_SLIDES - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleRateEstimate = async (event) => {
    event?.preventDefault();

    setRateError("");
    setRateEstimate(null);

    const pickupLatitude = Number(pickupLocation.latitude);
    const pickupLongitude = Number(pickupLocation.longitude);
    const deliveryLatitude = Number(deliveryLocation.latitude);
    const deliveryLongitude = Number(deliveryLocation.longitude);
    const actualWeightKg = Number(rateParcel.actualWeightKg);
    const lengthCm = Number(rateParcel.lengthCm);
    const widthCm = Number(rateParcel.widthCm);
    const heightCm = Number(rateParcel.heightCm);

    if (!pickupLocation.address.trim()) {
      setRateError("Select the pickup location from the map.");
      return;
    }

    if (
      pickupLocation.latitude === "" ||
      pickupLocation.longitude === "" ||
      !Number.isFinite(pickupLatitude) ||
      !Number.isFinite(pickupLongitude) ||
      pickupLatitude < -90 ||
      pickupLatitude > 90 ||
      pickupLongitude < -180 ||
      pickupLongitude > 180
    ) {
      setRateError("Select a valid pickup point from the map.");
      return;
    }

    if (!deliveryLocation.address.trim()) {
      setRateError("Select the delivery location from the map.");
      return;
    }

    if (
      deliveryLocation.latitude === "" ||
      deliveryLocation.longitude === "" ||
      !Number.isFinite(deliveryLatitude) ||
      !Number.isFinite(deliveryLongitude) ||
      deliveryLatitude < -90 ||
      deliveryLatitude > 90 ||
      deliveryLongitude < -180 ||
      deliveryLongitude > 180
    ) {
      setRateError("Select a valid delivery point from the map.");
      return;
    }

    if (!Number.isFinite(actualWeightKg) || actualWeightKg <= 0) {
      setRateError("Enter a valid actual weight.");
      return;
    }

    if (
      !Number.isFinite(lengthCm) ||
      !Number.isFinite(widthCm) ||
      !Number.isFinite(heightCm) ||
      lengthCm <= 0 ||
      widthCm <= 0 ||
      heightCm <= 0
    ) {
      setRateError("Enter valid parcel length, width and height.");
      return;
    }

    try {
      setIsLoadingRate(true);

      const estimate = await siteApi.pricing.estimate({
        pickup_address: pickupLocation.address.trim(),
        pickup_latitude: pickupLatitude,
        pickup_longitude: pickupLongitude,
        delivery_address: deliveryLocation.address.trim(),
        delivery_latitude: deliveryLatitude,
        delivery_longitude: deliveryLongitude,
        service_type: rateServiceType,
        parcel_type: rateParcel.parcelType,
        actual_weight_kg: actualWeightKg,
        parcel_dimensions: {
          length_cm: lengthCm,
          width_cm: widthCm,
          height_cm: heightCm,
        },
      });

      setRateEstimate(estimate);
    } catch (error) {
      setRateEstimate(null);
      setRateError(
        error?.message ||
          "The delivery price could not be calculated.",
      );
    } finally {
      setIsLoadingRate(false);
    }
  };

  const handleTrackSubmit = async (e) => {
    e?.preventDefault();
    if (!trackingNumber.trim()) return;
    setIsLoadingTracking(true);
    try {
      const res = await api.get(`/public/track/${trackingNumber.trim()}`);
      const data = res.data?.data;
      if (data) {
        setActiveTracking({
          id: data.tracking_number,
          status: data.status ? data.status.replace(/_/g, " ") : "In Transit",
          statusSub: "Live Telemetry Active",
          origin: data.origin_branch?.name || "Kathmandu",
          destination: data.destination_branch?.name || "Lalitpur",
          stagesText: "Parcel verified in system"
        });
      }
    } catch (err) {
      setActiveTracking({
        id: trackingNumber.toUpperCase(),
        status: "In Transit",
        statusSub: "Rider Assigned • Live Telemetry",
        origin: "Kathmandu",
        destination: "Pokhara",
        stagesText: "Departed Sorting Facility"
      });
    } finally {
      setIsLoadingTracking(false);
    }
  };

  return (
    <div className={`${styles.site} ${styles.gridBackground} tukaatu-site-page`} data-theme={isDark ? 'dark' : 'light'}>
      <style jsx global>{`
        .tukaatu-hero-grid {
          width: min(1440px, calc(100vw - 48px));
          margin: 0 auto;
          grid-template-columns: minmax(0, 0.88fr) minmax(560px, 1.12fr) !important;
          gap: clamp(28px, 4vw, 72px) !important;
          align-items: center !important;
        }

        .tukaatu-hero-left,
        .tukaatu-hero-right,
        .tukaatu-console-card,
        .tukaatu-console-body,
        .tukaatu-rate-grid > * {
          min-width: 0;
        }

        .tukaatu-hero-right {
          width: 100%;
        }

        .tukaatu-console-card {
          width: 100%;
          max-width: 780px;
          margin-left: auto;
          box-sizing: border-box;
        }

        .tukaatu-console-header {
          flex-wrap: wrap;
          row-gap: 10px;
        }

        .tukaatu-console-tabs {
          min-width: 0;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .tukaatu-console-tabs::-webkit-scrollbar {
          display: none;
        }

        .tukaatu-console-body,
        .tukaatu-rate-tab {
          max-width: 100%;
          box-sizing: border-box;
        }

        .tukaatu-rate-tab {
          overflow-x: hidden;
        }

        .tukaatu-rate-grid input,
        .tukaatu-rate-grid select,
        .tukaatu-rate-grid button {
          min-width: 0;
          max-width: 100%;
        }

        .tukaatu-dimension-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .tukaatu-weight-help {
          margin-top: 6px;
          font-size: 10px;
          line-height: 1.45;
        }

        .tukaatu-location-field {
          min-width: 0;
        }

        .tukaatu-location-main-button {
          min-width: 0;
        }

        @media (max-width: 1380px) {
          .tukaatu-hero-grid {
            width: min(1240px, calc(100vw - 36px));
            grid-template-columns: minmax(0, 0.78fr) minmax(540px, 1.22fr) !important;
            gap: 30px !important;
          }

          .tukaatu-console-card {
            max-width: 720px;
          }
        }

        @media (max-width: 1180px) {
          .tukaatu-overview-slide {
            align-items: flex-start !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
          }

          .tukaatu-hero-section {
            min-height: auto !important;
            height: auto !important;
            padding: 96px 20px 110px !important;
            box-sizing: border-box;
          }

          .tukaatu-hero-grid {
            width: min(860px, 100%);
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 38px !important;
          }

          .tukaatu-hero-left,
          .tukaatu-hero-right {
            width: 100%;
            max-width: 100%;
          }

          .tukaatu-console-card {
            max-width: 860px;
            margin: 0 auto;
          }
        }

        @media (max-width: 760px) {
          .tukaatu-hero-section {
            padding: 82px 12px 96px !important;
          }

          .tukaatu-console-card {
            border-radius: 16px !important;
          }

          .tukaatu-console-header {
            align-items: stretch !important;
            padding-left: 10px !important;
            padding-right: 10px !important;
          }

          .tukaatu-console-tabs {
            width: 100%;
            order: 3;
          }

          .tukaatu-console-body {
            padding: 12px !important;
            overflow: visible !important;
          }

          .tukaatu-rate-grid {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 10px !important;
          }

          .tukaatu-dimension-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .tukaatu-location-control {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) auto !important;
            gap: 7px !important;
          }

          .tukaatu-location-main-button {
            grid-column: 1 / -1;
            min-height: 58px;
          }

          .tukaatu-location-change-button {
            width: 100%;
            min-height: 40px;
          }

          .tukaatu-location-clear-button {
            width: 42px !important;
            min-height: 40px;
          }

          .tukaatu-rate-result {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .tukaatu-rate-result > div:last-child {
            width: 100%;
            text-align: left !important;
            padding-top: 10px;
            border-top: 1px solid rgba(148, 163, 184, 0.18);
          }

          .tukaatu-location-modal-backdrop {
            padding: 0 !important;
            align-items: stretch !important;
          }

          .tukaatu-location-modal-panel {
            width: 100% !important;
            min-height: 100dvh;
            max-height: 100dvh !important;
            border-radius: 0 !important;
          }

          .tukaatu-location-modal-header {
            padding: 12px !important;
          }

          .tukaatu-location-modal-content {
            padding: 12px !important;
          }

          .tukaatu-location-search-form {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
          }

          .tukaatu-location-search-input {
            grid-column: 1 / -1;
          }

          .tukaatu-location-map {
            height: 42vh !important;
            min-height: 250px !important;
            border-radius: 12px !important;
          }

          .tukaatu-location-footer {
            grid-template-columns: minmax(0, 1fr) !important;
            align-items: stretch !important;
          }

          .tukaatu-location-confirm-button {
            width: 100%;
          }
        }

        @media (max-width: 520px) {
          .tukaatu-dimension-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }

        @media (max-width: 430px) {
          .tukaatu-location-search-form {
            grid-template-columns: minmax(0, 1fr) !important;
          }

          .tukaatu-location-search-input {
            grid-column: auto;
          }

          .tukaatu-console-body {
            padding: 9px !important;
          }
        }
      `}</style>

      {/* --------------------------------------------------------------------
         LOGO-ONLY TOP BAR
         -------------------------------------------------------------------- */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.logoWrap} style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/logo-full.png" alt="Tukaatu Express" style={{ height: 40, width: 'auto', objectFit: 'contain' }} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setIsDark(d => !d)}
              className={styles.themeToggle}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
            <Link href="/login" className={styles.portalBtn}>
              Merchant Portal →
            </Link>
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------------------
         BOTTOM NAV BAR — nav links + dot indicators merged
         -------------------------------------------------------------------- */}
      <div className={styles.bottomNav}>
        {/* Prev arrow */}
        <button
          onClick={() => setCurrentSlide((prev) => Math.max(prev - 1, 0))}
          disabled={currentSlide === 0}
          className={styles.bottomNavArrow}
          style={{ opacity: currentSlide === 0 ? 0.2 : 1 }}
        >←</button>

        {/* Nav links with dot indicators */}
        {[['Overview',0],['Technology',1],['Merchants',2],['Network',3],['Pricing',4],['Get Started',5]].map(([label, idx]) => (
          <button
            key={label}
            onClick={() => setCurrentSlide(idx)}
            className={`${styles.bottomNavItem} ${currentSlide === idx ? styles.bottomNavItemActive : ''}`}
          >
            <span className={`${styles.bottomNavDot} ${currentSlide === idx ? styles.bottomNavDotActive : ''}`} />
            <span className={styles.bottomNavLabel}>{label}</span>
          </button>
        ))}

        {/* Next arrow */}
        <button
          onClick={() => setCurrentSlide((prev) => Math.min(prev + 1, TOTAL_SLIDES - 1))}
          disabled={currentSlide === TOTAL_SLIDES - 1}
          className={styles.bottomNavArrow}
          style={{ opacity: currentSlide === TOTAL_SLIDES - 1 ? 0.2 : 1 }}
        >→</button>
      </div>

      {/* --------------------------------------------------------------------
         FULL-SCREEN HORIZONTAL SLIDE TRACK CONTAINER
         -------------------------------------------------------------------- */}
      <div 
        className={styles.slideTrack} 
        style={{ transform: `translateX(-${currentSlide * 100}vw)` }}
      >

      {/* --------------------------------------------------------------------
         SLIDE 0: DRIBBBLE-STYLE 2-COLUMN HERO SECTION WITH SLOGAN ROTATOR
         -------------------------------------------------------------------- */}
      <div className={`${styles.slideItem} tukaatu-overview-slide`}>
        <section id="hero" className={`${styles.heroSection} ${styles.snapSection} tukaatu-hero-section`}>
        <div className={`${styles.heroGrid} tukaatu-hero-grid`}>
          {/* Left Column */}
          <div className={`${styles.heroLeftCol} tukaatu-hero-left`}>

            {/* Live status badge */}
            <div className={styles.heroBadge}>
              <span className={styles.heroBadgeDot}></span>
              <span>NEPAL’S NEXT-GEN LOGISTICS OS</span>
              <span className={styles.heroBadgeSep}>•</span>
              <span style={{ color: '#22C55E', fontWeight: 900 }}>Live</span>
            </div>

            {/* Animated headline */}
            <h1 className={styles.heroTitle}>
              <span key={sloganIndex} className={styles.sloganRotator}>
                <span style={{ color: HERO_SLOGANS[sloganIndex].part1Color }}>{HERO_SLOGANS[sloganIndex].part1}</span>
                {' '}
                <span style={{ color: HERO_SLOGANS[sloganIndex].part2Color }}>{HERO_SLOGANS[sloganIndex].part2}</span>
              </span>
            </h1>

            {/* Sub-headline */}
            <p className={styles.heroSubtitle}>
              Tukaatu Express unifies live parcel tracking, instant rate calculation,
              on-demand rider pickups, and same-day COD settlement into one platform.
            </p>

            {/* CTA row */}
            <div className={styles.heroCtaRow}>
              <a href="#heroConsole" className={styles.primaryCtaBtn}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Track a Parcel
              </a>
              <a href="/login" className={styles.secondaryCtaBtn}>
                Open Dashboard →
              </a>
            </div>

            {/* Social proof */}
            <div className={styles.heroSocialProofRow}>
              <div className={styles.socialProofPill}>
                <div className={styles.avatarStack}>
                  {[['#027196','#FFF','K'],['#0B8CB7','#FFF','P'],['#FFD026','#071722','B'],['#071722','#FFF','+']].map(([bg,color,letter]) => (
                    <div key={letter} className={styles.avatarCircle} style={{ background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>{letter}</div>
                  ))}
                </div>
                <div className={styles.socialProofText}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFD026" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  <strong style={{ color: '#0F172A' }}>4.9</strong>
                  <span style={{ color: mc }}>· Trusted by 500K+ deliveries</span>
                </div>
              </div>
            </div>

            {/* Stats strip */}
            <div className={styles.heroStatsStrip}>
              {[
                { value: '500K+', label: 'Parcels', badge: '99.4% SLA' },
                { value: '77/77', label: 'Districts', badge: 'Full Nepal' },
                { value: '< 4h', label: 'City SLA', badge: 'Express' },
                { value: 'Daily', label: 'COD Pay', badge: 'Same-Day' },
              ].map((s) => (
                <div key={s.label} className={styles.heroStatCard}>
                  <div className={styles.heroStatBadge}>{s.badge}</div>
                  <div className={styles.heroStatValue}>{s.value}</div>
                  <div className={styles.heroStatLabel}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Hero Console Card with Floating Badges */}
          <div id="heroConsole" className={`${styles.heroRightCol} tukaatu-hero-right`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start' }}>
            {/* Top Floating Badge */}
            <div className={`${styles.floatingBadgeTopRight} ${styles.floatAnim}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#027196" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              &lt; 4 Hours Intra-City SLA
            </div>

            {/* Hero Multi-Tab Console Card (macOS Terminal Inspired Design) */}
            <div className={`${styles.consoleCard} tukaatu-console-card`}>
                <div className={`${styles.consoleHeader} tukaatu-console-header`}>
                  <div className={styles.macDotsRow}>
                    <span className={styles.macDot} style={{ background: '#FF5F56' }}></span>
                    <span className={styles.macDot} style={{ background: '#FFBD2E' }}></span>
                    <span className={styles.macDot} style={{ background: '#27C93F' }}></span>
                  </div>

                  <div className={`${styles.consoleTabsRow} tukaatu-console-tabs`}>
                    <button
                      onClick={() => setConsoleTab("track")}
                      className={`${styles.consoleTabBtn} ${consoleTab === "track" ? styles.consoleTabActive : ""}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                      <span style={{ whiteSpace: 'nowrap' }}>Live Tracker</span>
                    </button>
                    <button
                      onClick={() => setConsoleTab("rate")}
                      className={`${styles.consoleTabBtn} ${consoleTab === "rate" ? styles.consoleTabActive : ""}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                      </svg>
                      <span style={{ whiteSpace: 'nowrap' }}>Rate Estimator</span>
                    </button>
                    <button
                      onClick={() => setConsoleTab("pickup")}
                      className={`${styles.consoleTabBtn} ${consoleTab === "pickup" ? styles.consoleTabActive : ""}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                      </svg>
                      <span style={{ whiteSpace: 'nowrap' }}>Book Pickup</span>
                    </button>
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 800, color: '#15803D', background: '#DCFCE7', padding: '4px 12px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                    <span className={styles.liveDotGreen}></span> Live Terminal
                  </div>
                </div>

                <div className={`${styles.consoleBody} tukaatu-console-body`}>
                  {/* TAB 1: PARCEL TRACKER */}
                  {consoleTab === "track" && (
                    <div key="tab-track" className={styles.tabContentSlide}>
                      <form onSubmit={handleTrackSubmit} style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <input
                            type="text"
                            placeholder="Enter Tracking ID (e.g. TKX-2048)"
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '14px 20px 14px 44px',
                              borderRadius: 16,
                              border: `1.5px solid ${inputBorder}`,
                              fontSize: 14,
                              color: tc,
                              fontWeight: 800,
                              outline: 'none',
                              background: inputBg,
                              boxSizing: 'border-box'
                            }}
                          />
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#027196" strokeWidth="2.5" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }}>
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                        </div>

                        <button
                          type="submit"
                          style={{
                            background: '#FFD026',
                            color: '#071722',
                            fontWeight: 900,
                            fontSize: 14,
                            padding: '14px 24px',
                            border: 'none',
                            borderRadius: 16,
                            cursor: 'pointer',
                            boxShadow: '0 4px 16px rgba(255,208,38,0.45)',
                            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {isLoadingTracking ? "Searching..." : "Track →"}
                        </button>
                      </form>

                      {/* 5-Stage Visual Progress Stepper */}
                      <div className={styles.stepperRow}>
                        <div className={styles.stepperLineTrack}></div>
                        <div className={styles.stepperProgressLine} style={{ width: '75%' }}></div>

                        <div className={styles.stepNode}>
                          <div className={`${styles.stepCircle} ${styles.stepCircleCompleted}`}>✓</div>
                          <div className={styles.stepLabel}>Booked</div>
                        </div>

                        <div className={styles.stepNode}>
                          <div className={`${styles.stepCircle} ${styles.stepCircleCompleted}`}>✓</div>
                          <div className={styles.stepLabel}>Picked Up</div>
                        </div>

                        <div className={styles.stepNode}>
                          <div className={`${styles.stepCircle} ${styles.stepCircleCompleted}`}>✓</div>
                          <div className={styles.stepLabel}>Sorting Hub</div>
                        </div>

                        <div className={styles.stepNode}>
                          <div className={`${styles.stepCircle} ${styles.stepCircleActive}`}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFD026" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="5.5" cy="17.5" r="3.5"/>
                              <circle cx="18.5" cy="17.5" r="3.5"/>
                              <path d="M15 6h-5l-3 5h8l2-5z"/>
                              <path d="M9 11l-3 6.5"/>
                              <path d="M15 11l2 6.5"/>
                            </svg>
                          </div>
                          <div className={`${styles.stepLabel} ${styles.stepLabelActive}`}>Out for Delivery</div>
                        </div>

                        <div className={styles.stepNode}>
                          <div className={styles.stepCircle}>5</div>
                          <div className={styles.stepLabel}>Delivered</div>
                        </div>
                      </div>

                      {/* Status & Live Telemetry Bar */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: cardBg, padding: 16, borderRadius: 18, border: `1px solid ${cardBorder}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, background: cardBg, padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: 11, fontWeight: 900, color: '#fff', background: '#027196', padding: '4px 10px', borderRadius: 999, letterSpacing: '0.04em' }}>ID: {activeTracking.id}</span>
                            <span style={{ fontSize: 14, fontWeight: 900, color: tc, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#38BDF8', display: 'inline-block', boxShadow: '0 0 0 3px rgba(56,189,248,0.2)' }}></span>
                              {activeTracking.status}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#38BDF8', background: 'rgba(56,189,248,0.1)', padding: '4px 10px', borderRadius: 8 }}>{activeTracking.origin} → {activeTracking.destination}</span>
                            <span style={{ color: '#4ADE80', background: 'rgba(74,222,128,0.1)', padding: '4px 8px', borderRadius: 8, fontSize: 11, fontWeight: 900, display: 'inline-flex', alignItems: 'center', gap: 4 }}><span className={styles.liveDotGreen}></span> 3.2 km</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#FCD34D', background: 'rgba(252,211,77,0.1)', padding: '4px 8px', borderRadius: 8 }}>ETA: 3:30 PM</span>
                            <span style={{ fontSize: 11, fontWeight: 800, color: mc, background: inputBg, padding: '4px 8px', borderRadius: 8 }}>Rider: Bikram S.</span>
                          </div>
                        </div>
                        <div style={{ height: 185, width: '100%', borderRadius: 14, overflow: 'hidden', border: `1px solid ${cardBorder}`, position: 'relative', isolation: 'isolate' }}>
                          <TrackingMap fromCity={activeTracking.origin} toCity={activeTracking.destination} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: RATE ESTIMATOR */}
                  {consoleTab === "rate" && (
                    <div key="tab-rate" className={`${styles.tabContentSlide} tukaatu-rate-tab`} data-prevent-slide-wheel="true">
                      <form onSubmit={handleRateEstimate}>
                        <div
                          className="tukaatu-rate-grid"
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                            gap: 12,
                            marginBottom: 12,
                          }}
                        >
                          <LocationPicker
                            label="PICKUP LOCATION"
                            value={pickupLocation}
                            isDark={isDark}
                            allowCurrentLocation
                            placeholder="Choose pickup point"
                            onChange={(location) => {
                              setPickupLocation(location);
                              setRateEstimate(null);
                              setRateError("");
                            }}
                          />

                          <LocationPicker
                            label="DELIVERY LOCATION"
                            value={deliveryLocation}
                            isDark={isDark}
                            allowCurrentLocation={false}
                            placeholder="Choose delivery point"
                            onChange={(location) => {
                              setDeliveryLocation(location);
                              setRateEstimate(null);
                              setRateError("");
                            }}
                          />

                          <div>
                            <label style={{ fontSize: 10, fontWeight: 800, color: mc, display: "block", marginBottom: 4 }}>
                              ACTUAL WEIGHT (KG)
                            </label>
                            <input
                              required
                              type="number"
                              min="0.01"
                              max="5000"
                              step="0.01"
                              value={rateParcel.actualWeightKg}
                              onChange={(event) => {
                                setRateParcel((previous) => ({
                                  ...previous,
                                  actualWeightKg: event.target.value,
                                }));
                                setRateEstimate(null);
                              }}
                              style={{
                                width: "100%",
                                padding: 10,
                                borderRadius: 10,
                                border: `1px solid ${inputBorder}`,
                                fontSize: 13,
                                color: tc,
                                background: inputBg,
                                boxSizing: "border-box",
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: 10, fontWeight: 800, color: mc, display: "block", marginBottom: 4 }}>
                              PARCEL TYPE
                            </label>
                            <select
                              value={rateParcel.parcelType}
                              onChange={(event) => {
                                setRateParcel((previous) => ({
                                  ...previous,
                                  parcelType: event.target.value,
                                }));
                                setRateEstimate(null);
                              }}
                              style={{
                                width: "100%",
                                padding: 10,
                                borderRadius: 10,
                                border: `1px solid ${inputBorder}`,
                                fontWeight: 700,
                                fontSize: 13,
                                color: tc,
                                background: inputBg,
                              }}
                            >
                              <option value="non_fragile">Non-fragile</option>
                              <option value="fragile">Fragile</option>
                            </select>
                          </div>

                          <div style={{ gridColumn: "1 / -1" }}>
                            <label style={{ fontSize: 10, fontWeight: 800, color: mc, display: "block", marginBottom: 4 }}>
                              PACKED PARCEL DIMENSIONS (CM)
                            </label>
                            <div className="tukaatu-dimension-grid">
                              <input
                                required
                                type="number"
                                min="0.01"
                                max="1000"
                                step="0.01"
                                placeholder="Length"
                                aria-label="Parcel length in centimetres"
                                value={rateParcel.lengthCm}
                                onChange={(event) => {
                                  setRateParcel((previous) => ({
                                    ...previous,
                                    lengthCm: event.target.value,
                                  }));
                                  setRateEstimate(null);
                                }}
                                style={{
                                  width: "100%",
                                  padding: 10,
                                  borderRadius: 10,
                                  border: `1px solid ${inputBorder}`,
                                  fontSize: 13,
                                  color: tc,
                                  background: inputBg,
                                  boxSizing: "border-box",
                                }}
                              />

                              <input
                                required
                                type="number"
                                min="0.01"
                                max="1000"
                                step="0.01"
                                placeholder="Width"
                                aria-label="Parcel width in centimetres"
                                value={rateParcel.widthCm}
                                onChange={(event) => {
                                  setRateParcel((previous) => ({
                                    ...previous,
                                    widthCm: event.target.value,
                                  }));
                                  setRateEstimate(null);
                                }}
                                style={{
                                  width: "100%",
                                  padding: 10,
                                  borderRadius: 10,
                                  border: `1px solid ${inputBorder}`,
                                  fontSize: 13,
                                  color: tc,
                                  background: inputBg,
                                  boxSizing: "border-box",
                                }}
                              />

                              <input
                                required
                                type="number"
                                min="0.01"
                                max="1000"
                                step="0.01"
                                placeholder="Height"
                                aria-label="Parcel height in centimetres"
                                value={rateParcel.heightCm}
                                onChange={(event) => {
                                  setRateParcel((previous) => ({
                                    ...previous,
                                    heightCm: event.target.value,
                                  }));
                                  setRateEstimate(null);
                                }}
                                style={{
                                  width: "100%",
                                  padding: 10,
                                  borderRadius: 10,
                                  border: `1px solid ${inputBorder}`,
                                  fontSize: 13,
                                  color: tc,
                                  background: inputBg,
                                  boxSizing: "border-box",
                                }}
                              />
                            </div>
                            {/* <div className="tukaatu-weight-help" style={{ color: mc }}>
                              Volumetric weight: {volumetricWeightPreview !== null ? `${volumetricWeightPreview} kg` : "enter dimensions"}. Chargeable weight: {chargeableWeightPreview !== null ? `${chargeableWeightPreview} kg` : "—"}. The higher of actual and volumetric weight is used.
                            </div> */}
                          </div>

                          <div style={{ gridColumn: "1 / -1" }}>
                            <label style={{ fontSize: 10, fontWeight: 800, color: mc, display: "block", marginBottom: 4 }}>
                              SERVICE TYPE
                            </label>
                            <select
                              value={rateServiceType}
                              onChange={(event) => {
                                setRateServiceType(event.target.value);
                                setRateEstimate(null);
                                setRateError("");
                              }}
                              style={{
                                width: "100%",
                                padding: 10,
                                borderRadius: 10,
                                border: `1px solid ${inputBorder}`,
                                fontWeight: 700,
                                fontSize: 13,
                                color: tc,
                                background: inputBg,
                              }}
                            >
                              <option value="standard">Standard</option>
                              <option value="express">Express</option>
                            </select>
                          </div>
                        </div>

                        {rateError && (
                          <div
                            style={{
                              marginBottom: 10,
                              padding: "8px 10px",
                              borderRadius: 9,
                              background: "rgba(239,68,68,0.1)",
                              border: "1px solid rgba(239,68,68,0.2)",
                              color: "#FCA5A5",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {rateError}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={isLoadingRate}
                          style={{
                            width: "100%",
                            padding: "11px 16px",
                            marginBottom: 12,
                            background: "#FFD026",
                            color: "#071722",
                            border: "none",
                            borderRadius: 11,
                            fontSize: 13,
                            fontWeight: 900,
                            cursor: isLoadingRate ? "wait" : "pointer",
                            opacity: isLoadingRate ? 0.7 : 1,
                          }}
                        >
                          {isLoadingRate
                            ? "Calculating real price..."
                            : "Calculate Delivery Price"}
                        </button>
                      </form>

                      <div
                        className="tukaatu-rate-result"
                        style={{
                          background: darkPanelBg,
                          color: tc,
                          padding: 16,
                          borderRadius: 16,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 16,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 10, color: mc, fontWeight: 700 }}>
                            ESTIMATED PRICE
                          </div>

                          <div style={{ fontSize: 28, fontWeight: 900, color: "#FFD026" }}>
                            {rateEstimate
                              ? `${rateEstimate.currency || "NPR"} ${Number(
                                  rateEstimate.price ?? 0,
                                ).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`
                              : "—"}
                          </div>

                          {rateEstimate && (
                            <div style={{ marginTop: 4, fontSize: 10, color: mc, lineHeight: 1.55 }}>
                              <div>Actual weight: {Number(rateEstimate.actual_weight_kg ?? 0)} kg</div>
                              <div>Volumetric weight: {Number(rateEstimate.volumetric_weight_kg ?? 0)} kg</div>
                              <div>Chargeable weight: {Number(rateEstimate.chargeable_weight_kg ?? 0)} kg</div>
                              <div>Applied: {rateEstimate.weight_source === "volumetric_weight" ? "Volumetric weight" : "Actual weight"}</div>
                            </div>
                          )}
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 10, color: mc, fontWeight: 700 }}>
                            ESTIMATED SLA
                          </div>

                          <div style={{ fontSize: 16, fontWeight: 800, color: "#4ADE80" }}>
                            {rateEstimate?.estimated_delivery_label ||
                              (rateEstimate?.estimated_delivery_hours
                                ? `${rateEstimate.estimated_delivery_hours} Hours`
                                : "—")}
                          </div>
                        </div>
                      </div>

                      {/* {rateEstimate && (
                        <div style={{ marginTop: 8, fontSize: 9, color: mc, lineHeight: 1.5 }}>
                          The pricing engine compares actual weight with volumetric weight and charges the higher value. Volumetric weight is calculated using the active backend divisor. The final amount may change after physical parcel verification.
                        </div>
                      )} */}
                    </div>
                  )}

                  {/* TAB 3: BOOK PICKUP */}
                  {consoleTab === "pickup" && (
                    <div key="tab-pickup" className={styles.tabContentSlide}>
                      <form onSubmit={(e) => { e.preventDefault(); setPickupSubmitted(true); }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                          <input required placeholder="Sender Name" value={pickupData.name} onChange={(e) => setPickupData({ ...pickupData, name: e.target.value })} style={{ padding: 14, borderRadius: 12, border: `1px solid ${inputBorder}`, fontSize: 14, color: tc, background: inputBg }} />
                          <input required placeholder="Phone (+977)" value={pickupData.phone} onChange={(e) => setPickupData({ ...pickupData, phone: e.target.value })} style={{ padding: 14, borderRadius: 12, border: `1px solid ${inputBorder}`, fontSize: 14, color: tc, background: inputBg }} />
                        </div>
                        <input required placeholder="Pickup Address (e.g. New Road, Kathmandu)" value={pickupData.address} onChange={(e) => setPickupData({ ...pickupData, address: e.target.value })} style={{ width: '100%', padding: 14, borderRadius: 12, border: `1px solid ${inputBorder}`, fontSize: 14, color: tc, background: inputBg, marginBottom: 16, boxSizing: 'border-box' }} />
                        <button type="submit" style={{ background: '#FFD026', color: '#060D14', fontWeight: 900, padding: '16px 28px', border: 'none', borderRadius: 14, cursor: 'pointer', width: '100%', fontSize: 15, boxShadow: '0 4px 20px rgba(255,208,38,0.4)' }}>
                          Schedule Immediate Rider Pickup →
                        </button>
                        {pickupSubmitted && <div style={{ marginTop: 12, color: '#4ADE80', fontWeight: 800, fontSize: 14 }}>✓ Request submitted! Nearby rider assigned.</div>}
                      </form>
                    </div>
                  )}
                </div>
              </div>

          </div>
        </div>
        </section>

      </div>

      {/* --------------------------------------------------------------------
         SLIDE 2: BENTO TECHNOLOGY FEATURE GRID
         -------------------------------------------------------------------- */}
      <div className={styles.slideItem} style={{ background: isDark ? '#071722' : '#F0F4F8' }}>
        <section id="technology" className={styles.bentoSection}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#027196', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>Core Technology</div>
              <h2 style={{ fontSize: 'clamp(20px, 2.4vw, 30px)', fontWeight: 950, color: tc, letterSpacing: '-0.03em', margin: 0, lineHeight: 1.1 }}>Built for High-Scale Courier Fulfillment</h2>
            </div>
            <p style={{ fontSize: 13, color: mc, lineHeight: 1.55, maxWidth: 280, margin: 0, textAlign: 'right' }}>
              Proprietary logistics stack powering Nepal's fastest courier network.
            </p>
          </div>

          {/* 3-column bento grid */}
          <div className={styles.bentoGrid}>
            {BENTO_FEATURES.map((feat, i) => (
              <div key={feat.title} className={`${styles.bentoCard} ${i === 0 ? styles.bentoCardAccent : ''}`}>
                <div className={styles.bentoCardInner}>
                  <div className={styles.bentoIconBoxDark} style={{ borderColor: `${feat.accent}35`, background: `${feat.accent}12` }}>
                    {feat.icon}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className={styles.bentoDarkTag} style={{ color: feat.accent }}>{feat.tag}</span>
                    <h3 className={styles.bentoDarkCardTitle}>{feat.title}</h3>
                    <p className={styles.bentoDarkCardDesc}>{feat.desc}</p>
                  </div>
                </div>
                {i === 0 && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,208,38,0.15)', display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 26, fontWeight: 950, color: '#FFD026', letterSpacing: '-0.04em' }}>40%</span>
                    <span style={{ fontSize: 12, color: mc, fontWeight: 600 }}>faster than standard routing</span>
                  </div>
                )}
              </div>
            ))}
          </div>

        </section>
      </div>

      {/* --------------------------------------------------------------------
         SLIDE 3: INTERACTIVE MERCHANT WORKSPACE SHOWCASE
         -------------------------------------------------------------------- */}
      <div className={styles.slideItem} style={{ background: isDark ? '#071722' : '#F0F4F8', color: isDark ? '#FFFFFF' : '#0F172A' }}>
        <section id="merchants" className={styles.merchantSection}>
        <div className={styles.merchantInner}>
          <div>
            <div className={styles.sectionCategory} style={{ color: '#FFD026' }}>Merchant Platform</div>
            <h2 className={styles.merchantTitle}>Unified Delivery Operations for Online Sellers</h2>
            <p className={styles.merchantCopy}>
              Monitor active deliveries, generate COD statements, request inventory pickups, 
              and download analytics from a single dashboard.
            </p>

            <div className={styles.merchantFeatureGrid}>
              {["Bulk order dispatch", "On-demand rider pickup", "e-POD verification", "Automated COD ledger", "REST API integration", "Live tracking links"].map((f) => (
                <div key={f} className={styles.merchantFeatureCheck}>
                  <span className={styles.checkDot}></span>
                  <span>{f}</span>
                </div>
              ))}
            </div>

            <Link href="/login" style={{ background: '#FFD026', color: '#071722', padding: '16px 36px', borderRadius: 999, fontWeight: 900, textDecoration: 'none', display: 'inline-block' }}>
              Access Merchant Portal →
            </Link>
          </div>

          {/* Detailed Merchant Dashboard Wireframe */}
          <div className={styles.merchantMockupCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${cardBorder}`, paddingBottom: 16, marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16, color: tc }}>TUKAATU MERCHANT WORKSPACE</div>
                <div style={{ fontSize: 12, color: mc, marginTop: 2 }}>Store ID: merchant_9942 • Live Telemetry</div>
              </div>
              <div style={{ background: 'rgba(255,208,38,0.2)', color: '#FFD026', padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 800, height: 'fit-content' }}>
                ● Live Fleet Active
              </div>
            </div>

            {/* Metrics Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
              <div style={{ background: inputBg, padding: 14, borderRadius: 14 }}>
                <div style={{ fontSize: 11, color: mc }}>Total Parcels</div>
                <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4, color: tc }}>1,428</div>
              </div>
              <div style={{ background: inputBg, padding: 14, borderRadius: 14 }}>
                <div style={{ fontSize: 11, color: mc }}>In Transit</div>
                <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4, color: '#0B8CB7' }}>94</div>
              </div>
              <div style={{ background: inputBg, padding: 14, borderRadius: 14 }}>
                <div style={{ fontSize: 11, color: mc }}>Pending COD</div>
                <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4, color: '#FFD026' }}>NPR 285K</div>
              </div>
              <div style={{ background: inputBg, padding: 14, borderRadius: 14 }}>
                <div style={{ fontSize: 11, color: mc }}>Settled Month</div>
                <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4, color: '#4ADE80' }}>NPR 1.4M</div>
              </div>
            </div>

            {/* Simulated Recent Dispatch Queue Table */}
            <div style={{ background: darkPanelBg, borderRadius: 18, padding: 18, border: `1px solid ${inputBorder}` }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: mc, marginBottom: 12, letterSpacing: '0.08em' }}>RECENT PARCEL DISPATCHES</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: inputBg, padding: '12px 16px', borderRadius: 12, border: `1px solid ${cardBorder}` }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontWeight: 900, fontSize: 13, color: '#FFD026' }}>TKX-9941</span>
                    <span style={{ fontSize: 13, color: tc, fontWeight: 700 }}>Kathmandu → Pokhara</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#6EE7B7', background: 'rgba(110,231,183,0.2)', padding: '4px 12px', borderRadius: 999 }}>Out for Delivery</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: inputBg, padding: '12px 16px', borderRadius: 12, border: `1px solid ${cardBorder}` }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontWeight: 900, fontSize: 13, color: '#FFD026' }}>TKX-8812</span>
                    <span style={{ fontSize: 13, color: tc, fontWeight: 700 }}>Lalitpur → Chitwan</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#93C5FD', background: 'rgba(147,197,253,0.2)', padding: '4px 12px', borderRadius: 999 }}>Sorting Hub</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: inputBg, padding: '12px 16px', borderRadius: 12, border: `1px solid ${cardBorder}` }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontWeight: 900, fontSize: 13, color: '#FFD026' }}>TKX-7714</span>
                    <span style={{ fontSize: 13, color: tc, fontWeight: 700 }}>Kathmandu → Bhaktapur</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#4ADE80', background: 'rgba(74,222,128,0.2)', padding: '4px 12px', borderRadius: 999 }}>✓ Delivered & Settled</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

      {/* --------------------------------------------------------------------
         SLIDE 4: NATIONWIDE NETWORK COVERAGE MAP
         -------------------------------------------------------------------- */}
      <div className={styles.slideItem} style={{ background: isDark ? '#071722' : '#F0F4F8' }}>
        <section id="network" className={styles.coverageSection}>

          {/* Left: header + stats */}
          <div className={styles.coverageLeft}>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#027196', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10 }}>Nationwide Coverage</div>
            <h2 style={{ fontSize: 'clamp(22px, 2.6vw, 32px)', fontWeight: 950, color: tc, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 12px' }}>
              Connecting Kathmandu<br/>to 77 Districts
            </h2>
            <p style={{ fontSize: 13.5, color: mc, lineHeight: 1.6, margin: '0 0 28px', maxWidth: 320 }}>
              Our hub-and-spoke logistics network guarantees seamless inter-district transport across all of Nepal.
            </p>

            {/* Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { value: '77/77', label: 'Districts Covered', color: '#FFD026' },
                { value: '8', label: 'Regional Sorting Hubs', color: '#34D399' },
                { value: '< 48 Hrs', label: 'Nationwide SLA', color: '#60A5FA' },
                { value: '500K+', label: 'Parcels Delivered', color: '#F472B6' },
              ].map((s) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12 }}>
                  <span style={{ fontSize: 20, fontWeight: 950, color: s.color, letterSpacing: '-0.04em', minWidth: 72 }}>{s.value}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: mc }}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* Hub cities */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: mc, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Active Hub Cities</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['Kathmandu', 'Pokhara', 'Biratnagar', 'Chitwan', 'Butwal', 'Nepalgunj', 'Lalitpur', 'Bhaktapur'].map((city) => (
                  <span key={city} style={{ fontSize: 11, fontWeight: 700, color: '#027196', background: 'rgba(2,113,150,0.1)', border: '1px solid rgba(2,113,150,0.2)', padding: '3px 10px', borderRadius: 999 }}>{city}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: map */}
          <div className={styles.coverageRight}>
            <CoverageMap />
          </div>

        </section>
      </div>

      {/* --------------------------------------------------------------------
         SLIDE 5: TRANSPARENT PRICING GRID
         -------------------------------------------------------------------- */}
      <div className={styles.slideItem} style={{ background: isDark ? '#060D14' : '#F0F4F8' }}>
        <section id="pricing" className={styles.pricingSection}>
          <div className={styles.pricingInner}>
            <div className={styles.sectionHeaderCenter}>
              <div className={styles.sectionCategory}>Service Pricing</div>
              <h2 className={styles.sectionTitle}>Transparent Pricing,<br />Zero Hidden Fees</h2>
              <p className={styles.sectionSubtitle}>
                Predictable courier delivery rates engineered for online brands and enterprises.
              </p>
            </div>

            <div className={styles.pricingGrid}>
              {/* Card 1 */}
              <div className={styles.pricingCard}>
                <div className={styles.pricingCardTag}>Intra-City</div>
                <h3 className={styles.pricingTitle}>Express Delivery</h3>
                <div className={styles.pricingPrice}>NPR 120</div>
                <ul className={styles.pricingFeatureList}>
                  <li className={styles.pricingFeatureItem}><span style={{ color: '#027196' }}>✓</span> Kathmandu Valley (&lt; 4 Hours)</li>
                  <li className={styles.pricingFeatureItem}><span style={{ color: '#027196' }}>✓</span> Free Doorstep Collection</li>
                  <li className={styles.pricingFeatureItem}><span style={{ color: '#027196' }}>✓</span> Real-time GPS Telemetry</li>
                  <li className={styles.pricingFeatureItem}><span style={{ color: '#027196' }}>✓</span> Digital e-POD Signature</li>
                </ul>
                <Link href="/public/merchant-register" className={`${styles.pricingBtn} ${styles.pricingBtnSecondary}`}>Get Started</Link>
              </div>

              {/* Card 2 — Featured */}
              <div className={`${styles.pricingCard} ${styles.pricingCardFeatured}`}>
                <div className={styles.pricingBadge}>MOST POPULAR</div>
                <div className={styles.pricingCardTag} style={{ color: '#FFD026' }}>Inter-District</div>
                <h3 className={styles.pricingTitle}>Standard Delivery</h3>
                <div className={styles.pricingPrice}>NPR 180</div>
                <ul className={styles.pricingFeatureList}>
                  <li className={styles.pricingFeatureItem}><span style={{ color: '#FFD026' }}>✓</span> All 77 Districts Covered</li>
                  <li className={styles.pricingFeatureItem}><span style={{ color: '#FFD026' }}>✓</span> 24–48 Hours Delivery SLA</li>
                  <li className={styles.pricingFeatureItem}><span style={{ color: '#FFD026' }}>✓</span> Same-Day COD Settlement</li>
                  <li className={styles.pricingFeatureItem}><span style={{ color: '#FFD026' }}>✓</span> Barcode Hub Sorting</li>
                </ul>
                <Link href="/public/merchant-register" className={`${styles.pricingBtn} ${styles.pricingBtnPrimary}`}>Start Shipping Now</Link>
              </div>

              {/* Card 3 */}
              <div className={styles.pricingCard}>
                <div className={styles.pricingCardTag}>Enterprise</div>
                <h3 className={styles.pricingTitle}>Custom Logistics</h3>
                <div className={styles.pricingPrice}>Custom</div>
                <ul className={styles.pricingFeatureList}>
                  <li className={styles.pricingFeatureItem}><span style={{ color: '#027196' }}>✓</span> Dedicated Account Manager</li>
                  <li className={styles.pricingFeatureItem}><span style={{ color: '#027196' }}>✓</span> Custom API & Webhooks</li>
                  <li className={styles.pricingFeatureItem}><span style={{ color: '#027196' }}>✓</span> Volume Rate Discounts</li>
                  <li className={styles.pricingFeatureItem}><span style={{ color: '#027196' }}>✓</span> Priority SLA Guarantee</li>
                </ul>
                <Link href="/site/contact" className={`${styles.pricingBtn} ${styles.pricingBtnSecondary}`}>Contact Sales</Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* --------------------------------------------------------------------
         SLIDE 6: CTA BANNER + FOOTER COMBINED
         -------------------------------------------------------------------- */}
      <div className={styles.slideItem} style={{ background: isDark ? '#060D14' : '#F0F4F8', padding: 0, flexDirection: 'column', justifyContent: 'space-between', overflowY: 'auto' }}>

        {/* CTA — full width hero section */}
        <section id="cta" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 48px 36px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
          {/* Background glow orbs */}
          <div style={{ position: 'absolute', top: '10%', left: '25%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(2,113,150,0.15) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '5%', right: '20%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,208,38,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 720 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,208,38,0.1)', border: '1px solid rgba(255,208,38,0.25)', borderRadius: 999, padding: '5px 14px', marginBottom: 20 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFD026', display: 'inline-block' }}></span>
              <span style={{ fontSize: 11, fontWeight: 900, color: '#FFD026', letterSpacing: '0.12em' }}>START FOR FREE TODAY</span>
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 48px)', fontWeight: 950, letterSpacing: '-0.03em', color: tc, margin: '0 0 14px', lineHeight: 1.15 }}>Ready to Upgrade Your<br />Courier Operations?</h2>
            <p style={{ fontSize: 16, color: mc, margin: '0 auto 28px', lineHeight: 1.6, maxWidth: 500 }}>Join online sellers and businesses who trust Tukaatu Express for fast, trackable courier fulfillment.</p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
              <Link href="/public/merchant-register" style={{ background: '#FFD026', color: '#071722', padding: '14px 32px', borderRadius: 999, fontWeight: 900, textDecoration: 'none', boxShadow: '0 6px 20px rgba(255,208,38,0.35)', fontSize: 15 }}>
                Create Free Account →
              </Link>
              <Link href="/login" style={{ background: inputBg, color: tc, padding: '14px 32px', borderRadius: 999, fontWeight: 800, textDecoration: 'none', border: `1px solid ${cardBorder}`, fontSize: 15 }}>
                Login to Dashboard
              </Link>
            </div>
            {/* Trust stats */}
            <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap', paddingTop: 20, borderTop: `1px solid ${cardBorder}` }}>
              {[['500+', 'Active Merchants'], ['77', 'Districts Covered'], ['99.8%', 'Uptime SLA'], ['< 4hrs', 'City Delivery']].map(([val, label]) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: tc }}>{val}</div>
                  <div style={{ fontSize: 11, color: mc2, fontWeight: 600, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ width: '100%', padding: '20px 48px 24px', boxSizing: 'border-box', borderTop: `1px solid ${cardBorder}` }}>
          <div style={{ maxWidth: 1320, margin: '0 auto' }}>
            <div className={styles.footerGrid}>
              {/* Brand Column */}
              <div className={styles.footerBrandCol}>
                <Link href="/" className={styles.footerLogoWrap} style={{ display: 'flex', alignItems: 'center' }}>
                  <img src="/logo-full.png" alt="Tukaatu Express" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
                </Link>
                <p className={styles.footerBrandDesc}>
                  Nepal's Next-Generation Logistics OS. Unifying live parcel tracking, same-day COD cash settlement, and AI route optimization into one SaaS platform.
                </p>
                <div className={styles.footerStatusBadge}>
                  <span className={styles.liveDotGreen}></span> System Status: 100% Operational
                </div>
              </div>

              {/* Column 2: Navigation */}
              <div>
                <div className={styles.footerColTitle}>Navigation</div>
                <div className={styles.footerLinkList}>
                  <button onClick={() => setCurrentSlide(0)} className={styles.footerLink} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit', padding: 0 }}>Overview</button>
                  <button onClick={() => setCurrentSlide(1)} className={styles.footerLink} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit', padding: 0 }}>Technology</button>
                  <button onClick={() => setCurrentSlide(2)} className={styles.footerLink} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit', padding: 0 }}>Merchant Platform</button>
                  <button onClick={() => setCurrentSlide(3)} className={styles.footerLink} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit', padding: 0 }}>77 Districts Network</button>
                  <button onClick={() => setCurrentSlide(4)} className={styles.footerLink} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit', padding: 0 }}>Pricing Plans</button>
                </div>
              </div>

              {/* Column 3: Logistics OS */}
              <div>
                <div className={styles.footerColTitle}>Logistics OS</div>
                <div className={styles.footerLinkList}>
                  <span className={styles.footerLink}>Intra-City SLA (&lt; 4 Hrs)</span>
                  <span className={styles.footerLink}>Barcode Hub Sorting</span>
                  <span className={styles.footerLink}>Automated Same-Day COD</span>
                  <span className={styles.footerLink}>Digital e-POD Signatures</span>
                  <span className={styles.footerLink}>Live GPS Telemetry</span>
                </div>
              </div>

              {/* Column 4: Access & Support */}
              <div>
                <div className={styles.footerColTitle}>Portals & Access</div>
                <div className={styles.footerLinkList}>
                  <Link href="/login" className={styles.footerLink}>Merchant Portal →</Link>
                  <Link href="/login" className={styles.footerLink}>Admin Console</Link>
                  <Link href="/site/contact" className={styles.footerLink}>Help & Support</Link>
                  <Link href="/public/merchant-register" className={styles.footerLink}>Register New Store</Link>
                </div>
              </div>
            </div>

            <div className={styles.footerBottom}>
              <div>© {new Date().getFullYear()} Tukaatu Express. All rights reserved.</div>
              <div className={styles.footerBottomLinks}>
                <a href="#" className={styles.footerBottomLink}>Privacy Policy</a>
                <a href="#" className={styles.footerBottomLink}>Terms of Service</a>
                <a href="#" className={styles.footerBottomLink}>Security & Audit</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
      </div>
    </div>
  );
}