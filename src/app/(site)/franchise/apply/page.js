import FranchiseForm from "./franchise-form";
import PublicHero from "../../components/PublicHero";
export const metadata = { title: "Apply for a Franchise" };
export default function FranchiseApplyPage() {
  return <main className="public-page">
    <PublicHero compact eyebrow="Franchise application" title="Your community." accent="Your next opportunity." description="Tell us about yourself and the area you’d like to serve. Our franchise team will review your application and contact you about the next steps." />
    <section className="public-form-section"><div><p className="public-eyebrow">Start the conversation</p><h2 className="text-2xl font-bold">Your details & preferred territory</h2><p className="mt-3 text-slate-600">Fields marked with an asterisk are required.</p><FranchiseForm /></div></section>
  </main>;
}
