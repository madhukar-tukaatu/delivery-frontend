"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, getUser, routeForRole } from "@/lib/auth";
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const user = getUser();
    router.replace(getToken() ? routeForRole(user?.role, user) : "/login");
  }, [router]);
  return null;
}
