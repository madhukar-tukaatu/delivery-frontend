"use client";

import Link from "next/link";
import DeliveryExperience from "../components/experience/DeliveryExperience";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Reveal from "../components/reveal";
import styles from "./HomeLanding.module.css";

const SERVICES = [
  {
    number: "01",
    title: "Express Delivery",
    text: "Fast movement for urgent shipments across our Nepal-wide network.",
    href: "/services",
  },
  {
    number: "02",
    title: "Pricing & Calculator",
    text: "Transparent rates and instant quotes before you ship.",
    href: "/pricing",
  },
  {
    number: "03",
    title: "Franchise Network",
    text: "Build with the next generation of delivery partners.",
    href: "/franchise",
  },
];

const STATS = [
  { value: "77", label: "Districts & growing" },
  { value: "24/7", label: "Shipment visibility" },
  { value: "99%", label: "Digital tracking" },
  { value: "1", label: "Simple delivery network" },
];

export default function HomeLanding() {
  return (
    <main className={styles.page}>
      <Header transparent />

      <DeliveryExperience />

      <section className={styles.afterExperience}>
        <div className={styles.afterGrid} aria-hidden />
        <div className={styles.afterContent}>
          <Reveal>
            <div className={styles.eyebrow}>
              <span />
              ONE NETWORK. EVERY DELIVERY.
            </div>
            <h2>
              Built for the way
              <br />
              <strong>Nepal moves.</strong>
            </h2>
            <p>
              Whether you are sending a parcel across Kathmandu or moving
              products from Kathmandu to Pokhara, Tukaatu Express connects the
              entire delivery journey through one intelligent network.
            </p>
          </Reveal>

          <div className={styles.serviceCards}>
            {SERVICES.map((service, index) => (
              <Reveal key={service.href} delay={120 + index * 90}>
                <Link href={service.href} className={styles.serviceCard}>
                  <span className={styles.serviceIcon}>{service.number}</span>
                  <strong>{service.title}</strong>
                  <small>{service.text}</small>
                  <span className={styles.arrow} aria-hidden>
                    →
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div className={styles.finalGlow} aria-hidden />
        <Reveal>
          <div className={styles.eyebrow}>
            <span />
            READY WHEN YOU ARE
          </div>
          <h2>
            Ship with confidence.
            <br />
            <strong>Track with clarity.</strong>
          </h2>
          <p>
            Start with a quote, track a parcel, or talk to our team — whatever
            you need next.
          </p>
          <div className={styles.finalActions}>
            <Link href="/track" className={styles.primaryButton}>
              Track a parcel
              <span aria-hidden>→</span>
            </Link>
            <Link href="/contact" className={styles.secondaryButton}>
              Contact us
            </Link>
            <Link href="/login" className={styles.ghostButton}>
              Merchant login
            </Link>
          </div>
        </Reveal>
      </section>

      <Footer />
    </main>
  );
}
