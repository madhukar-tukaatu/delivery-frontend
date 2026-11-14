"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ShipmentReportsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/reports");
  }, [router]);

  return null;
}
