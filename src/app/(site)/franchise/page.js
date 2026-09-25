import PublicHero from "../components/PublicHero";

export const metadata = { title: "Franchise Opportunity - Tukaatu Express" };

export default function FranchisePage() {
  return (
    <main className="public-page bg-white">
      <PublicHero
        backgroundImage="/images/experience/cinematic/origin.webp"
        eyebrow="Partner with Tukaatu"
        title="Local knowledge."
        accent="Nationwide ambition."
        description="Build a delivery business in your community, supported by Tukaatu’s technology, operations and growing network."
        note="Your community. Our network."
        primary={{ href: "/franchise/apply", label: "Apply for a franchise" }}
        secondary={{ href: "/contact", label: "Ask a question" }}
      />
    </main>
  );
}
