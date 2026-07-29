"use client";

import {
  Alert,
} from "antd";

import {
  useSearchParams,
} from "next/navigation";

export default function AccountSetupSuccessAlert() {
  const searchParams =
    useSearchParams();

  const success =
    searchParams.get(
      "account_setup",
    ) === "success";

  if (!success) {
    return null;
  }

  return (
    <Alert
      type="success"
      showIcon
      message="Account setup completed"
      description="Your password has been created. Sign in with your registered email or username."
      style={{
        marginBottom: 16,
      }}
    />
  );
}