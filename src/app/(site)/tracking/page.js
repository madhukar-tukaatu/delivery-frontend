import PublicHero from "../components/PublicHero";
import TrackingClient from "./tracking-client";

export const metadata = {
  title: "Track Your Parcel",
  description: "Track your Tukaatu Express parcel with a public tracking number.",
};

export default function TrackPage({ searchParams }) {
  const tracking = searchParams?.tracking || "";

  return (
    <main className="public-page">
        <PublicHero compact eyebrow="Parcel tracking" title="A little peace of mind." accent="One tracking number." description="Follow your parcel’s journey from pickup to delivery. Enter the tracking number from your receipt or confirmation message." />
        <TrackingClient initialTracking={tracking} />
    </main>
  );
}
