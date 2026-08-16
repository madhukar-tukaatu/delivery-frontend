import TrackingClient from "./tracking-client";

export const metadata = {
  title: "Track Your Parcel",
  description: "Track your Tukaatu Express parcel with a public tracking number.",
};

export default function TrackPage({ searchParams }) {
  const tracking = searchParams?.tracking || "";

  return (
    <main>
        <section className="site-grid bg-slate-50 px-6 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-blue-600">
              Public tracking
            </p>
            <h1 className="site-display mt-4 text-5xl font-extrabold tracking-tight text-slate-950 sm:text-6xl">
              Where is your parcel?
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Enter your Tukaatu tracking number to see the latest shipment
              status and movement timeline.
            </p>
          </div>
        </section>
        <TrackingClient initialTracking={tracking} />
    </main>
  );
}
