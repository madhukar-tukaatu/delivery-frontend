import api from "@/lib/api";

function unwrapData(response) {
  return (
    response?.data?.data ??
    response?.data ??
    null
  );
}

export async function approveBranch(
  branchId,
) {
  const response = await api.post(
    `/admin/branches/${branchId}/approve`,
  );

  return {
    response:
      response?.data ?? null,

    branch:
      unwrapData(response),

    invitation:
      response?.data
        ?.account_invitation ??
      null,
  };
}

export async function resendBranchAccountInvitation(
  branchId,
) {
  const response = await api.post(
    `/admin/branches/${branchId}/resend-account-invitation`,
  );

  return response?.data ?? null;
}