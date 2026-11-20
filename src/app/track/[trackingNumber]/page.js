"use client";

import Header from "../../(site)/components/Header";
import Footer from "../../(site)/components/Footer";
import PublicHero from "../../(site)/components/PublicHero";
import TrackingClient from "../../(site)/tracking/tracking-client";
import "../../(site)/public-pages.css";

export default function TrackDynamicPage({ params }) {
  const tracking = params?.trackingNumber || "";

  return (
    <div className="public-site">
      <Header />
      <main className="public-page">
        <PublicHero
          compact
          eyebrow="Live parcel tracking"
          title="Track your shipment."
          accent="In real time."
          description="Follow your parcel’s journey with live GPS updates, rider details, and milestone events."
        />
        <TrackingClient initialTracking={decodeURIComponent(tracking)} />
      </main>
      <Footer showCta={false} />
    </div>
  );
}
