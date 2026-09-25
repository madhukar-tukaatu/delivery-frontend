import PublicHero from "../components/PublicHero";

export const metadata = { title: "Delivery Services" };

export default function ServicesPage() {
  return (
    <main className="public-page bg-white">
      <PublicHero
        backgroundImage="/images/experience/cinematic/pickup.webp"
        eyebrow="Delivery services"
        title="Every parcel."
        accent="The right service."
        description="From everyday orders to time-sensitive parcels, find a delivery service that fits your business and your customer."
        note="A better journey for every parcel."
        primary={{ href: "/pricing", label: "Get a quote" }}
        secondary={{ href: "/contact", label: "Book a pickup" }}
      />
    </main>
  );
}
