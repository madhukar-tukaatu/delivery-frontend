import api from "@/lib/api";

/*
|--------------------------------------------------------------------------
| Response helpers
|--------------------------------------------------------------------------
*/

function unwrap(response) {
  const body = response?.data ?? {};

  return body?.data ?? body;
}

/*
|--------------------------------------------------------------------------
| Pickup list normalization
|--------------------------------------------------------------------------
*/

function normalizeList(response) {
  const body = response?.data ?? {};

  const data = body?.data ?? body;

  /*
   * Laravel paginator:
   *
   * {
   *   data: {
   *     data: [],
   *     current_page: 1,
   *     last_page: 1,
   *     per_page: 15,
   *     total: 10
   *   }
   * }
   */

  if (Array.isArray(data)) {
    return {
      items: data,
      meta: body?.meta ?? null,
    };
  }

  return {
    items:
      data?.items ||
      data?.data ||
      data?.results ||
      [],
    meta:
      data?.meta ||
      body?.meta ||
      null,
  };
}

/*
|--------------------------------------------------------------------------
| Pickups
|--------------------------------------------------------------------------
*/

export async function getPickups(
  params = {}
) {
  const response =
    await api.get(
      "/admin/pickups",
      {
        params,
      }
    );

  return normalizeList(response);
}

export async function getPickup(
  requestNumber
) {
  if (!requestNumber) {
    throw new Error(
      "Pickup request number is required."
    );
  }

  const response =
    await api.get(
      `/admin/pickups/${encodeURIComponent(
        requestNumber
      )}`
    );

  return unwrap(response);
}

/*
|--------------------------------------------------------------------------
| Riders
|--------------------------------------------------------------------------
*/

export async function getPickupRiders() {
  const response =
    await api.get(
      "/admin/users",
      {
        params: {
          role: "rider",
          status: "active",
        },
      }
    );

  const data =
    response?.data?.data ??
    response?.data ??
    [];

  if (Array.isArray(data)) {
    return data;
  }

  return (
    data?.data ||
    data?.items ||
    data?.results ||
    []
  );
}

/*
|--------------------------------------------------------------------------
| Assign
|--------------------------------------------------------------------------
*/

export async function assignPickup(
  requestNumber,
  payload
) {
  if (!requestNumber) {
    throw new Error(
      "Pickup request number is required."
    );
  }

  const response =
    await api.post(
      `/admin/pickups/${encodeURIComponent(
        requestNumber
      )}/assign`,
      payload
    );

  return unwrap(response);
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

  const response =
    await api.post(
      `/admin/pickups/${encodeURIComponent(
        requestNumber
      )}/start`
    );

  return unwrap(response);
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

  const response =
    await api.post(
      `/admin/pickups/${encodeURIComponent(
        requestNumber
      )}/arrive`
    );

  return unwrap(response);
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

  const response =
    await api.post(
      `/admin/pickups/${encodeURIComponent(
        requestNumber
      )}/complete`
    );

  return unwrap(response);
}

/*
|--------------------------------------------------------------------------
| Fail
|--------------------------------------------------------------------------
*/

export async function failPickup(
  requestNumber,
  payload
) {
  if (!requestNumber) {
    throw new Error(
      "Pickup request number is required."
    );
  }

  const response =
    await api.post(
      `/admin/pickups/${encodeURIComponent(
        requestNumber
      )}/fail`,
      payload
    );

  return unwrap(response);
}