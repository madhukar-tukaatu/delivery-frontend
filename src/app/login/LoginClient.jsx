"use client";

import { useSearchParams } from "next/navigation";

// Keep all your existing login imports here.
// Example:
// import { Form, Input, Button, Alert } from "antd";
// import { useRouter } from "next/navigation";
// import { login } from "@/services/authService";

export default function LoginClient() {
  const searchParams = useSearchParams();

  const accountSetupSuccess =
    searchParams.get("account_setup") === "success";

  const email = searchParams.get("email") ?? "";

  /*
   * Keep the rest of your existing login state,
   * functions, form and JSX here.
   */

  return (
    <div>
      {accountSetupSuccess && (
        <div>
          Your account has been configured successfully.
          You can now sign in.
        </div>
      )}

      {/* Replace this section with your existing login form. */}
      <div>Login form</div>
    </div>
  );
}