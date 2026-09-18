'use client';

import Link from 'next/link';
import styles from './page.module.css';

export default function PrivacyPolicyPage() {
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Privacy Policy</h1>
          <p className={styles.subtitle}>How we collect, use, and protect your information</p>
        </div>
      </div>

      <div className={styles.mainContent}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <nav className={styles.toc}>
            <h3>Quick Navigation</h3>
            <ul>
              <li><a href="#introduction">Introduction</a></li>
              <li><a href="#information">Information We Collect</a></li>
              <li><a href="#usage">How We Use Your Information</a></li>
              <li><a href="#sharing">Data Sharing</a></li>
              <li><a href="#security">Security Measures</a></li>
              <li><a href="#rights">Your Rights</a></li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className={styles.main}>
          <article>

            <section id="introduction">
              <h2>Introduction</h2>
              <p>
                Tukaatu Express ("we," "us," "our," or "Company") operates the Tukaatu Express delivery platform. We are committed to protecting your privacy and ensuring you have a positive experience on our platform.
              </p>
              <p>
                This Privacy Policy explains what information we collect, how we use it, your rights regarding your data, and how we protect your information.
              </p>
              <div className={styles.highlight}>
                <strong>Key Point:</strong> Your privacy is important to us. We collect only the information necessary to provide our services and comply with legal requirements.
              </div>
            </section>

            <section id="information">
              <h2>Information We Collect</h2>
              
              <h3>Information You Provide</h3>
              <ul>
                <li>Business information (name, registration, address)</li>
                <li>Owner/Administrator details (name, email, ID)</li>
                <li>Store location and service areas</li>
                <li>Customer delivery information (name, address, phone)</li>
                <li>Payment information (processed securely)</li>
              </ul>

              <h3>Information Collected Automatically</h3>
              <ul>
                <li>Device and usage information</li>
                <li>App/website activity and interactions</li>
                <li>Location information (GPS, geofencing)</li>
                <li>Cookies and tracking technologies</li>
              </ul>
            </section>

            <section id="usage">
              <h2>How We Use Your Information</h2>
              
              <h3>Service Delivery</h3>
              <p>We use your information to:</p>
              <ul>
                <li>Create and maintain your account</li>
                <li>Process orders and deliveries</li>
                <li>Calculate and collect fees</li>
                <li>Manage payment settlement</li>
                <li>Assign and track Riders</li>
              </ul>

              <h3>Service Improvement</h3>
              <p>We continuously work to improve our service by:</p>
              <ul>
                <li>Analyzing platform usage and performance</li>
                <li>Identifying and fixing technical issues</li>
                <li>Optimizing delivery routes and efficiency</li>
                <li>Developing new features</li>
              </ul>

              <h3>Safety and Security</h3>
              <ul>
                <li>Verify user identity and prevent fraud</li>
                <li>Monitor for suspicious activity</li>
                <li>Comply with law enforcement requests</li>
              </ul>
            </section>

            <section id="sharing">
              <h2>How We Share Your Data</h2>
              <p>We share your information with trusted partners to provide our services:</p>
              <ul>
                <li><strong>Payment Processors:</strong> Stripe, PayPal (payment processing)</li>
                <li><strong>Mapping Services:</strong> Google Maps (route optimization)</li>
                <li><strong>Communication Providers:</strong> SMS, email providers (notifications)</li>
                <li><strong>Riders:</strong> Delivery instructions and store information</li>
                <li><strong>Analytics Platforms:</strong> Google Analytics (usage analysis)</li>
                <li><strong>Support Tools:</strong> Zendesk, Intercom (customer support)</li>
              </ul>
              <div className={styles.cautionBox}>
                <strong>Important:</strong> We never sell your personal information to third parties for marketing purposes.
              </div>
            </section>

            <section id="security">
              <h2>How We Protect Your Information</h2>
              <div className={styles.securityGrid}>
                <div className={styles.securityCard}>
                  <h4>🔐 Encryption</h4>
                  <p>TLS/SSL for data in transit; AES-256 for data at rest</p>
                </div>
                <div className={styles.securityCard}>
                  <h4>🛡️ Firewalls</h4>
                  <p>Network firewalls and DDoS protection</p>
                </div>
                <div className={styles.securityCard}>
                  <h4>👥 Access Control</h4>
                  <p>Role-based access and strict authentication</p>
                </div>
                <div className={styles.securityCard}>
                  <h4>📊 Auditing</h4>
                  <p>Detailed logs of all data access</p>
                </div>
              </div>
            </section>

            <section id="rights">
              <h2>Your Privacy Rights</h2>
              <p>You have the right to:</p>
              
              <div className={styles.rightsGrid}>
                <div className={styles.rightCard}>
                  <h4>Access Your Data</h4>
                  <p>Request a copy of all personal data we hold about you</p>
                </div>
                <div className={styles.rightCard}>
                  <h4>Correct Your Data</h4>
                  <p>Update or fix any inaccurate information</p>
                </div>
                <div className={styles.rightCard}>
                  <h4>Delete Your Data</h4>
                  <p>Request deletion of your personal information (with exceptions)</p>
                </div>
                <div className={styles.rightCard}>
                  <h4>Opt-Out</h4>
                  <p>Stop receiving marketing communications anytime</p>
                </div>
                <div className={styles.rightCard}>
                  <h4>Data Portability</h4>
                  <p>Receive your data in a structured, portable format</p>
                </div>
                <div className={styles.rightCard}>
                  <h4>Lodge Complaints</h4>
                  <p>File a complaint with relevant data protection authorities</p>
                </div>
              </div>

              <h3>How to Exercise Your Rights</h3>
              <p>To request any of the above, email us at:</p>
              <p style={{ marginTop: '16px' }}>
                <a href="mailto:privacy@tukaatu-express.com" className={styles.emailLink}>
                  privacy@tukaatu-express.com
                </a>
              </p>
            </section>
          </article>

          {/* Related Links */}
          <div className={styles.relatedLink}>
            <Link href="/terms-conditions">← Read our Terms & Conditions</Link>
          </div>
        </main>
      </div>
    </div>
  );
}
