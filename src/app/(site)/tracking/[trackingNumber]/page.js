import PublicHero from "../../components/PublicHero";
import TrackingClient from "../tracking-client";

export const metadata = {
  title: "Live Parcel Tracking",
  description: "Track your Tukaatu Express parcel in real time with live GPS updates.",
};

export default function TrackingDynamicPage({ params }) {
  const tracking = params?.trackingNumber || "";

  return (
    <main className="public-page">
      <PublicHero
        compact
        eyebrow="Parcel tracking"
        title="Follow your parcel’s journey."
        accent="Every turn of the road."
        description="Real-time satellite and rider GPS updates from pickup to doorstep."
      />
      <TrackingClient initialTracking={decodeURIComponent(tracking)} />
    </main>
  );
}
