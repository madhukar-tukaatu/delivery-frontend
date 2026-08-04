import api from "@/lib/api";

function unwrapData(response) {
  return response?.data?.data || response?.data || null;
}

function resolveBrowserFile(value) {
  if (!value) {
    return null;
  }

  const candidate = value?.originFileObj || value;

  if (typeof File !== "undefined" && candidate instanceof File) {
    return candidate;
  }

  return null;
}

function appendScalar(formData, key, value) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  if (typeof value === "boolean") {
    formData.append(key, value ? "1" : "0");
    return;
  }

  formData.append(key, String(value));
}

function appendArray(formData, key, values) {
  if (!Array.isArray(values)) {
    return;
  }

  values.forEach((value, index) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    formData.append(`${key}[${index}]`, String(value));
  });
}

/**
 * Build the single multipart branch-create request.
 * Files must remain native browser File objects until FormData.append().
 */
export function makeBranchCreateFormData(payload = {}) {
  if (typeof FormData === "undefined") {
    throw new Error("FormData is not available in this browser.");
  }

  const formData = new FormData();
  const {
    documents = [],
    operating_days = [],
    covered_areas = [],
    ...branchFields
  } = payload;

  Object.entries(branchFields).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      appendArray(formData, key, value);
      return;
    }

    if (value && typeof value === "object") {
      return;
    }

    appendScalar(formData, key, value);
  });

  appendArray(formData, "operating_days", operating_days);
  appendArray(formData, "covered_areas", covered_areas);

  if (!Array.isArray(documents) || documents.length === 0) {
    throw new Error("At least one branch document is required.");
  }

  documents.forEach((document, index) => {
    const file = resolveBrowserFile(document?.file);

    if (!file) {
      throw new Error(
        `The selected file for ${
          document?.title || document?.document_type || `document ${index + 1}`
        } is not a browser File object.`,
      );
    }

    formData.append(
      `documents[${index}][document_type]`,
      String(document?.document_type || "other"),
    );

    formData.append(
      `documents[${index}][title]`,
      String(
        document?.title ||
          document?.document_type ||
          file.name ||
          "Branch document",
      ),
    );

    if (document?.notes) {
      formData.append(
        `documents[${index}][notes]`,
        String(document.notes),
      );
    }

    formData.append(
      `documents[${index}][file]`,
      file,
      file.name,
    );
  });

  return formData;
}

export async function getBranches(params = {}) {
  const response = await api.get("/admin/branches", { params });
  return response.data;
}

export async function getBranch(id) {
  const response = await api.get(`/admin/branches/${id}`);
  return unwrapData(response);
}

/**
 * Normal BranchForm payloads remain JSON.
 * Branch-assignment payloads with a documents array use one multipart request.
 */
export async function createBranch(payload = {}) {
  const isAssignmentCreate = Array.isArray(payload?.documents);

  if (!isAssignmentCreate) {
    const response = await api.post("/admin/branches", payload);
    return unwrapData(response);
  }

  const formData = makeBranchCreateFormData(payload);

  const response = await api.post("/admin/branches", formData, {
    /*
     * Prevent an Axios JSON transform from serializing File objects to {}.
     * The browser still creates the multipart boundary.
     */
    headers: {
      "Content-Type": undefined,
    },
    transformRequest: [(data) => data],
  });

  return unwrapData(response);
}

export async function updateBranch(id, payload = {}) {
  const { documents: ignoredDocuments, ...branchPayload } = payload;
  const response = await api.put(`/admin/branches/${id}`, branchPayload);
  return unwrapData(response);
}

export async function deleteBranch(id) {
  const response = await api.delete(`/admin/branches/${id}`);
  return response.data;
}

export async function approveBranch(id) {
  const response = await api.post(`/admin/branches/${id}/approve`);
  return unwrapData(response);
}

export async function activateBranch(id) {
  const response = await api.post(`/admin/branches/${id}/activate`);
  return unwrapData(response);
}

export async function suspendBranch(id, reason = "") {
  const response = await api.post(`/admin/branches/${id}/suspend`, { reason });
  return unwrapData(response);
}

export async function rejectBranch(id, reason) {
  const response = await api.post(`/admin/branches/${id}/reject`, { reason });
  return unwrapData(response);
}

export async function getBranchParentOptions(type) {
  const response = await api.get("/admin/branches/parent-options", {
    params: { type },
  });

  return response.data?.data || [];
}

/**
 * Keep this endpoint for documents added after a branch already exists.
 * It is no longer used by the initial branch-assignment create flow.
 */
export async function uploadBranchDocument(branchId, formData) {
  const response = await api.post(
    `/admin/branches/${branchId}/documents`,
    formData,
  );

  return unwrapData(response);
}

export async function previewBranchDocument(documentId) {
  const response = await api.get(
    `/admin/branch-documents/${documentId}/preview`,
    { responseType: "blob" },
  );

  return response.data;
}

export async function downloadBranchDocument(documentId) {
  const response = await api.get(
    `/admin/branch-documents/${documentId}/download`,
    { responseType: "blob" },
  );

  return response.data;
}

export async function uploadBranchAgreement(branchId, formData) {
  const response = await api.post(
    `/admin/branches/${branchId}/agreements`,
    formData,
  );

  return unwrapData(response);
}

export async function previewBranchAgreement(agreementId) {
  const response = await api.get(
    `/admin/branch-agreements/${agreementId}/preview`,
    { responseType: "blob" },
  );

  return response.data;
}

export async function downloadBranchAgreement(agreementId) {
  const response = await api.get(
    `/admin/branch-agreements/${agreementId}/download`,
    { responseType: "blob" },
  );

  return response.data;
}
