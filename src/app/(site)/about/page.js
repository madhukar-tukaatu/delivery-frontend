import PublicHero from "../components/PublicHero";

export const metadata = {
  title: "About Tukaatu Express - Nepal's Delivery Network",
};

export default function AboutPage() {
  return (
    <main className="public-page bg-white">
      <PublicHero
        fullHeight
        backgroundImage="/images/experience/cinematic/door.webp"
        eyebrow="About Tukaatu"
        title="Built in Nepal."
        accent="Built around people."
        description="We connect people, local businesses and delivery teams through a dependable, technology-enabled logistics network."
        note="People first. Parcels always."
        primary={{ href: "/services", label: "Explore our services" }}
        secondary={{ href: "/about/info", label: "About Info" }}
      />
    </main>
  );
}
