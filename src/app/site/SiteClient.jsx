"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./site.module.css";
import dynamic from "next/dynamic";
import api from "@/lib/api";

const TrackingMap = dynamic(() => import("./components/TrackingMap"), { ssr: false });
const CoverageMap = dynamic(() => import("./components/CoverageMap"), { ssr: false });

// Slides Labels matching reference UI
const SLIDE_LABELS = ['Home', 'Services', 'Process', 'Merchants', 'Gallery', 'Coverage', 'Contact'];

const SERVICES_DATA = [
  { title: 'Express Delivery', desc: 'Fast courier delivery for urgent and regular parcels.' },
  { title: 'Merchant Logistics', desc: 'Delivery workflow for online shops and sellers.' },
  { title: 'POD Collection', desc: 'Track cash collection and merchant settlements.' },
  { title: 'Pickup Management', desc: 'Create and manage pickup requests easily.' },
  { title: 'Branch Dispatch', desc: 'Move parcels between hubs, branches and delivery zones.' },
  { title: 'Live Tracking', desc: 'Keep customers updated with clear parcel status.' },
];

const FLOW_DATA = [
  { num: '01', title: 'Create Shipment', desc: 'Customer or merchant creates a parcel request.' },
  { num: '02', title: 'Pickup', desc: 'Parcel is collected from sender or merchant.' },
  { num: '03', title: 'Dispatch', desc: 'Parcel moves through branch and rider workflow.' },
  { num: '04', title: 'Delivered', desc: 'Delivery is completed with POD settlement if needed.' },
];

const MERCHANT_FEATURES = [
  'Bulk shipment creation',
  'Pickup request workflow',
  'POD and settlement reports',
  'Delivery status updates',
  'Branch and rider assignment',
  'Merchant dashboard access',
];

const MERCHANT_STATS = [
  { label: 'Total Parcels', value: '1,248' },
  { label: 'Out Delivery', value: '86' },
  { label: 'POD Pending', value: 'NPR 245K' },
  { label: 'Settled', value: 'NPR 1.2M' },
];

const GALLERY_DATA = [
  { src: '/images/delivey.png', caption: 'rider with parcel on scooter' },
  { src: '/images/wharehouse.png', caption: 'branch sorting warehouse' },
  { src: '/images/door.png', caption: 'delivery confirmation at doorstep' },
];

const CITIES_DATA = ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Chitwan', 'Biratnagar', 'Butwal', 'Nepalgunj'];

const MAP_PINS = [
  { name: 'Nepalgunj', x: 50, y: 190, labelOffset: -18 },
  { name: 'Butwal', x: 140, y: 150, labelOffset: -18 },
  { name: 'Pokhara', x: 230, y: 170, labelOffset: -18 },
  { name: 'Chitwan', x: 320, y: 110, labelOffset: -18 },
  { name: 'Kathmandu', x: 400, y: 95, labelOffset: -18 },
  { name: 'Bhaktapur', x: 440, y: 80, labelOffset: -18 },
  { name: 'Lalitpur', x: 400, y: 130, labelOffset: 22 },
  { name: 'Biratnagar', x: 550, y: 140, labelOffset: -18 },
];

