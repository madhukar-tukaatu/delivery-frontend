"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./site.module.css";

gsap.registerPlugin(ScrollTrigger);

export default function SiteClient() {
  const rootRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(`.${styles.header}`, {
        y: -40,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
      });

      gsap.from(`.${styles.heroText} > *`, {
        y: 42,
        opacity: 0,
        duration: 1,
        stagger: 0.14,
        ease: "power3.out",
      });

      gsap.from(`.${styles.logoOrb}`, {
        scale: 0.7,
        opacity: 0,
        rotate: -8,
        duration: 1.2,
        ease: "elastic.out(1, 0.7)",
      });

      gsap.to(`.${styles.logoOrb}`, {
        y: -18,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(`.${styles.parcelOne}`, {
        y: -20,
        x: 10,
        duration: 3.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(`.${styles.parcelTwo}`, {
        y: 18,
        x: -8,
        duration: 3.8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(`.${styles.heroGlow}`, {
        scale: 1.12,
        opacity: 0.85,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.utils.toArray(`.${styles.reveal}`).forEach((el) => {
        gsap.from(el, {
          y: 70,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 82%",
          },
        });
      });

      gsap.utils.toArray(`.${styles.serviceCard}`).forEach((el, index) => {
        gsap.from(el, {
          y: 60,
          opacity: 0,
          duration: 0.9,
          delay: index * 0.04,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
          },
        });
      });

      gsap.from(`.${styles.routeProgress}`, {
        width: "0%",
        duration: 1.5,
        ease: "power3.out",
        scrollTrigger: {
          trigger: `.${styles.deliveryFlow}`,
          start: "top 72%",
        },
      });

      gsap.utils.toArray(`.${styles.step}`).forEach((el, index) => {
        gsap.from(el, {
          y: 50,
          opacity: 0,
          duration: 0.8,
          delay: index * 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: `.${styles.deliveryFlow}`,
            start: "top 72%",
          },
        });
      });

      gsap.to(`.${styles.bannerTrack}`, {
        xPercent: -50,
        duration: 18,
        ease: "none",
        repeat: -1,
      });

      gsap.utils.toArray(`.${styles.parallax}`).forEach((el) => {
        gsap.to(el, {
          yPercent: -18,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <main ref={rootRef} className={styles.site}>
      <Header />

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.badge}>Nepal Courier Delivery Gateway</span>

          <h1>
            Fast, reliable courier delivery built for modern Nepal.
          </h1>

          <p>
            Tukaatu Express helps customers, merchants and delivery teams send,
            track and manage parcels with a smarter delivery platform.
          </p>

          <div className={styles.heroActions}>
            <Link href="/site/tracking" className={styles.primaryBtn}>
              Track Shipment
            </Link>

            <Link href="/login" className={styles.secondaryBtn}>
              Login to Dashboard
            </Link>
          </div>

          <div className={styles.heroStats}>
            <div>
              <strong>Real-time</strong>
              <span>Shipment Tracking</span>
            </div>
            <div>
              <strong>COD</strong>
              <span>Collection Support</span>
            </div>
            <div>
              <strong>Merchant</strong>
              <span>Delivery Dashboard</span>
            </div>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.heroGlow}></div>

          <div className={styles.logoOrb}>
            <Image
              src="/images/tukaatu-logo.png"
              alt="Tukaatu Express Logo"
              width={270}
              height={270}
              priority
            />
          </div>

          <div className={`${styles.floatingCard} ${styles.parcelOne}`}>
            <span>Pickup</span>
            <strong>Kathmandu</strong>
            <small>Parcel collected</small>
          </div>

          <div className={`${styles.floatingCard} ${styles.parcelTwo}`}>
            <span>Status</span>
            <strong>Out for Delivery</strong>
            <small>Rider assigned</small>
          </div>

          <div className={styles.trackingCard}>
            <div className={styles.trackingTop}>
              <span>Tracking ID</span>
              <strong>TKX-2048</strong>
            </div>

            <div className={styles.mapLine}>
              <div className={styles.mapDot}></div>
              <div className={styles.mapRoad}></div>
              <div className={styles.mapDot}></div>
            </div>

            <div className={styles.trackingRows}>
              <div>
                <span>From</span>
                <strong>Bhaktapur</strong>
              </div>
              <div>
                <span>To</span>
                <strong>Lalitpur</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.banner}>
        <div className={styles.bannerTrack}>
          <span>Fast Pickup</span>
          <span>Live Tracking</span>
          <span>COD Settlement</span>
          <span>Merchant Dashboard</span>
          <span>Branch Dispatch</span>
          <span>Delivery Confirmation</span>
          <span>Fast Pickup</span>
          <span>Live Tracking</span>
          <span>COD Settlement</span>
          <span>Merchant Dashboard</span>
          <span>Branch Dispatch</span>
          <span>Delivery Confirmation</span>
        </div>
      </section>

      <section className={`${styles.section} ${styles.reveal}`}>
        <div className={styles.sectionHeader}>
          <span>What We Do</span>
          <h2>Courier operations made smoother, faster and more transparent.</h2>
          <p>
            From pickup to final delivery, Tukaatu Express gives customers and
            businesses a reliable way to move parcels with full visibility.
          </p>
        </div>

        <div className={styles.serviceGrid}>
          <Service title="Express Delivery" text="Fast courier delivery for urgent and regular parcels." />
          <Service title="Merchant Logistics" text="Delivery workflow for online shops and sellers." />
          <Service title="COD Collection" text="Track cash collection and merchant settlements." />
          <Service title="Pickup Management" text="Create and manage pickup requests easily." />
          <Service title="Branch Dispatch" text="Move parcels between hubs, branches and delivery zones." />
          <Service title="Live Tracking" text="Keep customers updated with clear parcel status." />
        </div>
      </section>

      <section className={`${styles.deliveryFlow} ${styles.reveal}`}>
        <div className={styles.sectionHeader}>
          <span>Delivery Flow</span>
          <h2>From booking to doorstep, every step is trackable.</h2>
        </div>

        <div className={styles.routeBar}>
          <div className={styles.routeProgress}></div>
        </div>

        <div className={styles.steps}>
          <div className={styles.step}>
            <span>01</span>
            <h3>Create Shipment</h3>
            <p>Customer or merchant creates a parcel request.</p>
          </div>

          <div className={styles.step}>
            <span>02</span>
            <h3>Pickup</h3>
            <p>Parcel is collected from sender or merchant.</p>
          </div>

          <div className={styles.step}>
            <span>03</span>
            <h3>Dispatch</h3>
            <p>Parcel moves through branch and rider workflow.</p>
          </div>

          <div className={styles.step}>
            <span>04</span>
            <h3>Delivered</h3>
            <p>Delivery is completed with COD settlement if needed.</p>
          </div>
        </div>
      </section>

      <section className={styles.merchantSection}>
        <div className={`${styles.merchantText} ${styles.reveal}`}>
          <span className={styles.badge}>For Merchants</span>
          <h2>Built for online sellers, shops and growing businesses.</h2>
          <p>
            Merchants can create shipments, request pickups, track COD, monitor
            invoices and manage parcel delivery from one dashboard.
          </p>

          <ul>
            <li>Bulk shipment creation</li>
            <li>Pickup request workflow</li>
            <li>COD and settlement reports</li>
            <li>Delivery status updates</li>
            <li>Branch and rider assignment</li>
            <li>Merchant dashboard access</li>
          </ul>

          <Link href="/login" className={styles.primaryBtn}>
            Merchant Login
          </Link>
        </div>

        <div className={`${styles.dashboardMockup} ${styles.parallax}`}>
          <div className={styles.mockupTop}>
            <span>Merchant Panel</span>
            <strong>Live</strong>
          </div>

          <div className={styles.mockupGrid}>
            <div>
              <span>Total Parcels</span>
              <strong>1,248</strong>
            </div>
            <div>
              <span>Out Delivery</span>
              <strong>86</strong>
            </div>
            <div>
              <span>COD Pending</span>
              <strong>NPR 245K</strong>
            </div>
            <div>
              <span>Settled</span>
              <strong>NPR 1.2M</strong>
            </div>
          </div>

          <div className={styles.mockupList}>
            <div><span></span> Parcel picked up</div>
            <div><span></span> Rider assigned</div>
            <div><span></span> Delivery completed</div>
          </div>
        </div>
      </section>

      <section className={`${styles.coverage} ${styles.reveal}`}>
        <div className={styles.sectionHeader}>
          <span>Coverage</span>
          <h2>Serving Kathmandu and expanding across Nepal.</h2>
          <p>
            Tukaatu Express is built for city, branch and zone-based delivery
            operations across Nepal.
          </p>
        </div>

        <div className={styles.cityGrid}>
          {[
            "Kathmandu",
            "Lalitpur",
            "Bhaktapur",
            "Pokhara",
            "Chitwan",
            "Biratnagar",
            "Butwal",
            "Nepalgunj",
          ].map((city) => (
            <span key={city}>{city}</span>
          ))}
        </div>
      </section>

      <section className={`${styles.cta} ${styles.reveal}`}>
        <Image
          src="/images/tukaatu-logo.png"
          alt="Tukaatu Express"
          width={90}
          height={90}
        />

        <h2>Ready to manage deliveries smarter?</h2>
        <p>
          Login to the Tukaatu Express dashboard to manage shipments, merchants,
          branches, riders, COD and delivery reports.
        </p>

        <div className={styles.heroActions}>
          <Link href="/login" className={styles.primaryBtn}>
            Login to Dashboard
          </Link>
          <Link href="/site/contact" className={styles.secondaryBtn}>
            Contact Us
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Header() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logoWrap}>
        <Image
          src="/images/tukaatu-logo.png"
          alt="Tukaatu Express"
          width={46}
          height={46}
        />
        <div>
          <strong>Tukaatu Express</strong>
          <span>Courier Delivery Gateway</span>
        </div>
      </Link>

      <nav className={styles.nav}>
        <Link href="/">Home</Link>
        <Link href="/site/services">Services</Link>
        <Link href="/site/tracking">Tracking</Link>
        <Link href="/site/contact">Contact</Link>
      </nav>

      <Link href="/login" className={styles.loginBtn}>
        Login
      </Link>
    </header>
  );
}

function Service({ title, text }) {
  return (
    <div className={styles.serviceCard}>
      <div className={styles.serviceIcon}>↗</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function Footer() {
  return (
    <footer className={styles.footer}>
      <div>
        <strong>Tukaatu Express</strong>
        <p>Fast, reliable courier delivery across Nepal.</p>
      </div>

      <div className={styles.footerLinks}>
        <Link href="/site/services">Services</Link>
        <Link href="/site/tracking">Track Shipment</Link>
        <Link href="/login">Login</Link>
        <Link href="/site/contact">Contact</Link>
      </div>

      <span>© 2026 Tukaatu Express. All rights reserved.</span>
    </footer>
  );
}