import "./site.css";
import SiteShell from "./SiteShell";

export const metadata = {
  title: {
    default: "Tukaatu Express | Nepal Delivered. Simply.",
    template: "%s | Tukaatu Express",
  },
  description:
    "Fast, reliable parcel delivery across Nepal with live tracking, COD, business logistics and nationwide coverage.",
  keywords: [
    "Tukaatu Express",
    "Nepal courier",
    "parcel delivery Nepal",
    "courier Kathmandu",
    "COD delivery Nepal",
    "logistics Nepal",
  ],
  openGraph: {
    title: "Tukaatu Express | Nepal Delivered. Simply.",
    description:
      "Fast, reliable parcel delivery across Nepal with live tracking and business logistics.",
    type: "website",
  },
};

export default function SiteLayout({ children }) {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <SiteShell>{children}</SiteShell>
    </div>
  );
}
