'use client';

import Link from 'next/link';
import styles from './page.module.css';

export default function TermsConditionsPage() {
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Terms & Conditions</h1>
          <p className={styles.subtitle}>Legal terms governing the use of Tukaatu Express services</p>
        </div>
      </div>

      <div className={styles.mainContent}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <nav className={styles.toc}>
            <h3>Quick Navigation</h3>
            <ul>
              <li><a href="#overview">Agreement Overview</a></li>
              <li><a href="#eligibility">Eligibility & Registration</a></li>
              <li><a href="#account">Account Management</a></li>
              <li><a href="#services">Service Description</a></li>
              <li><a href="#obligations">Merchant Obligations</a></li>
              <li><a href="#delivery">Delivery Process</a></li>
              <li><a href="#fees">Fees & Payment</a></li>
              <li><a href="#liability">Liability & Indemnification</a></li>
              <li><a href="#dispute">Dispute Resolution</a></li>
              <li><a href="#termination">Termination</a></li>
            </ul>
          </nav>

          <div className={styles.sidebarLinks}>
            <h4>Important Links</h4>
            <ul>
              <li><a href="/privacy-policy">Privacy Policy</a></li>
              <li><a href="/contact">Contact Support</a></li>
            </ul>
          </div>
        </aside>

        {/* Main Content */}
        <main className={styles.main}>
          <article>

            <section id="overview">
              <h2>Agreement Overview</h2>
              <p>
                These Terms and Conditions ("Agreement") form a legally binding contract between Tukaatu Express ("Company") and you ("Merchant," "Store," or "User").
              </p>
              <p>
                By accessing, browsing, or using the Tukaatu Express platform, services, website, or mobile application ("Service"), you agree to be bound by these terms.
              </p>
              <div className={styles.highlight}>
                <strong>Important:</strong> If you do not agree with these terms, you must stop using the Service immediately.
              </div>
            </section>

            <section id="eligibility">
              <h2>Eligibility & Registration</h2>
              <h3>Requirements</h3>
              <ul>
                <li>Be at least 18 years of age</li>
                <li>Be a legally operating business entity</li>
                <li>Have valid business registration and documentation</li>
                <li>Comply with all applicable local, state, and national laws</li>
                <li>Provide accurate and complete information</li>
              </ul>

              <h3>Verification</h3>
              <p>Merchants must provide:</p>
              <ul>
                <li>Valid business registration certificate</li>
                <li>Tax identification number (TIN/GST)</li>
                <li>Proof of business address</li>
                <li>Government-issued ID of owner/representative</li>
                <li>Business bank account details</li>
              </ul>
            </section>

            <section id="account">
              <h2>Account Management & Security</h2>
              <p>You are responsible for:</p>
              <ul>
                <li>Keeping your login credentials confidential</li>
                <li>Protecting your password (minimum 12 characters recommended)</li>
                <li>All activity conducted under your account</li>
                <li>Immediately reporting unauthorized access</li>
                <li>Keeping your information current and accurate</li>
              </ul>
              <div className={styles.cautionBox}>
                <strong>Security Best Practices:</strong>
                <ul style={{ marginBottom: 0 }}>
                  <li>Use a strong, unique password</li>
                  <li>Enable two-factor authentication (2FA)</li>
                  <li>Change your password regularly</li>
                  <li>Never share credentials with unauthorized users</li>
                </ul>
              </div>
            </section>

            <section id="services">
              <h2>Service Description</h2>
              <h3>What We Provide</h3>
              <ul>
                <li>Order intake and management platform</li>
                <li>Rider assignment and logistics coordination</li>
                <li>Real-time tracking and delivery updates</li>
                <li>Optional payment collection (Cash on Delivery)</li>
                <li>Analytics and reporting dashboard</li>
              </ul>

              <h3>What We Don't Provide</h3>
              <ul>
                <li>We do NOT take ownership of goods before pickup or after delivery</li>
                <li>We do NOT guarantee specific delivery times (estimates only)</li>
                <li>We do NOT provide medical or hazardous material delivery</li>
                <li>We do NOT assume liability for product quality or pre-existing damage</li>
              </ul>
            </section>

            <section id="obligations">
              <h2>Merchant Obligations</h2>
              <h3>Provide Accurate Information</h3>
              <ul>
                <li>Maintain accurate product descriptions and pricing</li>
                <li>Keep inventory and stock levels updated</li>
                <li>Fulfill orders within agreed timeframes</li>
              </ul>

              <h3>Product Compliance</h3>
              <ul>
                <li>Ensure all products comply with local laws</li>
                <li>Provide food safety certifications (if applicable)</li>
                <li>Disclose allergens and special handling requirements</li>
                <li>Ensure products are not counterfeit or stolen</li>
              </ul>

              <h3>Prohibited Items</h3>
              <p>You CANNOT sell through Tukaatu Express:</p>
              <ul>
                <li>Weapons, explosives, or ammunition</li>
                <li>Illegal drugs or controlled substances</li>
                <li>Counterfeit or stolen goods</li>
                <li>Hazardous materials (without permits)</li>
                <li>Live animals (except authorized service animals)</li>
              </ul>
            </section>

            <section id="delivery">
              <h2>Delivery Process</h2>
              <h3>Order Placement</h3>
              <ul>
                <li>Confirm order details before final submission</li>
                <li>Hand over items to Rider within agreed timeframe</li>
                <li>Pack items securely with appropriate materials</li>
                <li>Include complete order contents matching order specifications</li>
              </ul>

              <h3>Rider Assignment</h3>
              <ul>
                <li>Riders are assigned based on location and availability</li>
                <li>You cannot request specific Riders without prior agreement</li>
                <li>Provide clear special instructions to Riders in advance</li>
              </ul>

              <h3>Delivery Verification</h3>
              <p>Delivery is verified through GPS, timestamp, and photographic evidence. Disputes must be raised within 24 hours of delivery.</p>
            </section>

            <section id="fees">
              <h2>Fees & Payment</h2>
              <h3>Fee Structure</h3>
              <p>Fees are based on:</p>
              <ul>
                <li>Distance of delivery</li>
                <li>Weight of items</li>
                <li>Item category</li>
                <li>Service tier (express, standard, scheduled)</li>
                <li>Demand-based pricing during peak hours</li>
              </ul>

              <h3>Payment Terms</h3>
              <ul>
                <li>Invoiced monthly (Net-30 payment terms)</li>
                <li>Payment due within 30 days of invoice</li>
                <li>Late payments incur 1.5% monthly interest</li>
                <li>Accepted payment methods: Bank transfer, credit card, online wallet</li>
              </ul>

              <h3>Refunds & Credits</h3>
              <p>Eligible for refund:</p>
              <ul>
                <li>Service not provided or failed delivery</li>
                <li>Duplicate charges</li>
              </ul>
            </section>

            <section id="liability">
              <h2>Liability & Indemnification</h2>
              <div className={styles.warningBox}>
                <strong>LIMITATION OF LIABILITY</strong>
                <p>
                  Tukaatu Express liability is limited to the actual service fees paid for the specific order, not to exceed $500 per shipment (unless insured).
                </p>
              </div>

              <h3>We Are NOT Liable For:</h3>
              <ul>
                <li>Indirect, consequential, or punitive damages</li>
                <li>Lost profits or revenue</li>
                <li>Delivery delays or missed time windows</li>
                <li>Loss or damage due to improper packaging</li>
                <li>Service interruptions or technical issues</li>
              </ul>

              <h3>You Agree to Indemnify Tukaatu Express From Claims Arising From:</h3>
              <ul>
                <li>Your products or services</li>
                <li>Violation of laws by you</li>
                <li>Intellectual property infringement</li>
                <li>Disputes between you and customers</li>
                <li>Your breach of this Agreement</li>
              </ul>
            </section>

            <section id="dispute">
              <h2>Dispute Resolution</h2>
              <h3>Step 1: Informal Resolution</h3>
              <p>Before formal action, parties must:</p>
              <ol>
                <li>Document the dispute clearly</li>
                <li>Submit to Tukaatu Express with evidence</li>
                <li>Allow 10 business days for response</li>
                <li>Communicate in good faith</li>
              </ol>

              <h3>Step 2: Formal Dispute Process</h3>
              <ol>
                <li>File dispute through merchant portal</li>
                <li>Investigation and determination within 15 days</li>
                <li>Appeal available to senior management within 10 days</li>
              </ol>

              <h3>Step 3: Arbitration</h3>
              <p>
                Unresolved disputes submitted to binding arbitration with a neutral arbitrator.
              </p>
            </section>

            <section id="termination">
              <h2>Termination of Service</h2>
              <h3>You Can Terminate By:</h3>
              <ul>
                <li>Providing 30 days' written notice</li>
                <li>Settling all outstanding balances</li>
                <li>Completing transition of pending orders</li>
              </ul>

              <h3>We Can Terminate Immediately For:</h3>
              <ul>
                <li>Illegal activity or fraud</li>
                <li>Severe abuse of Riders or staff</li>
                <li>Extreme quality failures</li>
                <li>Security breach or hacking attempts</li>
                <li>Law enforcement order</li>
              </ul>

              <h3>Effect of Termination</h3>
              <ul>
                <li>Immediate access revocation</li>
                <li>Pending orders cancelled or transferred</li>
                <li>Final payment calculated and invoiced</li>
                <li>Data retained per privacy policy</li>
              </ul>
            </section>
          </article>

          {/* Related Links */}
          <div className={styles.relatedLink}>
            <Link href="/privacy-policy">← Read our Privacy Policy</Link>
          </div>
        </main>
      </div>
    </div>
  );
}
