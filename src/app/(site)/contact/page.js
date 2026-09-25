import Link from "next/link";
import ContactForm from "./contact-form";
import PublicHero from "../components/PublicHero";
import "./contact.css";

export const metadata = { title: "Contact Tukaatu Express" };

export default function ContactPage() {
  return (
    <main className="public-page">
      <PublicHero
        backgroundImage="/images/contact-us.webp"
        eyebrow="Contact & pickups"
        title="A real team."
        accent="Ready to help."
        description="Booking a pickup, growing your business or checking a delivery? Tell us what you need and we’ll help you take the next step."
      />
      <section className="public-contact-grid">
        <aside className="public-contact-info">
          <p className="public-eyebrow">Let's talk delivery</p>
          <h2>Good delivery starts with a conversation.</h2>
          <p>Include your pickup location, destination and parcel details for a delivery enquiry. For an existing shipment, share your tracking number.</p>
          <div className="public-contact-item"><small>Email our team</small><a href="mailto:hello@tukaatuexpress.com">hello@tukaatuexpress.com</a></div>
          <div className="public-contact-item"><small>Based in</small><p>Kathmandu, Nepal</p></div>
          <Link href="/tracking" className="public-button public-button--outline">Track an existing parcel →</Link>
        </aside>
        <div><h2 className="mb-6 text-2xl font-bold">How can we help?</h2><ContactForm /></div>
      </section>
    </main>
  );
}
