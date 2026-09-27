import PublicHero from "../components/PublicHero";

export const metadata = { title: "Delivery Services - Tukaatu Express" };

export default function ServicesPage() {
  return (
    <main className="public-page bg-white">
      <PublicHero
        fullHeight
        backgroundImage="/images/experience/cinematic/pickup.webp"
        eyebrow="Delivery services"
        title="Every parcel."
        accent="The right service."
        description="From everyday store orders to time-sensitive urgent parcels, find a delivery service that fits your business, your budget and your customers."
        note="A better journey for every parcel."
        primary={{ href: "/services/info", label: "Services Info" }}
        secondary={{ href: "/contact", label: "Book a pickup" }}
      />
    </main>
  );
}
