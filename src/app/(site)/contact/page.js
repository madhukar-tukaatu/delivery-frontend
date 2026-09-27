import { Suspense } from "react";
import ContactClient from "./ContactClient";
import "./contact.css";

export const metadata = {
  title: "Contact Tukaatu Express - Support & Pickups",
  description:
    "Get in touch with the Tukaatu Express operations team in Nepal. Book corporate pickups, enquire about parcel deliveries or ask any questions.",
};

export default function ContactPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-gray-500">
          Loading contact...
        </div>
      }
    >
      <ContactClient />
    </Suspense>
  );
}
