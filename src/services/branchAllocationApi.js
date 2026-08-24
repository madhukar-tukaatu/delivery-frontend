import api from "@/lib/api";

/*
|--------------------------------------------------------------------------
| Coverage Locations
|--------------------------------------------------------------------------
*/

/**
 * Get paginated coverage locations.
 *
 * Supported params:
 * - page
 * - per_page
 * - q
 * - search
 * - type
 * - parent_id
 * - status
 * - all
 */
export async function getCoverageLocations(params = {}) {
  const queryParams = {
    page: params.page ?? 1,
    per_page: params.per_page ?? 100,
  };

  /*
   * Backend search parameter is `q`.
   */
  const search = String(
    params.q ?? params.search ?? "",
  ).trim();

  if (search) {
    queryParams.q = search;
  }

  if (params.type) {
    queryParams.type = params.type;
  }

  if (
    params.parent_id !== undefined &&
    params.parent_id !== null
  ) {
    queryParams.parent_id = params.parent_id;
  }

  if (params.status) {
    queryParams.status = params.status;
  }

  /*
   * Request all records.
   *
   * Only use this when you really need all coverage
   * locations, not for Select dropdowns.
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
 * Get all coverage locations.
 *
 * NOTE:
 * This is intentionally NOT used by the
 * Main -> Sub Branch searchable Select.
 */
export async function getAllCoverageLocations(
  params = {},
) {
  const queryParams = {
    all: true,
  };

  const search = String(
    params.q ?? params.search ?? "",
  ).trim();

  if (search) {
    queryParams.q = search;
  }

  if (params.type) {
    queryParams.type = params.type;
  }

  if (
    params.parent_id !== undefined &&
    params.parent_id !== null
  ) {
    queryParams.parent_id = params.parent_id;
  }

  if (params.status) {
    queryParams.status = params.status;
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
 * Get a single coverage location.
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
export async function createCoverageLocation(
  payload,
) {
  const response = await api.post(
    "/admin/coverage-locations",
    payload,
  );

  return response.data;
}

/**
 * Update coverage location.
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
| SERVER-SIDE SEARCH
|
| Example:
|
| GET /api/v1/admin/coverage-locations/parent-options?q=chit
|
| Returns only matching ACTIVE MAIN_BRANCH_ZONE records.
|
|--------------------------------------------------------------------------
*/

export async function getCoverageLocationParentOptions(
  {
    q = "",
    excludeId = null,
  } = {},
) {
  const params = {};

  const search = String(q || "").trim();

  if (search) {
    params.q = search;
  }

  if (
    excludeId !== null &&
    excludeId !== undefined
  ) {
    params.exclude_id = excludeId;
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
| Main -> Sub Branch Conversion
|--------------------------------------------------------------------------
*/

/**
 * Get conversion options.
 */
export async function getCoverageConversionOptions(
  id,
) {
  const response = await api.get(
    `/admin/coverage-locations/${id}/conversion-options`,
  );

  return response.data;
}

/**
 * Convert Main Coverage Location to Sub Branch.
 *
 * UI may provide:
 *
 * parent_id
 *
 * OR:
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

  /*
   * Do not accidentally send undefined parent_id.
   */
  if (
    normalizedPayload.parent_id === undefined ||
    normalizedPayload.parent_id === null ||
    normalizedPayload.parent_id === ""
  ) {
    throw new Error(
      "A destination main zone is required.",
    );
  }

  normalizedPayload.parent_id = Number(
    normalizedPayload.parent_id,
  );

  const response = await api.post(
    `/admin/coverage-locations/${id}/convert-to-sub-branch`,
    normalizedPayload,
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Branches
|--------------------------------------------------------------------------
*/

/**
 * Get branches.
 *
 * Supports server-side params:
 *
 * {
 *   page,
 *   per_page,
 *   q,
 *   search,
 *   type,
 *   status,
 *   parent_id
 * }
 */
export async function getBranches(params = {}) {
  const queryParams = {
    ...params,
  };

  /*
   * Normalize frontend `search` to backend `q`
   * when necessary.
   */
  if (
    !queryParams.q &&
    queryParams.search
  ) {
    queryParams.q = queryParams.search;
  }

  delete queryParams.search;

  const response = await api.get(
    "/admin/branches",
    {
      params: queryParams,
    },
  );

  return response.data;
}

/**
 * Compatibility alias.
 */
export async function getCoverageBranches(
  params = {},
) {
  return getBranches(params);
}

/**
 * Get single branch.
 */
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

  if (
    Array.isArray(
      response?.data?.data,
    )
  ) {
    return response.data.data;
  }

  if (
    Array.isArray(
      response?.data?.items,
    )
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

export function normalizeBranches(response) {
  return unwrapCollection(response);
}

/*
|--------------------------------------------------------------------------
| Branch CRUD
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
        value,
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

/**
 * Create branch.
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

/**
 * Update branch.
 *
 * Laravel method spoofing is used because
 * multipart/form-data + PUT can be problematic.
 */
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

/**
 * Delete branch.
 */
export async function deleteBranch(id) {
  const response = await api.delete(
    `/admin/branches/${id}`,
  );

  return response.data;
}

/**
 * Get branch parent options.
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

/**
 * Approve branch.
 */
export async function approveBranch(id) {
  const response = await api.post(
    `/admin/branches/${id}/approve`,
  );

  return response.data;
}

/**
 * Activate branch.
 */
export async function activateBranch(id) {
  const response = await api.post(
    `/admin/branches/${id}/activate`,
  );

  return response.data;
}

/**
 * Suspend branch.
 */
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

/**
 * Reject branch.
 */
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