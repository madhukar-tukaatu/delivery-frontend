import PricingClient from "./PricingClient";

export const metadata = {
  title: "Delivery Pricing",
  description: "Calculate Tukaatu Express delivery pricing in NPR.",
};

export default function PricingPage() {
  return <PricingClient />;
}
