"use client";

import {
  Button,
  Popconfirm,
  Space,
  message,
} from "antd";

import {
  CheckOutlined,
  MailOutlined,
} from "@ant-design/icons";

import {
  useState,
} from "react";

import {
  approveBranch,
  resendBranchAccountInvitation,
} from "@/services/branchApprovalService";

function errorMessage(
  error,
  fallback,
) {
  const errors =
    error?.response?.data?.errors;

  if (errors) {
    const first =
      Object.values(errors)
        .flat()
        .find(Boolean);

    if (first) {
      return String(first);
    }
  }

  return (
    error?.response?.data?.message ||
    fallback
  );
}

function isApproved(
  branch,
) {
  return [
    "approved",
    "active",
  ].includes(branch?.status);
}

function isFranchise(
  branch,
) {
  return [
    "franchise",
    "franchise_branch",
  ].includes(
    String(
      branch?.type || "",
    ).toLowerCase(),
  );
}

export default function BranchInvitationActions({
  branch,
  onChanged,
}) {
  const [
    approving,
    setApproving,
  ] = useState(false);

  const [
    resending,
    setResending,
  ] = useState(false);

  const handleApprove =
    async () => {
      try {
        setApproving(true);

        const result =
          await approveBranch(
            branch.id,
          );

        message.success(
          result?.response?.message ||
            "Branch approved successfully.",
        );

        await onChanged?.();
      } catch (error) {
        message.error(
          errorMessage(
            error,
            "Could not approve the branch.",
          ),
        );
      } finally {
        setApproving(false);
      }
    };

  const handleResend =
    async () => {
      try {
        setResending(true);

        const result =
          await resendBranchAccountInvitation(
            branch.id,
          );

        message.success(
          result?.message ||
            "Account invitation queued.",
        );

        await onChanged?.();
      } catch (error) {
        message.error(
          errorMessage(
            error,
            "Could not resend the account invitation.",
          ),
        );
      } finally {
        setResending(false);
      }
    };

  const canResend =
    isFranchise(branch) &&
    isApproved(branch) &&
    branch
      ?.account_invitation_status !==
      "account_configured";

  return (
    <Space wrap>
      {!isApproved(branch) ? (
        <Popconfirm
          title="Approve this branch?"
          description="For a franchise branch, this will queue the Branch Manager account setup email."
          okText="Approve"
          onConfirm={
            handleApprove
          }
        >
          <Button
            type="primary"
            size="small"
            icon={
              <CheckOutlined />
            }
            loading={approving}
          >
            Approve
          </Button>
        </Popconfirm>
      ) : null}

      {canResend ? (
        <Popconfirm
          title="Send a new account setup link?"
          description="The previous password setup link will become invalid."
          okText="Send"
          onConfirm={
            handleResend
          }
        >
          <Button
            size="small"
            icon={
              <MailOutlined />
            }
            loading={resending}
          >
            Resend Setup Email
          </Button>
        </Popconfirm>
      ) : null}
    </Space>
  );
}