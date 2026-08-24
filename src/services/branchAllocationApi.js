import api from "@/lib/api";

/*
|--------------------------------------------------------------------------
| Coverage Locations
|--------------------------------------------------------------------------
*/

/**
 * Get coverage locations.
 *
 * Supports:
 * - page
 * - per_page
 * - q/search
 * - type
 * - parent_id
 * - status
 * - all
 *
 * Backend:
 * GET /api/v1/admin/coverage-locations
 */
export async function getCoverageLocations(params = {}) {
  const queryParams = {
    page: params.page ?? 1,
    per_page: params.per_page ?? 100,
  };

  /*
   * Laravel controller expects `q`, not `search`.
   */
  if (params.q) {
    queryParams.q = params.q;
  } else if (params.search) {
    queryParams.q = params.search;
  }

  if (params.type) {
    queryParams.type = params.type;
  }

  if (params.parent_id !== undefined && params.parent_id !== null) {
    queryParams.parent_id = params.parent_id;
  }

  if (params.status) {
    queryParams.status = params.status;
  }

  /*
   * IMPORTANT:
   *
   * When all=true, backend returns:
   *
   * {
   *   data: [...]
   * }
   *
   * instead of Laravel pagination.
   */
  if (params.all === true) {
    queryParams.all = true;
    delete queryParams.page;
    delete queryParams.per_page;
  }

  const response = await api.get(
    "/admin/coverage-locations",
    {
      params: queryParams,
    },
  );

  return response.data;
}

/**
 * Get ALL coverage locations.
 *
 * Useful for dropdown/select components.
 *
 * Backend limits this to 2000 records.
 */
export async function getAllCoverageLocations(params = {}) {
  const response = await api.get(
    "/admin/coverage-locations",
    {
      params: {
        all: true,

        ...(params.q
          ? {
              q: params.q,
            }
          : params.search
            ? {
                q: params.search,
              }
            : {}),

        ...(params.type
          ? {
              type: params.type,
            }
          : {}),

        ...(params.parent_id !== undefined &&
        params.parent_id !== null
          ? {
              parent_id: params.parent_id,
            }
          : {}),

        ...(params.status
          ? {
              status: params.status,
            }
          : {}),
      },
    },
  );

  return response.data;
}

/**
 * Get single coverage location.
 */
export async function getCoverageLocation(id) {
  const response = await api.get(
    `/admin/coverage-locations/${id}`,
  );

  return response.data;
}

/**
 * Create coverage location.
 */
export async function createCoverageLocation(payload) {
  const response = await api.post(
    "/admin/coverage-locations",
    payload,
  );

  return response.data;
}

/**
 * Update coverage location.
 */
export async function updateCoverageLocation(id, payload) {
  const response = await api.put(
    `/admin/coverage-locations/${id}`,
    payload,
  );

  return response.data;
}

/**
 * Delete coverage location.
 */
export async function deleteCoverageLocation(id) {
  const response = await api.delete(
    `/admin/coverage-locations/${id}`,
  );

  return response.data;
};

/*
|--------------------------------------------------------------------------
| Coverage Location Parent Options
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| This should be used for the Parent Main Branch select.
|
| Backend:
|
| GET /api/v1/admin/coverage-locations/parent-options
|
| It returns ONLY:
| - MAIN_BRANCH_ZONE
| - ACTIVE
|
|--------------------------------------------------------------------------
*/

export async function getCoverageLocationParentOptions(
  excludeId = null,
) {
  const response = await api.get(
    "/admin/coverage-locations/parent-options",
    {
      params:
        excludeId !== null &&
        excludeId !== undefined
          ? {
              exclude_id: excludeId,
            }
          : {},
    },
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
 * Convert main coverage location to sub branch.
 *
 * UI can send either:
 *
 * parent_id
 *
 * OR
 *
 * destination_main_zone_id
 *
 * Backend receives only parent_id.
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

  delete normalizedPayload.destination_main_zone_id;

  const response = await api.post(
    `/admin/coverage-locations/${id}/convert-to-sub-branch`,
    normalizedPayload,
  );

  return response.data;
};

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

/*
|--------------------------------------------------------------------------
| Compatibility
|--------------------------------------------------------------------------
*/

export async function getCoverageBranches(params = {}) {
  return getBranches(params);
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

export function normalizeCoverageLocations(response) {
  return unwrapCollection(response);
}

export function normalizeBranches(response) {
  return unwrapCollection(response);
}

/*
|--------------------------------------------------------------------------
| Branch CRUD
|--------------------------------------------------------------------------
*/

function buildBranchPayload(payload) {
  const documents = payload.documents || [];

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
          formData.append(
            `${key}[]`,
            item,
          );
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

      formData.append(key, value);
    },
  );

  documents.forEach(
    (document, index) => {
      if (!document?.file) {
        return;
      }

      formData.append(
        `documents[${index}][document_type]`,
        document.document_type || "other",
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

export async function createBranch(payload) {
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