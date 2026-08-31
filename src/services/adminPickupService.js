import api from "@/lib/api";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function unwrapResponse(response) {
  const payload = response?.data ?? response;

  /*
   * Laravel responses may be:
   *
   * {
   *   success: true,
   *   data: {...}
   * }
   *
   * or:
   *
   * {
   *   data: {
   *     data: {...}
   *   }
   * }
   */

  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload
  ) {
    return payload.data;
  }

  return payload;
}

function normalizeListResponse(response) {
  const payload = response?.data ?? response;

  if (!payload) {
    return {
      items: [],
      meta: null,
    };
  }

  /*
   * Laravel pagination:
   *
   * {
   *   data: [...],
   *   meta: {...}
   * }
   */

  if (Array.isArray(payload)) {
    return {
      items: payload,
      meta: null,
    };
  }

  if (Array.isArray(payload.data)) {
    return {
      items: payload.data,
      meta: payload.meta ?? null,
    };
  }

  if (Array.isArray(payload.items)) {
    return {
      items: payload.items,
      meta: payload.meta ?? null,
    };
  }

  return {
    items: [],
    meta: payload.meta ?? null,
  };
}

function normalizePickup(payload) {
  if (!payload) {
    return null;
  }

  /*
   * Support:
   *
   * { data: pickup }
   * { pickup: pickup }
   * pickup
   */

  if (
    payload.data &&
    typeof payload.data === "object" &&
    !Array.isArray(payload.data)
  ) {
    payload = payload.data;
  }

  if (
    payload.pickup &&
    typeof payload.pickup === "object"
  ) {
    payload = payload.pickup;
  }

  return payload;
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

/*
|--------------------------------------------------------------------------
| Pickup list
|--------------------------------------------------------------------------
*/

export async function getPickups({
  page = 1,
  per_page = 15,
  search = "",
  status = "",
} = {}) {
  try {
    const params = {
      page,
      per_page,
    };

    if (search?.trim()) {
      params.search = search.trim();
    }

    if (status && status !== "all") {
      params.status = status;
    }

    const response = await api.get(
      "/api/v1/admin/pickups",
      {
        params,
      }
    );

    return normalizeListResponse(response);
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Unable to load pickup requests."
      )
    );
  }
}

/*
|--------------------------------------------------------------------------
| Single pickup
|--------------------------------------------------------------------------
|
| requestNumber should normally be the backend pickup request number.
|
*/

export async function getPickup(requestNumber) {
  if (!requestNumber) {
    throw new Error(
      "Pickup request number is required."
    );
  }

  try {
    const response = await api.get(
      `/api/v1/admin/pickups/${encodeURIComponent(
        requestNumber
      )}`
    );

    return normalizePickup(
      unwrapResponse(response)
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Unable to load pickup details."
      )
    );
  }
}

/*
|--------------------------------------------------------------------------
| Riders
|--------------------------------------------------------------------------
*/

export async function getPickupRiders() {
  try {
    const response = await api.get(
      "/api/v1/admin/pickups/riders"
    );

    const payload =
      unwrapResponse(response);

    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.items)) {
      return payload.items;
    }

    if (Array.isArray(payload?.list)) {
      return payload.list;
    }

    if (Array.isArray(payload?.riders)) {
      return payload.riders;
    }

    return [];
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Unable to load riders."
      )
    );
  }
}

/*
|--------------------------------------------------------------------------
| Assign
|--------------------------------------------------------------------------
*/

export async function assignPickup(
  requestNumber,
  body
) {
  if (!requestNumber) {
    throw new Error(
      "Pickup request number is required."
    );
  }

  if (!body?.staff_id) {
    throw new Error(
      "Staff ID is required."
    );
  }

  try {
    const response = await api.post(
      `/api/v1/admin/pickups/${encodeURIComponent(
        requestNumber
      )}/assign`,
      {
        staff_id: Number(
          body.staff_id
        ),
      }
    );

    return normalizePickup(
      unwrapResponse(response)
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Unable to assign pickup."
      )
    );
  }
}

/*
|--------------------------------------------------------------------------
| Start
|--------------------------------------------------------------------------
*/

export async function startPickup(
  requestNumber
) {
  if (!requestNumber) {
    throw new Error(
      "Pickup request number is required."
    );
  }

  try {
    const response = await api.post(
      `/api/v1/admin/pickups/${encodeURIComponent(
        requestNumber
      )}/start`
    );

    return normalizePickup(
      unwrapResponse(response)
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Unable to start pickup."
      )
    );
  }
}

/*
|--------------------------------------------------------------------------
| Arrive
|--------------------------------------------------------------------------
*/

export async function arrivePickup(
  requestNumber
) {
  if (!requestNumber) {
    throw new Error(
      "Pickup request number is required."
    );
  }

  try {
    const response = await api.post(
      `/api/v1/admin/pickups/${encodeURIComponent(
        requestNumber
      )}/arrive`
    );

    return normalizePickup(
      unwrapResponse(response)
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Unable to mark pickup as arrived."
      )
    );
  }
}

/*
|--------------------------------------------------------------------------
| Complete
|--------------------------------------------------------------------------
*/

export async function completePickup(
  requestNumber
) {
  if (!requestNumber) {
    throw new Error(
      "Pickup request number is required."
    );
  }

  try {
    const response = await api.post(
      `/api/v1/admin/pickups/${encodeURIComponent(
        requestNumber
      )}/complete`
    );

    return normalizePickup(
      unwrapResponse(response)
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Unable to complete pickup."
      )
    );
  }
}

/*
|--------------------------------------------------------------------------
| Fail
|--------------------------------------------------------------------------
*/

export async function failPickup(
  requestNumber,
  body
) {
  if (!requestNumber) {
    throw new Error(
      "Pickup request number is required."
    );
  }

  if (!body?.reason?.trim()) {
    throw new Error(
      "Failure reason is required."
    );
  }

  try {
    const response = await api.post(
      `/api/v1/admin/pickups/${encodeURIComponent(
        requestNumber
      )}/fail`,
      {
        reason: body.reason.trim(),
      }
    );

    return normalizePickup(
      unwrapResponse(response)
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Unable to fail pickup."
      )
    );
  }
}

/*
|--------------------------------------------------------------------------
| Export helpers
|--------------------------------------------------------------------------
*/

export {
  normalizePickup,
  normalizeListResponse,
};