export default function SiteClient() {
  const containerRef = useRef(null);
  const slideRefs = useRef([]);

  // States
  const [activeSlide, setActiveSlide] = useState(0);
  const [heroIn, setHeroIn] = useState(false);
  const [visible, setVisible] = useState({});

  const [trackingNumber, setTrackingNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [activeTracking, setActiveTracking] = useState({
    id: "TKX-2048",
    status: "Out for delivery",
    statusSub: "Rider assigned",
    origin: "Bhaktapur",
    destination: "Lalitpur",
    stagesText: "Pickup collected in Kathmandu"
  });

  const sanitizeCityName = (name) => {
    if (!name) return "Kathmandu";
    const lower = name.toLowerCase();
    if (lower.includes("kathmandu")) return "Kathmandu";
    if (lower.includes("lalitpur")) return "Lalitpur";
    if (lower.includes("bhaktapur")) return "Bhaktapur";
    if (lower.includes("pokhara")) return "Pokhara";
    if (lower.includes("chitwan") || lower.includes("bharatpur")) return "Chitwan";
    if (lower.includes("butwal")) return "Butwal";
    if (lower.includes("nepalgunj")) return "Nepalgunj";
    if (lower.includes("biratnagar")) return "Biratnagar";
    return "Kathmandu";
  };

  const handleTrack = async (e) => {
    e?.preventDefault();
    if (!trackingNumber.trim()) return;

    setIsLoading(true);
    setSearchError(null);
    try {
      const res = await api.get(`/public/track/${trackingNumber.trim()}`);
      const data = res.data.data;
      if (data) {
        const events = data.events || [];
        const latestEvent = events[events.length - 1] || {};
        setActiveTracking({
          id: data.tracking_number,
          status: data.status ? data.status.replace(/_/g, " ") : "In Transit",
          statusSub: latestEvent.description || "In progress",
          origin: sanitizeCityName(data.origin_branch?.name),
          destination: sanitizeCityName(data.destination_branch?.name),
          stagesText: latestEvent.description ? `${latestEvent.description}` : "Shipment processed"
        });
      } else {
        setSearchError("No parcel found with this tracking ID.");
      }
    } catch (err) {
      setSearchError(err?.response?.data?.message || "Tracking ID not found.");
    } finally {
      setIsLoading(false);
    }
  };

  // Entrance animations trigger
  useEffect(() => {
    const timer = setTimeout(() => setHeroIn(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Intersection Observer for Slide Elements Reveal
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const key = entry.target.dataset.revealKey;
          setVisible((prev) => ({ ...prev, [key]: true }));
        }
      });
    }, { threshold: 0.12 });

    slideRefs.current.forEach((el, i) => {
      if (el) {
        el.dataset.revealKey = `slide-${i}`;
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, []);

  // Handle Horizontal/Vertical Presentation Scroll
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    let idx = 0;
    slideRefs.current.forEach((el, i) => {
      if (el) {
        const offset = window.innerWidth <= 980 ? el.offsetTop - 80 : el.offsetLeft - 80;
        const currentScroll = window.innerWidth <= 980 ? scrollTop : scrollLeft;
        if (offset <= currentScroll) {
          idx = i;
        }
      }
    });
    if (idx !== activeSlide) {
      setActiveSlide(idx);
    }
  };

  // Jump to specific slide
  const goToSlide = (i) => {
    const container = containerRef.current;
    const el = slideRefs.current[i];
    if (container && el) {
      if (window.innerWidth <= 980) {
        container.scrollTo({ top: el.offsetTop, behavior: "smooth" });
      } else {
        container.scrollTo({ left: el.offsetLeft, behavior: "smooth" });
      }
      setActiveSlide(i);
    }
  };

  const goPrev = () => {
    goToSlide(Math.max(0, activeSlide - 1));
  };

  const goNext = () => {
    goToSlide(Math.min(SLIDE_LABELS.length - 1, activeSlide + 1));
  };

  // Visibility reveal style helper
  const getRevealStyle = (key, delay = 0) => {
    const shown = !!visible[key] || heroIn; // Fallback to heroIn for instant feel if needed
    return {
      opacity: shown ? 1 : 0,
      transform: `translateY(${shown ? 0 : 26}px)`,
      transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`
    };
  };

  const heroStyle = (delay) => ({
    opacity: heroIn ? 1 : 0,
    transform: `translateY(${heroIn ? 0 : 18}px)`,
    transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`
  });

  return (
    <main className={styles.site}>
      {/* HEADER / NAVIGATION */}
      <header className={styles.header} style={{ padding: "14px 64px" }}>
        <Link href="/" className={styles.logoWrap} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0px", textDecoration: "none", lineHeight: 1 }}>
          <div style={{
            height: "38px",
            width: "170px",
            overflow: "hidden",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <img
              src="/images/logo.png"
              alt="Tukaatu Logo"
              style={{
                width: "200px",
                height: "auto",
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                mixBlendMode: "multiply",
                display: "block"
              }}
            />
          </div>
          <span style={{
            fontSize: "11px",
            fontWeight: "900",
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "var(--primary)",
            marginTop: "1px",
            textAlign: "center",
            display: "block"
          }}>
            Express
          </span>
        </Link>
        <nav className={styles.nav}>
          <button onClick={() => goToSlide(0)} className={styles.navLink} style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: activeSlide === 0 ? '#14161C' : '#40444E', fontWeight: 600 }}>Home</button>
          <button onClick={() => goToSlide(1)} className={styles.navLink} style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: activeSlide === 1 ? '#14161C' : '#40444E', fontWeight: 600 }}>Services</button>
          <button onClick={() => goToSlide(2)} className={styles.navLink} style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: activeSlide === 2 ? '#14161C' : '#40444E', fontWeight: 600 }}>Process</button>
          <button onClick={() => goToSlide(5)} className={styles.navLink} style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: activeSlide === 5 ? '#14161C' : '#40444E', fontWeight: 600 }}>Coverage</button>
        </nav>
        <Link href="/login" className={styles.loginBtn}>
          Login
        </Link>
      </header>

      {/* BOTTOM DOTS INDICATORS */}
      <div className={styles.slideDots}>
        {SLIDE_LABELS.map((label, i) => (
          <div
            key={label}
            onClick={() => goToSlide(i)}
            title={label}
            className={styles.dot}
            style={{
              width: activeSlide === i ? "12px" : "8px",
              height: activeSlide === i ? "12px" : "8px",
              backgroundColor: activeSlide === i ? "#2A6FDB" : "rgba(20, 22, 28, 0.18)"
            }}
          ></div>
        ))}
      </div>

      {/* SIDE ARROWS */}
      <button
        onClick={goPrev}
        className={`${styles.arrowBtn} ${styles.arrowBtnPrev}`}
        style={{ opacity: activeSlide === 0 ? 0.35 : 1 }}
        disabled={activeSlide === 0}
      >
        ←
      </button>
      <button
        onClick={goNext}
        className={`${styles.arrowBtn} ${styles.arrowBtnNext}`}
        style={{ opacity: activeSlide === SLIDE_LABELS.length - 1 ? 0.35 : 1 }}
        disabled={activeSlide === SLIDE_LABELS.length - 1}
      >
        →
      </button>

      {/* HORIZONTAL SNAP CONTAINER */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={styles.slidesContainer}
      >
        {/* SLIDE 1 - HERO */}
        <section
          ref={(el) => (slideRefs.current[0] = el)}
          className={`${styles.slideSection} ${styles.heroSlide}`}
        >
          <div className={styles.heroGlowBlue}></div>
          <div className={styles.heroGlowGold}></div>

          <div className={styles.heroLayout}>
            <div>
              <div className={styles.heroBadge} style={heroStyle(0)}>
                <span className={styles.heroBadgeDot}></span>
                <span>Nepal courier delivery gateway</span>
              </div>
              <h1 className={styles.heroTitle} style={heroStyle(0.08)}>
                Fast, reliable courier delivery built for modern Nepal.
              </h1>
              <p className={styles.heroCopy} style={heroStyle(0.16)}>
                Tukaatu Express helps customers, merchants and delivery teams send, track and manage parcels with a smarter delivery platform.
              </p>
              <form onSubmit={handleTrack} style={{ ...heroStyle(0.24), marginTop: "24px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", width: "100%", maxWidth: "480px" }}>
                  <input
                    type="text"
                    placeholder="Enter tracking ID (e.g. TKX-2048)"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "16px 20px",
                      borderRadius: "999px",
                      border: "1px solid #E5E8EE",
                      fontSize: "15px",
                      outline: "none",
                      boxShadow: "0 4px 12px rgba(20, 22, 28, 0.04)"
                    }}
                  />
                  <button
                    type="submit"
                    className={styles.heroPrimaryBtn}
                    style={{ border: "none", cursor: "pointer", padding: "16px 28px", flexShrink: 0 }}
                    disabled={isLoading}
                  >
                    {isLoading ? "Tracking..." : "Track"}
                  </button>
                </div>
                {searchError && (
                  <div style={{ color: "#E11D48", fontSize: "13px", fontWeight: "600", marginTop: "8px", paddingLeft: "16px" }}>
                    ⚠️ {searchError}
                  </div>
                )}
              </form>
              <div className={styles.heroStatsRow} style={heroStyle(0.32)}>
                <div className={styles.heroStatItem}>
                  <div className={styles.heroStatIcon} style={{ backgroundColor: "#E8F0FE" }}></div>
                  <div className={styles.heroStatLabel}>
                    Real-time<br />
                    <span className={styles.heroStatSub}>shipment tracking</span>
                  </div>
                </div>
                <div className={styles.heroStatItem}>
                  <div className={styles.heroStatIcon} style={{ backgroundColor: "#FFF6DE" }}></div>
                  <div className={styles.heroStatLabel}>
                    POD<br />
                    <span className={styles.heroStatSub}>collection support</span>
                  </div>
                </div>
                <div className={styles.heroStatItem}>
                  <div className={styles.heroStatIcon} style={{ backgroundColor: "#E8F0FE" }}></div>
                  <div className={styles.heroStatLabel}>
                    Merchant<br />
                    <span className={styles.heroStatSub}>delivery dashboard</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ position: "relative" }}>
              <div
                className={styles.trackingPreviewCard}
                style={{
                  opacity: heroIn ? 1 : 0,
                  transform: `scale(${heroIn ? 1 : 0.96})`,
                  transition: "opacity 0.9s ease 0.15s, transform 0.9s ease 0.15s"
                }}
              >
                {/* Live Leaflet Route Map */}
                <TrackingMap fromCity={activeTracking.origin} toCity={activeTracking.destination} />

                <div className={styles.trackingCardHeader} style={{ position: "relative", zIndex: 10 }}>
                  <div className={styles.trackingHeaderTitle}>Tracking ID</div>
                  <div className={styles.trackingHeaderId}>{activeTracking.id}</div>
                </div>
                <div className={styles.trackingStatusRow} style={{ position: "relative", zIndex: 10 }}>
                  <div className={`${styles.statusIndicatorDot} ${styles.pingAnim}`}></div>
                  <div>
                    <div className={styles.statusTitle} style={{ textTransform: "capitalize" }}>{activeTracking.status}</div>
                    <div className={styles.statusSub}>{activeTracking.statusSub}</div>
                  </div>
                </div>
                <div className={styles.routePointsRow} style={{ position: "relative", zIndex: 10 }}>
                  <div className={styles.routeCol}>
                    <div className={styles.routeLabel}>From</div>
                    <div className={styles.routeName}>{activeTracking.origin}</div>
                  </div>
                  <div className={styles.routeLine}></div>
                  <div className={styles.routeCol} style={{ textAlign: "right" }}>
                    <div className={styles.routeLabel}>To</div>
                    <div className={styles.routeName}>{activeTracking.destination}</div>
                  </div>
                </div>
                <div className={styles.trackingFooter} style={{ position: "relative", zIndex: 10 }}>
                  Latest Event: <span className={styles.trackingFooterHighlight}>{activeTracking.stagesText}</span>
                </div>
              </div>

              {/* Floating delivered badge */}
              <div
                className={`${styles.floatingDeliveredCard} ${styles.floatAnim}`}
                style={{
                  opacity: heroIn ? 1 : 0,
                  transform: `translateY(${heroIn ? 0 : 14}px)`,
                  transition: "opacity 0.7s ease 0.55s, transform 0.7s ease 0.55s"
                }}
              >
                <div className={styles.deliveredIconBox}>
                  <div className={styles.deliveredIconDot}></div>
                </div>
                <div>
                  <div className={styles.deliveredCardTitle}>Delivered</div>
                  <div className={styles.deliveredCardSub}>98.4% on-time</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SLIDE 2 - SERVICES */}
        <section
          ref={(el) => (slideRefs.current[1] = el)}
          className={`${styles.slideSection} ${styles.servicesSlide}`}
        >
          <div className={styles.servicesInner}>
            <div className={styles.slideHeaderCenter}>
              <div className={styles.headerCategoryLabel}>What we do</div>
              <h2 className={styles.slideHeading}>
                Courier operations made smoother, faster and more transparent.
              </h2>
              <p className={styles.slideSubtitle}>
                From pickup to final delivery, Tukaatu Express gives customers and businesses a reliable way to move parcels with full visibility.
              </p>
            </div>

            <div className={styles.servicesGrid}>
              {SERVICES_DATA.map((svc, i) => (
                <div
                  key={svc.title}
                  className={styles.serviceCard}
                  style={getRevealStyle(`service-${i}`, (i % 3) * 0.08)}
                >
                  <div className={styles.serviceIconBox}>
                    <div className={styles.serviceIconDot}></div>
                  </div>
                  <h3 className={styles.serviceCardTitle}>{svc.title}</h3>
                  <p className={styles.serviceCardDesc}>{svc.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SLIDE 3 - DELIVERY FLOW */}
        <section
          ref={(el) => (slideRefs.current[2] = el)}
          className={`${styles.slideSection} ${styles.flowSlide}`}
        >
          <div className={styles.flowInner}>
            <div className={styles.slideHeaderCenter}>
              <div className={styles.headerCategoryLabel}>Delivery flow</div>
              <h2 className={styles.slideHeading}>From booking to doorstep, every step is trackable.</h2>
            </div>
            <div className={styles.flowGrid}>
              {FLOW_DATA.map((f, i) => (
                <div
                  key={f.num}
                  className={styles.flowCard}
                  style={getRevealStyle(`flow-${i}`, i * 0.08)}
                >
                  <div className={styles.flowCardNum}>{f.num}</div>
                  <h3 className={styles.flowCardTitle}>{f.title}</h3>
                  <p className={styles.flowCardDesc}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SLIDE 4 - FOR MERCHANTS */}
        <section
          ref={(el) => (slideRefs.current[3] = el)}
          className={`${styles.slideSection} ${styles.merchantsSlide}`}
        >
          <div className={styles.merchantsInner}>
            <div className={styles.merchantsLayout}>
              <div>
                <div className={styles.headerCategoryLabel}>For merchants</div>
                <h2 className={styles.merchantsHeading}>Built for online sellers, shops and growing businesses.</h2>
                <p className={styles.merchantsCopy}>
                  Merchants can create shipments, request pickups, track POD, monitor invoices and manage parcel delivery from one dashboard.
                </p>
                <div className={styles.merchantsFeaturesList}>
                  {MERCHANT_FEATURES.map((mf) => (
                    <div key={mf} className={styles.merchantFeatureItem}>
                      <div className={styles.featureDot}></div>
                      <span className={styles.featureText}>{mf}</span>
                    </div>
                  ))}
                </div>
                <Link href="/login" className={styles.merchantActionBtn}>
                  Merchant login
                </Link>
              </div>

              <div className={styles.merchantPanelMockup}>
                <div className={styles.panelHeader}>
                  <span className={styles.panelHeaderTitle}>Merchant Panel</span>
                  <span className={styles.panelHeaderLive}>
                    <span className={styles.panelHeaderLiveDot}></span>Live
                  </span>
                </div>
                <div className={styles.panelStatsGrid}>
                  {MERCHANT_STATS.map((stat) => (
                    <div key={stat.label} className={styles.panelStatCard}>
                      <div className={styles.panelStatLabel}>{stat.label}</div>
                      <div className={styles.panelStatValue}>{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SLIDE 5 - GALLERY */}
        <section
          ref={(el) => (slideRefs.current[4] = el)}
          className={`${styles.slideSection} ${styles.gallerySlide}`}
        >
          <div className={styles.galleryInner}>
            <div className={styles.slideHeaderCenter} style={{ marginBottom: "56px" }}>
              <div className={styles.headerCategoryLabel}>In action</div>
              <h2 className={styles.slideHeading}>A network built to move fast.</h2>
            </div>
            <div className={styles.galleryGrid}>
              {GALLERY_DATA.map((photo, i) => (
                <div
                  key={photo.caption}
                  className={styles.galleryCard}
                  style={getRevealStyle(`gallery-${i}`, i * 0.1)}
                >
                  <img
                    src={photo.src}
                    alt={photo.caption}
                    className={styles.galleryImage}
                  />
                  <div className={styles.galleryOverlay}></div>
                  <span className={styles.galleryLabel}>
                    {photo.caption}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SLIDE 6 - COVERAGE */}
        <section
          ref={(el) => (slideRefs.current[5] = el)}
          className={`${styles.slideSection} ${styles.coverageSlide}`}
        >
          <div className={styles.coverageInner}>
            <div className={styles.slideHeaderCenter} style={{ marginBottom: "64px" }}>
              <div className={styles.headerCategoryLabel} style={{ color: "#F4B740" }}>Coverage</div>
              <h2 className={styles.slideHeading} style={{ color: "#FFFFFF" }}>
                Serving Kathmandu and expanding across Nepal.
              </h2>
              <p className={styles.slideSubtitle} style={{ color: "#A9B3C4" }}>
                Built for city, branch and zone-based delivery operations across the country.
              </p>
            </div>

            <div className={styles.coverageMapLayout}>
              <div className={styles.mapContainer}>
                {/* SVG Connections */}
                <svg viewBox="0 0 600 300" className={styles.coverageSvg}>
                  <path d="M 50 190 L 140 150 L 230 170 L 320 110 L 400 95 L 480 100 L 550 140" fill="none" className={styles.svgMapLine}></path>
                  {MAP_PINS.map((pin, i) => (
                    <circle key={i} cx={pin.x} cy={pin.y} r="6" fill="#F4B740"></circle>
                  ))}
                </svg>

                {/* Absolutely positioned HTML Label Overlays */}
                {MAP_PINS.map((pin, i) => (
                  <div
                    key={i}
                    className={styles.mapPinElement}
                    style={{
                      left: `calc(32px + (${pin.x} / 600) * (100% - 64px))`,
                      top: `calc(32px + (${pin.y} / 300) * (100% - 64px))`,
                    }}
                  >
                    <div className={styles.mapPinIndicator}></div>
                    <div className={styles.mapPinLabel} style={{ transform: `translateY(${pin.labelOffset}px)` }}>
                      {pin.name}
                    </div>
                  </div>
                ))}
              </div>

              {/* Real interactive Google-style Coverage Map */}
              <CoverageMap />
            </div>
          </div>
        </section>

        {/* SLIDE 7 - CTA & FOOTER */}
        <section
          ref={(el) => (slideRefs.current[6] = el)}
          className={`${styles.slideSection} ${styles.ctaSlide}`}
        >
          {/* Neon Glow Blobs */}
          <div className={styles.ctaGlowGold}></div>
          <div className={styles.ctaGlowWhite}></div>

          <div className={styles.ctaInner}>
            <div className={styles.ctaPanel}>
              <h2 className={styles.ctaHeading}>Ready to manage deliveries smarter?</h2>
              <p className={styles.ctaCopy}>
                Login to the Tukaatu Express dashboard to manage shipments, merchants, branches, riders, POD and delivery reports.
              </p>
              <div className={styles.ctaButtons}>
                <Link href="/login" className={styles.ctaPrimaryBtn}>
                  Login to dashboard
                </Link>
                <Link href="/site/contact" className={styles.ctaSecondaryBtn}>
                  Contact us
                </Link>
              </div>
            </div>
          </div>

          {/* SITE FOOTER */}
          <footer className={styles.footer}>
            <div className={styles.footerInner}>
              <div className={styles.footerBrandCol} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0px" }}>
                <div style={{
                  height: "28px",
                  width: "130px",
                  overflow: "hidden",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <img
                    src="/images/logo.png"
                    alt="Tukaatu Logo"
                    style={{
                      width: "150px",
                      height: "auto",
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      mixBlendMode: "multiply",
                      display: "block"
                    }}
                  />
                </div>
                <span style={{ fontSize: "9px", fontWeight: "900", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--accent)", marginTop: "1px", display: "block" }}>Express</span>
                <span className={styles.footerCopyright} style={{ marginTop: "8px" }}>© 2026. All rights reserved.</span>
              </div>
              <nav className={styles.footerLinks}>
                <Link href="/site/services">Services</Link>
                <Link href="/site/tracking">Track shipment</Link>
                <Link href="/login">Login</Link>
                <Link href="/site/contact">Contact</Link>
              </nav>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}