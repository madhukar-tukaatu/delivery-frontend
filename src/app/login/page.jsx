import { Suspense } from "react";
import LoginClient from "./LoginClient";

function LoginLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "linear-gradient(135deg, #f3f7fb 0%, #eef3f8 100%)",
        color: "#64748b",
        fontFamily: "Arial, sans-serif",
      }}
    >
      Loading login...
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginClient />
    </Suspense>
  );
}