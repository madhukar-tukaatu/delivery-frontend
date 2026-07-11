import SiteClient from "./site/SiteClient";

export const metadata = {
  title: "Tukaatu Express | Fast Courier Delivery Across Nepal",
  description:
    "Tukaatu Express provides reliable courier delivery, shipment tracking, merchant logistics, COD collection and branch-based delivery operations across Nepal.",
};

export default function SitePage() {
  return <SiteClient />;
}