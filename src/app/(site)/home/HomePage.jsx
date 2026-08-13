"use client";

import Link from "next/link";
import DeliveryExperience from "../components/experience/DeliveryExperience";

import styles from "./HomePage.module.css";
import Header from "../components/header";
import Footer from "../components/footer";

export default function HomePage() {
  return (
    <div className={styles.page}>
      <Header />

      <main>
        {/* HERO */}
        <section className={styles.hero}>
          <div className={styles.heroGlow} />
          <div className={styles.heroGrid} />

          <div className={styles.heroContent}>
            <div className={styles.eyebrow}>
              <span className={styles.liveDot} />
              Nepal-wide delivery network
            </div>

            <h1>
              Deliver across Nepal.
              <span> Faster. Smarter. Simpler.</span>
            </h1>

            <p>
              From merchant pickup to doorstep delivery, Tukaatu Express gives
              every parcel a smarter journey with visibility at every step.
            </p>

            <div className={styles.heroActions}>
              <Link href="/track" className={styles.primaryButton}>
                Track your parcel
                <span>→</span>
              </Link>

              <Link href="/pricing" className={styles.secondaryButton}>
                Calculate delivery price
              </Link>
            </div>

            <div className={styles.heroTrust}>
              <div>
                <strong>01</strong>
                <span>Nationwide network</span>
              </div>

              <div>
                <strong>02</strong>
                <span>Live tracking</span>
              </div>

              <div>
                <strong>03</strong>
                <span>Secure delivery</span>
              </div>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.heroOrb} />
            <div className={styles.heroOrb} />

            <div className={styles.routeMap}>
              <svg viewBox="0 0 600 460" fill="none">
                <path
                  d="M78 350C144 283 164 207 242 218C315 229 307 309 375 285C438 263 435 155 523 104"
                  stroke="rgba(37,99,235,.2)"
                  strokeWidth="2"
                  strokeDasharray="7 9"
                />

                <circle cx="78" cy="350" r="8" fill="#2563EB" />
                <circle cx="242" cy="218" r="8" fill="#06B6D4" />
                <circle cx="375" cy="285" r="8" fill="#06B6D4" />
                <circle cx="523" cy="104" r="8" fill="#16A34A" />
              </svg>
            </div>

            <div className={styles.heroShipment}>
              <div className={styles.shipmentTop}>
                <span>LIVE SHIPMENT</span>
                <span className={styles.shipmentStatus}>IN TRANSIT</span>
              </div>

              <div className={styles.shipmentNumber}>
                TKT-2026-849251
              </div>

              <div className={styles.shipmentRoute}>
                <div>
                  <small>FROM</small>
                  <strong>Kathmandu</strong>
                </div>

                <div className={styles.routeArrow}>→</div>

                <div>
                  <small>TO</small>
                  <strong>Pokhara</strong>
                </div>
              </div>

              <div className={styles.progress}>
                <span />
              </div>

              <div className={styles.shipmentFooter}>
                <span>Estimated arrival</span>
                <strong>Tomorrow</strong>
              </div>
            </div>

            <div className={styles.floatingPackage}>
              <div className={styles.packageIcon}>▣</div>
              <div>
                <strong>Parcel secured</strong>
                <span>Processing complete</span>
              </div>
            </div>
          </div>
        </section>

        {/* NUMBERS */}
        <section className={styles.numbers}>
          <div className={styles.numberItem}>
            <strong>77</strong>
            <span>Districts & growing</span>
          </div>

          <div className={styles.numberItem}>
            <strong>24/7</strong>
            <span>Shipment visibility</span>
          </div>

          <div className={styles.numberItem}>
            <strong>99%</strong>
            <span>Digital tracking</span>
          </div>

          <div className={styles.numberItem}>
            <strong>1</strong>
            <span>Simple delivery network</span>
          </div>
        </section>

        {/* BIG GSAP EXPERIENCE */}
        <DeliveryExperience />

        {/* SERVICES */}
        <section className={styles.services}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionLabel}>WHAT WE DO</span>

              <h2>
                One network.
                <br />
                <span>Every delivery.</span>
              </h2>
            </div>

            <p>
              Built for people, merchants and businesses that need delivery
              to simply work.
            </p>
          </div>

          <div className={styles.serviceGrid}>
            <ServiceCard
              number="01"
              title="Express Delivery"
              text="Fast delivery for urgent shipments across our growing Nepal-wide network."
              href="/services"
            />

            <ServiceCard
              number="02"
              title="Business Delivery"
              text="Reliable logistics infrastructure for growing ecommerce and retail businesses."
              href="/business"
            />

            <ServiceCard
              number="03"
              title="COD Management"
              text="Track collections, settlements and delivery performance from one place."
              href="/business"
            />

            <ServiceCard
              number="04"
              title="Smart Tracking"
              text="Know where every shipment is from pickup to the customer's doorstep."
              href="/track"
            />
          </div>
        </section>

        {/* COVERAGE */}
        <section className={styles.coverage}>
          <div className={styles.coverageMap}>
            <div className={styles.mapGlow} />

            <div className={styles.mapShape}>
              <svg viewBox="0 0 320 520" fill="none">
                <path
                  d="M153 15L183 31L197 62L224 75L218 103L246 124L233 151L260 178L242 201L260 235L241 259L250 290L221 313L226 344L198 369L205 397L180 419L174 455L148 475L128 503L103 483L83 456L65 437L73 408L51 380L68 351L51 325L73 298L58 267L78 239L64 211L89 185L80 155L105 130L99 98L126 79L120 47L153 15Z"
                  stroke="rgba(255,255,255,.45)"
                  strokeWidth="2"
                />

                <circle cx="150" cy="108" r="7" />
                <circle cx="114" cy="190" r="7" />
                <circle cx="180" cy="264" r="7" />
                <circle cx="132" cy="345" r="7" />
                <circle cx="175" cy="416" r="7" />
              </svg>
            </div>

            <div className={styles.mapRoute}>
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className={styles.coverageContent}>
            <span className={styles.sectionLabel}>THE NETWORK</span>

            <h2>
              Nepal is
              <br />
              <span>our route.</span>
            </h2>

            <p>
              From Kathmandu's busy streets to growing regional cities,
              Tukaatu Express connects merchants, branches, riders and
              customers through one coordinated logistics network.
            </p>

            <Link href="/coverage" className={styles.outlineButton}>
              Explore coverage
              <span>→</span>
            </Link>
          </div>
        </section>

        {/* MERCHANT CTA */}
        <section className={styles.business}>
          <div className={styles.businessCard}>
            <div className={styles.businessNoise} />

            <div className={styles.businessContent}>
              <span className={styles.sectionLabel}>FOR BUSINESSES</span>

              <h2>
                Your orders.
                <br />
                <span>Our network.</span>
              </h2>

              <p>
                Give your customers a better delivery experience while you
                focus on building your business.
              </p>

              <div className={styles.businessActions}>
                <Link href="/business" className={styles.whiteButton}>
                  Grow with Tukaatu
                  <span>→</span>
                </Link>

                <Link href="/contact" className={styles.textButton}>
                  Talk to our team
                </Link>
              </div>
            </div>

            <div className={styles.businessDashboard}>
              <div className={styles.dashboardWindow}>
                <div className={styles.windowHeader}>
                  <span />
                  <span />
                  <span />
                </div>

                <div className={styles.dashboardTitle}>
                  Delivery overview
                </div>

                <div className={styles.dashboardStats}>
                  <div>
                    <small>SHIPMENTS</small>
                    <strong>2,481</strong>
                  </div>

                  <div>
                    <small>DELIVERED</small>
                    <strong>96.8%</strong>
                  </div>
                </div>

                <div className={styles.fakeChart}>
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FRANCHISE */}
        <section className={styles.franchise}>
          <div>
            <span className={styles.sectionLabel}>BUILD WITH US</span>

            <h2>
              Bring better
              <br />
              logistics to <span>your city.</span>
            </h2>
          </div>

          <div>
            <p>
              Become part of the Tukaatu Express network and help build the
              next generation of delivery infrastructure across Nepal.
            </p>

            <Link href="/franchise" className={styles.darkButton}>
              Become a franchise partner
              <span>→</span>
            </Link>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className={styles.finalCta}>
          <div className={styles.finalGlow} />

          <span className={styles.sectionLabel}>READY WHEN YOU ARE</span>

          <h2>
            Let's move
            <br />
            <span>something.</span>
          </h2>

          <p>
            Track a parcel, ship your next order or talk to our team.
          </p>

          <div className={styles.finalActions}>
            <Link href="/track" className={styles.primaryButton}>
              Track a parcel
              <span>→</span>
            </Link>

            <Link href="/contact" className={styles.secondaryButton}>
              Contact Tukaatu
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function ServiceCard({ number, title, text, href }) {
  return (
    <Link href={href} className={styles.serviceCard}>
      <div className={styles.serviceNumber}>{number}</div>

      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>

      <span className={styles.serviceArrow}>↗</span>
    </Link>
  );
}