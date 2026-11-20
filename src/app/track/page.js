import { Suspense } from "react";
import Header from "../(site)/components/Header";
import Footer from "../(site)/components/Footer";
import PublicHero from "../(site)/components/PublicHero";
import TrackingClient from "../(site)/tracking/tracking-client";
import "../(site)/public-pages.css";

function TrackContent({ searchParams }) {
  const tracking = searchParams?.tracking || searchParams?.number || "";
  return <TrackingClient initialTracking={tracking} />;
}

export default function TrackPage({ searchParams }) {
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
        <Suspense
          fallback={
            <div className="flex h-64 w-full items-center justify-center text-sm font-medium text-slate-400">
              Loading tracking...
            </div>
          }
        >
          <TrackContent searchParams={searchParams} />
        </Suspense>
      </main>
      <Footer showCta={false} />
    </div>
  );
}
