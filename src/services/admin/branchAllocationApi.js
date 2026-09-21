import api from "@/lib/api";

/*
|--------------------------------------------------------------------------
| Coverage Locations
|--------------------------------------------------------------------------
*/

export async function getCoverageLocations(params = {}) {
  const response = await api.get("/admin/coverage-locations", {
    params,
  });

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Coverage Location Parent Options
|--------------------------------------------------------------------------
*/

export async function getCoverageLocationParentOptions({
  q = "",
  excludeId = null,
} = {}) {
  const params = {};

  const search = String(q || "").trim();

  if (search.length > 0) {
    params.q = search;
  }

  /*
   * Backend accepts exclude_id.
   */
  if (excludeId !== null && excludeId !== undefined) {
    params.exclude_id = Number(excludeId);
  }

  const response = await api.get(
    "/admin/coverage-locations/parent-options",
    {
      params,
    },
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Single Coverage Location
|--------------------------------------------------------------------------
*/

export async function getCoverageLocation(id) {
  const response = await api.get(
    `/admin/coverage-locations/${id}`,
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Create Coverage Location
|--------------------------------------------------------------------------
*/

export async function createCoverageLocation(payload) {
  const response = await api.post(
    "/admin/coverage-locations",
    payload,
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Update Coverage Location
|--------------------------------------------------------------------------
*/

export async function updateCoverageLocation(
  id,
  payload,
) {
  const response = await api.put(
    `/admin/coverage-locations/${id}`,
    payload,
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Delete Coverage Location
|--------------------------------------------------------------------------
*/

export async function deleteCoverageLocation(id) {
  const response = await api.delete(
    `/admin/coverage-locations/${id}`,
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Coverage Location Map
|--------------------------------------------------------------------------
*/

export async function getCoverageLocationMap(
  params = {},
) {
  const response = await api.get(
    "/admin/coverage-locations/map",
    {
      params,
    },
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Main → Sub-Branch Conversion Options
|--------------------------------------------------------------------------
*/

export async function getCoverageConversionOptions(
  id,
) {
  const response = await api.get(
    `/admin/coverage-locations/${id}/conversion-options`,
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Main → Sub-Branch Conversion
|--------------------------------------------------------------------------
|
| Backend expects:
|
| parent_id
| name
| latitude
| longitude
| coverage_radius_km
|
|--------------------------------------------------------------------------
*/

export async function convertCoverageLocationToSubBranch(
  id,
  payload = {},
) {
  const normalizedPayload = {
    ...payload,

    parent_id:
      payload.parent_id ??
      payload.destination_main_zone_id,
  };

  /*
   * Do not send frontend-only field.
   */
  delete normalizedPayload.destination_main_zone_id;

  const response = await api.post(
    `/admin/coverage-locations/${id}/convert-to-sub-branch`,
    normalizedPayload,
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Compatibility Alias
|--------------------------------------------------------------------------
*/

export async function getCoverageBranches(
  params = {},
) {
  return getBranches(params);
}

/*
|--------------------------------------------------------------------------
| Branches
|--------------------------------------------------------------------------
*/

export async function getBranches(params = {}) {
  const response = await api.get(
    "/admin/branches",
    {
      params,
    },
  );

  return response.data;
}

export async function getBranch(id) {
  const response = await api.get(
    `/admin/branches/${id}`,
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Collection Normalizer
|--------------------------------------------------------------------------
*/

function unwrapCollection(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  if (Array.isArray(response?.data?.items)) {
    return response.data.items;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  return [];
}

export function normalizeCoverageLocations(
  response,
) {
  return unwrapCollection(response);
}

export function normalizeBranches(response) {
  return unwrapCollection(response);
}

/*
|--------------------------------------------------------------------------
| Branch Payload Builder
|--------------------------------------------------------------------------
*/

function buildBranchPayload(payload = {}) {
  const documents = Array.isArray(
    payload.documents,
  )
    ? payload.documents
    : [];

  const cleanPayload = {
    ...payload,
  };

  delete cleanPayload.documents;

  const formData = new FormData();

  Object.entries(cleanPayload).forEach(
    ([key, value]) => {
      if (
        value === undefined ||
        value === null
      ) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (
            item !== undefined &&
            item !== null
          ) {
            formData.append(
              `${key}[]`,
              item,
            );
          }
        });

        return;
      }

      if (typeof value === "boolean") {
        formData.append(
          key,
          value ? "1" : "0",
        );

        return;
      }

      formData.append(
        key,
        String(value),
      );
    },
  );

  documents.forEach(
    (document, index) => {
      if (!document?.file) {
        return;
      }

      formData.append(
        `documents[${index}][document_type]`,
        document.document_type ||
          "other",
      );

      formData.append(
        `documents[${index}][title]`,
        document.title || "",
      );

      formData.append(
        `documents[${index}][notes]`,
        document.notes || "",
      );

      formData.append(
        `documents[${index}][file]`,
        document.file,
      );
    },
  );

  return formData;
}

/*
|--------------------------------------------------------------------------
| Branch CRUD
|--------------------------------------------------------------------------
*/

export async function createBranch(
  payload,
) {
  const response = await api.post(
    "/admin/branches",
    buildBranchPayload(payload),
    {
      headers: {
        "Content-Type":
          "multipart/form-data",
      },
    },
  );

  return response.data;
}

export async function updateBranch(
  id,
  payload,
) {
  const response = await api.post(
    `/admin/branches/${id}`,
    buildBranchPayload({
      ...payload,
      _method: "PUT",
    }),
    {
      headers: {
        "Content-Type":
          "multipart/form-data",
      },
    },
  );

  return response.data;
}

export async function deleteBranch(id) {
  const response = await api.delete(
    `/admin/branches/${id}`,
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Branch Parent Options
|--------------------------------------------------------------------------
*/

export async function getBranchParentOptions(
  type,
) {
  const response = await api.get(
    "/admin/branches/parent-options",
    {
      params: {
        type,
      },
    },
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Branch Actions
|--------------------------------------------------------------------------
*/

export async function approveBranch(id) {
  const response = await api.post(
    `/admin/branches/${id}/approve`,
  );

  return response.data;
}

export async function activateBranch(id) {
  const response = await api.post(
    `/admin/branches/${id}/activate`,
  );

  return response.data;
}

export async function suspendBranch(
  id,
  reason = "Suspended from admin panel.",
) {
  const response = await api.post(
    `/admin/branches/${id}/suspend`,
    {
      reason,
    },
  );

  return response.data;
}

export async function rejectBranch(
  id,
  reason = "Rejected from admin panel.",
) {
  const response = await api.post(
    `/admin/branches/${id}/reject`,
    {
      reason,
    },
  );

  return response.data;
}

export async function resendBranchAccountInvitation(
  id,
) {
  const response = await api.post(
    `/admin/branches/${id}/resend-account-invitation`,
  );

  return response.data;
}