import api from "@/lib/api";

/*
|--------------------------------------------------------------------------
| Coverage Locations
|--------------------------------------------------------------------------
*/

export async function getCoverageLocations(params = {}) {
  const response = await api.get(
    "/admin/coverage-locations",
    {
      params,
    },
  );

  return response.data;
}

export async function getCoverageLocation(id) {
  const response = await api.get(
    `/admin/coverage-locations/${id}`,
  );

  return response.data;
}

export async function createCoverageLocation(payload) {
  const response = await api.post(
    "/admin/coverage-locations",
    payload,
  );

  return response.data;
}

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

export async function deleteCoverageLocation(id) {
  const response = await api.delete(
    `/admin/coverage-locations/${id}`,
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Main → Sub-Branch Conversion
|--------------------------------------------------------------------------
*/

export async function getCoverageConversionOptions(id) {
  const response = await api.get(
    `/admin/coverage-locations/${id}/conversion-options`,
  );

  return response.data;
}

/**
 * Convert a main coverage location into a sub-branch.
 *
 * Backend expects:
 *
 * parent_id
 *
 * The UI uses destination_main_zone_id internally,
 * but we normalize it here so the backend always
 * receives parent_id.
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
   * Do not send destination_main_zone_id to the
   * backend unless your backend explicitly needs it.
   *
   * The validation error you received proves that
   * parent_id is required.
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
| Compatibility aliases
|--------------------------------------------------------------------------
|
| Your older page was importing getCoverageBranches()
| and normalizeBranches().
|
| Your actual service already has getBranches().
| These aliases prevent naming mismatch.
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
| Normalizers
|--------------------------------------------------------------------------
*/

function unwrapCollection(response) {
  if (
    Array.isArray(response)
  ) {
    return response;
  }

  if (
    Array.isArray(response?.data)
  ) {
    return response.data;
  }

  if (
    Array.isArray(response?.data?.data)
  ) {
    return response.data.data;
  }

  if (
    Array.isArray(response?.data?.items)
  ) {
    return response.data.items;
  }

  if (
    Array.isArray(response?.items)
  ) {
    return response.items;
  }

  return [];
}

export function normalizeCoverageLocations(
  response,
) {
  return unwrapCollection(response);
}

export function normalizeBranches(
  response,
) {
  return unwrapCollection(response);
}

/*
|--------------------------------------------------------------------------
| Branch CRUD
|--------------------------------------------------------------------------
*/

function buildBranchPayload(payload) {
  const documents =
    payload.documents || [];

  const cleanPayload = {
    ...payload,
  };

  delete cleanPayload.documents;

  const formData =
    new FormData();

  Object.entries(
    cleanPayload,
  ).forEach(
    ([key, value]) => {
      if (
        value === undefined ||
        value === null
      ) {
        return;
      }

      if (
        Array.isArray(value)
      ) {
        value.forEach(
          (item) => {
            formData.append(
              `${key}[]`,
              item,
            );
          },
        );

        return;
      }

      if (
        typeof value ===
        "boolean"
      ) {
        formData.append(
          key,
          value ? "1" : "0",
        );

        return;
      }

      formData.append(
        key,
        value,
      );
    },
  );

  documents.forEach(
    (
      document,
      index,
    ) => {
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

export async function createBranch(
  payload,
) {
  const response =
    await api.post(
      "/admin/branches",
      buildBranchPayload(
        payload,
      ),
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
  const response =
    await api.post(
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

export async function deleteBranch(
  id,
) {
  const response =
    await api.delete(
      `/admin/branches/${id}`,
    );

  return response.data;
}

export async function getBranchParentOptions(
  type,
) {
  const response =
    await api.get(
      "/admin/branches/parent-options",
      {
        params: {
          type,
        },
      },
    );

  return response.data;
}

export async function approveBranch(
  id,
) {
  const response =
    await api.post(
      `/admin/branches/${id}/approve`,
    );

  return response.data;
}

export async function activateBranch(
  id,
) {
  const response =
    await api.post(
      `/admin/branches/${id}/activate`,
    );

  return response.data;
}

export async function suspendBranch(
  id,
  reason = "Suspended from admin panel.",
) {
  const response =
    await api.post(
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
  const response =
    await api.post(
      `/admin/branches/${id}/reject`,
      {
        reason,
      },
    );

  return response.data;
}