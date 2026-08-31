"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Search,
  Truck,
  UserCheck,
  XCircle,
} from "lucide-react";

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PICKUPS_ENDPOINT = "/api/v1/admin/pickups";

/*
|--------------------------------------------------------------------------
| Status configuration
|--------------------------------------------------------------------------
*/

const STATUS = {
  REQUESTED: "requested",
  ASSIGNED: "assigned",
  STARTED: "started",
  ARRIVED: "arrived",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

const STATUS_META = {
  requested: {
    label: "Requested",
    className:
      "bg-amber-50 text-amber-700 ring-amber-200",
  },

  assigned: {
    label: "Assigned",
    className:
      "bg-blue-50 text-blue-700 ring-blue-200",
  },

  started: {
    label: "Started",
    className:
      "bg-indigo-50 text-indigo-700 ring-indigo-200",
  },

  arrived: {
    label: "Arrived",
    className:
      "bg-purple-50 text-purple-700 ring-purple-200",
  },

  completed: {
    label: "Completed",
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },

  failed: {
    label: "Failed",
    className:
      "bg-red-50 text-red-700 ring-red-200",
  },

  cancelled: {
    label: "Cancelled",
    className:
      "bg-gray-100 text-gray-600 ring-gray-200",
  },
};

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function getStatusMeta(status) {
  const normalized = String(status || "").toLowerCase();

  return (
    STATUS_META[normalized] || {
      label: normalized
        ? normalized.replaceAll("_", " ")
        : "Unknown",
      className:
        "bg-gray-100 text-gray-600 ring-gray-200",
    }
  );
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDateOnly(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NP", {
    dateStyle: "medium",
  }).format(date);
}

function getInitials(name) {
  if (!name) {
    return "R";
  }

  return String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getPickupData(payload) {
  if (!payload) {
    return null;
  }

  /*
   * Supports:
   *
   * {
   *   success: true,
   *   data: {...}
   * }
   *
   * and
   *
   * {
   *   success: true,
   *   data: {
   *      data: {...}
   *   }
   * }
   */

  let data = payload?.data ?? payload;

  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    data.data &&
    typeof data.data === "object"
  ) {
    data = data.data;
  }

  return data;
}

function getListData(payload) {
  if (!payload) {
    return {
      items: [],
      meta: null,
    };
  }

  let data = payload?.data ?? payload;

  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    data.data
  ) {
    data = data.data;
  }

  if (Array.isArray(data)) {
    return {
      items: data,
      meta: payload?.meta ?? null,
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
      payload?.meta ||
      null,
  };
}

/*
|--------------------------------------------------------------------------
| API helper
|--------------------------------------------------------------------------
*/

async function apiRequest(
  endpoint,
  {
    method = "GET",
    body = null,
    signal,
  } = {}
) {
  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body
        ? JSON.stringify(body)
        : undefined,
      signal,
    }
  );

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      "Something went wrong.";

    const error = new Error(message);

    error.status = response.status;
    error.payload = payload;

    throw error;
  }

  return payload;
}

/*
|--------------------------------------------------------------------------
| Status Badge
|--------------------------------------------------------------------------
*/

function StatusBadge({ status }) {
  const meta = getStatusMeta(status);

  return (
    <span
      className={[
        "inline-flex items-center rounded-full",
        "px-2.5 py-1 text-xs font-semibold",
        "ring-1 ring-inset",
        meta.className,
      ].join(" ")}
    >
      {meta.label}
    </span>
  );
}

/*
|--------------------------------------------------------------------------
| Main page
|--------------------------------------------------------------------------
*/

export default function AdminPickupsPage() {
  const [pickups, setPickups] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [page, setPage] = useState(1);
  const [perPage] = useState(15);

  const [pagination, setPagination] =
    useState(null);

  const [selectedPickup, setSelectedPickup] =
    useState(null);

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState("");

  const [showAssignModal, setShowAssignModal] =
    useState(false);

  const [riders, setRiders] = useState([]);
  const [ridersLoading, setRidersLoading] =
    useState(false);

  const [selectedRider, setSelectedRider] =
    useState("");

  const [showFailModal, setShowFailModal] =
    useState(false);

  const [failReason, setFailReason] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | Fetch pickups
  |--------------------------------------------------------------------------
  */

  const fetchPickups = useCallback(
    async ({
      silent = false,
      requestedPage = page,
    } = {}) => {
      try {
        setError("");

        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const params = new URLSearchParams();

        params.set(
          "page",
          String(requestedPage)
        );

        params.set(
          "per_page",
          String(perPage)
        );

        if (search.trim()) {
          params.set(
            "search",
            search.trim()
          );
        }

        if (statusFilter !== "all") {
          params.set(
            "status",
            statusFilter
          );
        }

        const payload =
          await apiRequest(
            `${PICKUPS_ENDPOINT}?${params.toString()}`
          );

        const result =
          getListData(payload);

        setPickups(result.items);

        /*
         * Laravel paginator:
         *
         * meta:
         * {
         *   current_page,
         *   last_page,
         *   per_page,
         *   total
         * }
         */

        setPagination(
          result.meta || null
        );
      } catch (err) {
        console.error(
          "Failed to load pickups:",
          err
        );

        setError(
          err?.message ||
            "Unable to load pickup requests."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      page,
      perPage,
      search,
      statusFilter,
    ]
  );

  useEffect(() => {
    fetchPickups();
  }, [fetchPickups]);

  /*
  |--------------------------------------------------------------------------
  | Search / filter
  |--------------------------------------------------------------------------
  */

  function handleSearchSubmit(event) {
    event.preventDefault();

    setPage(1);

    fetchPickups({
      requestedPage: 1,
    });
  }

  function handleStatusChange(value) {
    setStatusFilter(value);
    setPage(1);
  }

  /*
  |--------------------------------------------------------------------------
  | Open details
  |--------------------------------------------------------------------------
  */

  async function openDetails(pickup) {
    const requestNumber =
      pickup?.request_number;

    if (!requestNumber) {
      setSelectedPickup(pickup);
      return;
    }

    try {
      setDetailsLoading(true);

      const payload =
        await apiRequest(
          `${PICKUPS_ENDPOINT}/${encodeURIComponent(
            requestNumber
          )}`
        );

      const data =
        getPickupData(payload);

      setSelectedPickup(data || pickup);
    } catch (err) {
      console.error(
        "Failed to load pickup:",
        err
      );

      setError(
        err?.message ||
          "Unable to load pickup details."
      );

      setSelectedPickup(pickup);
    } finally {
      setDetailsLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Riders
  |--------------------------------------------------------------------------
  */

  async function loadRiders() {
    try {
      setRidersLoading(true);

      /*
       * Adjust this endpoint if your admin
       * rider/staff endpoint is different.
       */

      const payload =
        await apiRequest(
          "/api/v1/admin/users?role=rider&status=active"
        );

      const data =
        payload?.data ?? payload;

      const list =
        Array.isArray(data)
          ? data
          : data?.data ||
            data?.items ||
            [];

      setRiders(list);
    } catch (err) {
      console.error(
        "Failed to load riders:",
        err
      );

      setError(
        err?.message ||
          "Unable to load riders."
      );
    } finally {
      setRidersLoading(false);
    }
  }

  async function openAssignModal() {
    if (!selectedPickup) {
      return;
    }

    setSelectedRider(
      String(
        selectedPickup?.assigned_to ||
          selectedPickup?.assignedStaff?.id ||
          ""
      )
    );

    setShowAssignModal(true);

    await loadRiders();
  }

  /*
  |--------------------------------------------------------------------------
  | Generic action
  |--------------------------------------------------------------------------
  */

  async function performAction(
    action,
    body = null
  ) {
    if (!selectedPickup) {
      return;
    }

    const requestNumber =
      selectedPickup.request_number;

    if (!requestNumber) {
      setError(
        "Pickup request number is missing."
      );

      return;
    }

    try {
      setActionLoading(action);
      setError("");

      const payload =
        await apiRequest(
          `${PICKUPS_ENDPOINT}/${encodeURIComponent(
            requestNumber
          )}/${action}`,
          {
            method: "POST",
            body,
          }
        );

      const updated =
        getPickupData(payload);

      if (updated) {
        setSelectedPickup(updated);
      }

      await fetchPickups({
        silent: true,
        requestedPage: page,
      });
    } catch (err) {
      console.error(
        `Pickup ${action} failed:`,
        err
      );

      setError(
        err?.message ||
          `Unable to ${action} pickup.`
      );
    } finally {
      setActionLoading("");
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Assign
  |--------------------------------------------------------------------------
  */

  async function assignRider() {
    if (!selectedRider) {
      setError(
        "Please select a rider."
      );

      return;
    }

    await performAction(
      "assign",
      {
        staff_id: Number(
          selectedRider
        ),
      }
    );

    setShowAssignModal(false);
  }

  /*
  |--------------------------------------------------------------------------
  | Fail
  |--------------------------------------------------------------------------
  */

  async function submitFailure() {
    const reason =
      failReason.trim();

    if (!reason) {
      setError(
        "Please provide a failure reason."
      );

      return;
    }

    await performAction(
      "fail",
      {
        reason,
      }
    );

    setFailReason("");
    setShowFailModal(false);
  }

  /*
  |--------------------------------------------------------------------------
  | Derived data
  |--------------------------------------------------------------------------
  */

  const total =
    pagination?.total ??
    pickups.length;

  const currentPage =
    pagination?.current_page ??
    page;

  const lastPage =
    pagination?.last_page ??
    Math.max(
      1,
      Math.ceil(
        total / perPage
      )
    );

  const canPrevious =
    currentPage > 1;

  const canNext =
    currentPage < lastPage;

  const summary = useMemo(() => {
    return {
      total: pickups.length,

      requested: pickups.filter(
        (pickup) =>
          pickup.status ===
          STATUS.REQUESTED
      ).length,

      assigned: pickups.filter(
        (pickup) =>
          pickup.status ===
            STATUS.ASSIGNED ||
          pickup.status ===
            STATUS.STARTED ||
          pickup.status ===
            STATUS.ARRIVED
      ).length,

      completed: pickups.filter(
        (pickup) =>
          pickup.status ===
          STATUS.COMPLETED
      ).length,
    };
  }, [pickups]);

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Header */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900 text-white">
                <Truck className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                  Pickup Requests
                </h1>

                <p className="mt-0.5 text-sm text-gray-500">
                  Manage merchant pickup requests,
                  riders and shipment collection.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              fetchPickups({
                silent: true,
              })
            }
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={[
                "h-4 w-4",
                refreshing
                  ? "animate-spin"
                  : "",
              ].join(" ")}
            />

            Refresh
          </button>
        </div>

        {/* Error */}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="flex-1 text-sm">
              {error}
            </div>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="text-xs font-semibold text-red-700 hover:text-red-900"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Summary cards */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<Package className="h-5 w-5" />}
            label="Total"
            value={summary.total}
          />

          <SummaryCard
            icon={<Clock className="h-5 w-5" />}
            label="Requested"
            value={summary.requested}
          />

          <SummaryCard
            icon={<Truck className="h-5 w-5" />}
            label="In Progress"
            value={summary.assigned}
          />

          <SummaryCard
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
            label="Completed"
            value={summary.completed}
          />
        </div>

        {/* Filters */}

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <form
            onSubmit={
              handleSearchSubmit
            }
            className="flex flex-col gap-3 lg:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search request number, store reference, merchant..."
                className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                handleStatusChange(
                  event.target.value
                )
              }
              className="h-11 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            >
              <option value="all">
                All statuses
              </option>

              <option value="requested">
                Requested
              </option>

              <option value="assigned">
                Assigned
              </option>

              <option value="started">
                Started
              </option>

              <option value="arrived">
                Arrived
              </option>

              <option value="completed">
                Completed
              </option>

              <option value="failed">
                Failed
              </option>

              <option value="cancelled">
                Cancelled
              </option>
            </select>

            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
          </form>
        </div>

        {/* Table */}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <TableHeader>
                    Request
                  </TableHeader>

                  <TableHeader>
                    Merchant
                  </TableHeader>

                  <TableHeader>
                    Pickup Location
                  </TableHeader>

                  <TableHeader>
                    Rider
                  </TableHeader>

                  <TableHeader>
                    Shipments
                  </TableHeader>

                  <TableHeader>
                    Status
                  </TableHeader>

                  <TableHeader>
                    Requested
                  </TableHeader>

                  <TableHeader align="right">
                    Action
                  </TableHeader>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <LoadingRows />
                ) : pickups.length === 0 ? (
                  <EmptyState />
                ) : (
                  pickups.map(
                    (pickup) => (
                      <PickupRow
                        key={
                          pickup.id ??
                          pickup.request_number
                        }
                        pickup={pickup}
                        onView={
                          openDetails
                        }
                      />
                    )
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}

          {!loading &&
            pickups.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">
                  Showing{" "}
                  <span className="font-semibold text-gray-700">
                    {pickups.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-700">
                    {total}
                  </span>{" "}
                  pickup requests
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      !canPrevious
                    }
                    onClick={() => {
                      const next =
                        currentPage - 1;

                      setPage(next);

                      fetchPickups({
                        requestedPage:
                          next,
                      });
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <span className="px-2 text-sm font-medium text-gray-700">
                    Page {currentPage} of{" "}
                    {lastPage}
                  </span>

                  <button
                    type="button"
                    disabled={
                      !canNext
                    }
                    onClick={() => {
                      const next =
                        currentPage + 1;

                      setPage(next);

                      fetchPickups({
                        requestedPage:
                          next,
                      });
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Details drawer */}

      {selectedPickup && (
        <PickupDetailsDrawer
          pickup={selectedPickup}
          loading={detailsLoading}
          actionLoading={actionLoading}
          onClose={() =>
            setSelectedPickup(null)
          }
          onAssign={
            openAssignModal
          }
          onStart={() =>
            performAction("start")
          }
          onArrive={() =>
            performAction("arrive")
          }
          onComplete={() =>
            performAction("complete")
          }
          onFail={() =>
            setShowFailModal(true)
          }
        />
      )}

      {/* Assign modal */}

      {showAssignModal && (
        <AssignRiderModal
          riders={riders}
          loading={ridersLoading}
          selectedRider={
            selectedRider
          }
          setSelectedRider={
            setSelectedRider
          }
          actionLoading={
            actionLoading
          }
          onClose={() =>
            setShowAssignModal(false)
          }
          onSubmit={
            assignRider
          }
        />
      )}

      {/* Failure modal */}

      {showFailModal && (
        <FailPickupModal
          reason={failReason}
          setReason={setFailReason}
          loading={
            actionLoading === "fail"
          }
          onClose={() =>
            setShowFailModal(false)
          }
          onSubmit={
            submitFailure
          }
        />
      )}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Summary Card
|--------------------------------------------------------------------------
*/

function SummaryCard({
  icon,
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-sm font-medium text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Table Header
|--------------------------------------------------------------------------
*/

function TableHeader({
  children,
  align = "left",
}) {
  return (
    <th
      className={[
        "px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500",
        align === "right"
          ? "text-right"
          : "text-left",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

/*
|--------------------------------------------------------------------------
| Pickup Row
|--------------------------------------------------------------------------
*/

function PickupRow({
  pickup,
  onView,
}) {
  const merchant =
    pickup.merchant;

  const location =
    pickup.pickupLocation;

  const rider =
    pickup.assignedStaff;

  const shipments =
    pickup.active_shipments ??
    pickup.shipments ??
    [];

  const shipmentCount =
    pickup.parcel_quantity ??
    shipments.length ??
    0;

  return (
    <tr className="transition hover:bg-gray-50/80">
      <td className="px-5 py-4 align-top">
        <div>
          <p className="font-semibold text-gray-900">
            {pickup.request_number ||
              `#${pickup.id}`}
          </p>

          {pickup.store_reference && (
            <p className="mt-1 text-xs text-gray-500">
              Ref:{" "}
              <span className="font-medium text-gray-700">
                {
                  pickup.store_reference
                }
              </span>
            </p>
          )}
        </div>
      </td>

      <td className="px-5 py-4 align-top">
        <p className="font-medium text-gray-900">
          {merchant?.business_name ||
            merchant?.name ||
            pickup.pickup_name ||
            "—"}
        </p>

        {merchant?.email && (
          <p className="mt-1 text-xs text-gray-500">
            {merchant.email}
          </p>
        )}
      </td>

      <td className="px-5 py-4 align-top">
        <div className="flex max-w-[260px] items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />

          <div>
            <p className="line-clamp-2 text-sm text-gray-700">
              {location?.name ||
                pickup.pickup_address ||
                "—"}
            </p>

            {(pickup.pickup_city ||
              pickup.pickup_area) && (
              <p className="mt-1 text-xs text-gray-500">
                {[
                  pickup.pickup_area,
                  pickup.pickup_city,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>
        </div>
      </td>

      <td className="px-5 py-4 align-top">
        {rider ? (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700">
              {getInitials(
                rider.name ||
                  rider.full_name
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-gray-900">
                {rider.name ||
                  rider.full_name ||
                  "Rider"}
              </p>

              {rider.phone && (
                <p className="text-xs text-gray-500">
                  {rider.phone}
                </p>
              )}
            </div>
          </div>
        ) : (
          <span className="text-sm text-gray-400">
            Unassigned
          </span>
        )}
      </td>

      <td className="px-5 py-4 align-top">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-400" />

          <span className="text-sm font-semibold text-gray-700">
            {shipmentCount}
          </span>
        </div>
      </td>

      <td className="px-5 py-4 align-top">
        <StatusBadge
          status={pickup.status}
        />
      </td>

      <td className="px-5 py-4 align-top">
        <p className="whitespace-nowrap text-sm text-gray-600">
          {formatDate(
            pickup.requested_at
          )}
        </p>
      </td>

      <td className="px-5 py-4 text-right align-top">
        <button
          type="button"
          onClick={() =>
            onView(pickup)
          }
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          <Eye className="h-4 w-4" />
          View
        </button>
      </td>
    </tr>
  );
}

/*
|--------------------------------------------------------------------------
| Loading rows
|--------------------------------------------------------------------------
*/

function LoadingRows() {
  return Array.from({
    length: 7,
  }).map((_, index) => (
    <tr key={index}>
      {Array.from({
        length: 8,
      }).map(
        (_, cellIndex) => (
          <td
            key={cellIndex}
            className="px-5 py-5"
          >
            <div className="h-4 animate-pulse rounded bg-gray-100" />
          </td>
        )
      )}
    </tr>
  ));
}

/*
|--------------------------------------------------------------------------
| Empty state
|--------------------------------------------------------------------------
*/

function EmptyState() {
  return (
    <tr>
      <td
        colSpan={8}
        className="px-5 py-16 text-center"
      >
        <div className="mx-auto flex max-w-sm flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
            <Package className="h-6 w-6" />
          </div>

          <h3 className="mt-4 text-sm font-semibold text-gray-900">
            No pickup requests found
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Try changing your search or
            status filter.
          </p>
        </div>
      </td>
    </tr>
  );
}

/*
|--------------------------------------------------------------------------
| Details Drawer
|--------------------------------------------------------------------------
*/

function PickupDetailsDrawer({
  pickup,
  loading,
  actionLoading,
  onClose,
  onAssign,
  onStart,
  onArrive,
  onComplete,
  onFail,
}) {
  const status =
    String(
      pickup.status || ""
    ).toLowerCase();

  const shipments =
    pickup.active_shipments ??
    pickup.shipments ??
    [];

  const rider =
    pickup.assignedStaff;

  const merchant =
    pickup.merchant;

  const location =
    pickup.pickupLocation;

  const busy =
    Boolean(actionLoading);

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        {/* Drawer header */}

        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-gray-900">
                {pickup.request_number ||
                  `Pickup #${pickup.id}`}
              </h2>

              <StatusBadge
                status={pickup.status}
              />
            </div>

            {pickup.store_reference && (
              <p className="mt-1 text-sm text-gray-500">
                Store reference:{" "}
                <span className="font-medium text-gray-700">
                  {
                    pickup.store_reference
                  }
                </span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer body */}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-6 p-6">
              {/* Pickup contact */}

              <section>
                <SectionTitle>
                  Pickup Contact
                </SectionTitle>

                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DetailItem
                      label="Name"
                      value={
                        pickup.pickup_name ||
                        merchant?.business_name ||
                        merchant?.name
                      }
                    />

                    <DetailItem
                      label="Phone"
                      value={
                        pickup.pickup_phone
                      }
                    />

                    <DetailItem
                      label="Email"
                      value={
                        pickup.pickup_email
                      }
                    />

                    <DetailItem
                      label="Preferred pickup"
                      value={formatDate(
                        pickup.preferred_pickup_at
                      )}
                    />
                  </div>

                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Address
                        </p>

                        <p className="mt-1 text-sm text-gray-700">
                          {pickup.pickup_address ||
                            "—"}
                        </p>

                        {(pickup.pickup_area ||
                          pickup.pickup_city) && (
                          <p className="mt-1 text-xs text-gray-500">
                            {[
                              pickup.pickup_area,
                              pickup.pickup_city,
                            ]
                              .filter(
                                Boolean
                              )
                              .join(
                                ", "
                              )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Branch */}

              <section>
                <SectionTitle>
                  Pickup Routing
                </SectionTitle>

                <div className="grid gap-3 sm:grid-cols-2">
                  <RouteBox
                    label="Pickup Branch"
                    value={
                      pickup.pickupBranch
                        ?.name ||
                      pickup.pickup_branch
                        ?.name ||
                      pickup.pickup_branch_id
                        ? `Branch #${pickup.pickup_branch_id}`
                        : "—"
                    }
                  />

                  <RouteBox
                    label="Pickup Sub Branch"
                    value={
                      pickup.pickupSubBranch
                        ?.name ||
                      pickup.pickup_sub_branch
                        ?.name ||
                      pickup.pickup_sub_branch_id
                        ? `Sub branch #${pickup.pickup_sub_branch_id}`
                        : "—"
                    }
                  />

                  <RouteBox
                    label="Origin Branch"
                    value={
                      pickup.branch?.name ||
                      pickup.branch_id
                        ? `Branch #${pickup.branch_id}`
                        : "—"
                    }
                  />

                  <RouteBox
                    label="Origin Sub Branch"
                    value={
                      pickup.subBranch?.name ||
                      pickup.sub_branch_id
                        ? `Sub branch #${pickup.sub_branch_id}`
                        : "—"
                    }
                  />
                </div>
              </section>

              {/* Rider */}

              <section>
                <div className="flex items-center justify-between">
                  <SectionTitle>
                    Assigned Rider
                  </SectionTitle>

                  {[
                    STATUS.REQUESTED,
                    STATUS.ASSIGNED,
                    STATUS.STARTED,
                  ].includes(status) && (
                    <button
                      type="button"
                      onClick={onAssign}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                    >
                      <UserCheck className="h-4 w-4" />

                      {rider
                        ? "Reassign"
                        : "Assign Rider"}
                    </button>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  {rider ? (
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-700">
                        {getInitials(
                          rider.name ||
                            rider.full_name
                        )}
                      </div>

                      <div>
                        <p className="font-semibold text-gray-900">
                          {rider.name ||
                            rider.full_name ||
                            "Rider"}
                        </p>

                        {rider.phone && (
                          <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                            <Phone className="h-3.5 w-3.5" />

                            {rider.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <UserCheck className="h-5 w-5" />
                      No rider assigned.
                    </div>
                  )}
                </div>
              </section>

              {/* Shipments */}

              <section>
                <div className="flex items-center justify-between">
                  <SectionTitle>
                    Shipments
                  </SectionTitle>

                  <span className="text-sm font-semibold text-gray-500">
                    {shipments.length}
                  </span>
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200">
                  {shipments.length ===
                  0 ? (
                    <div className="p-6 text-center text-sm text-gray-500">
                      No shipments attached.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {shipments.map(
                        (item) => {
                          const shipment =
                            item?.shipment ||
                            item;

                          return (
                            <div
                              key={
                                item.id ??
                                shipment.id
                              }
                              className="flex items-center justify-between gap-4 p-4"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                                  <Package className="h-4 w-4 text-gray-600" />
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-gray-900">
                                    {shipment.tracking_number ||
                                      shipment.awb ||
                                      `Shipment #${shipment.id}`}
                                  </p>

                                  <p className="mt-1 text-xs text-gray-500">
                                    {
                                      shipment.status
                                    }
                                  </p>
                                </div>
                              </div>

                              {item.remarks && (
                                <p className="max-w-[180px] text-right text-xs text-gray-500">
                                  {
                                    item.remarks
                                  }
                                </p>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Timeline */}

              <section>
                <SectionTitle>
                  Pickup Timeline
                </SectionTitle>

                <div className="space-y-3">
                  <TimelineItem
                    label="Requested"
                    value={
                      pickup.requested_at
                    }
                  />

                  <TimelineItem
                    label="Assigned"
                    value={
                      pickup.assigned_at
                    }
                  />

                  <TimelineItem
                    label="Accepted / Started"
                    value={
                      pickup.accepted_at
                    }
                  />

                  <TimelineItem
                    label="Arrived"
                    value={
                      pickup.arrived_at
                    }
                  />

                  <TimelineItem
                    label="Picked Up"
                    value={
                      pickup.picked_up_at
                    }
                  />

                  <TimelineItem
                    label="Received at Origin"
                    value={
                      pickup.received_at_origin_at
                    }
                  />

                  <TimelineItem
                    label="Completed"
                    value={
                      pickup.completed_at
                    }
                  />

                  {pickup.failed_at && (
                    <TimelineItem
                      label="Failed"
                      value={
                        pickup.failed_at
                      }
                    />
                  )}
                </div>
              </section>

              {/* Remarks */}

              {(pickup.remarks ||
                pickup.failed_reason) && (
                <section>
                  <SectionTitle>
                    Remarks
                  </SectionTitle>

                  <div className="space-y-3">
                    {pickup.remarks && (
                      <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                        {
                          pickup.remarks
                        }
                      </div>
                    )}

                    {pickup.failed_reason && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                          Failure reason
                        </p>

                        <p className="mt-1 text-sm text-red-800">
                          {
                            pickup.failed_reason
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {/* Actions */}

        <div className="border-t border-gray-200 bg-white p-4">
          <PickupActions
            status={status}
            busy={busy}
            actionLoading={
              actionLoading
            }
            onAssign={onAssign}
            onStart={onStart}
            onArrive={onArrive}
            onComplete={onComplete}
            onFail={onFail}
          />
        </div>
      </aside>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Pickup actions
|--------------------------------------------------------------------------
*/

function PickupActions({
  status,
  busy,
  actionLoading,
  onAssign,
  onStart,
  onArrive,
  onComplete,
  onFail,
}) {
  if (
    [
      STATUS.COMPLETED,
      STATUS.FAILED,
      STATUS.CANCELLED,
    ].includes(status)
  ) {
    return (
      <div className="rounded-lg bg-gray-50 px-4 py-3 text-center text-sm font-medium text-gray-500">
        This pickup request is closed.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {[
        STATUS.REQUESTED,
        STATUS.ASSIGNED,
        STATUS.STARTED,
      ].includes(status) && (
        <button
          type="button"
          onClick={onAssign}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
        >
          <UserCheck className="h-4 w-4" />

          Assign / Reassign
        </button>
      )}

      {status ===
        STATUS.ASSIGNED && (
        <button
          type="button"
          onClick={onStart}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
        >
          {actionLoading ===
          "start" ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}

          Start Pickup
        </button>
      )}

      {status ===
        STATUS.STARTED && (
        <button
          type="button"
          onClick={onArrive}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
        >
          {actionLoading ===
          "arrive" ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}

          Mark Arrived
        </button>
      )}

      {status ===
        STATUS.ARRIVED && (
        <button
          type="button"
          onClick={onComplete}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {actionLoading ===
          "complete" ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}

          Complete Pickup
        </button>
      )}

      {[
        STATUS.REQUESTED,
        STATUS.ASSIGNED,
        STATUS.STARTED,
        STATUS.ARRIVED,
      ].includes(status) && (
        <button
          type="button"
          onClick={onFail}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
        >
          <XCircle className="h-4 w-4" />

          Fail Pickup
        </button>
      )}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Assign rider modal
|--------------------------------------------------------------------------
*/

function AssignRiderModal({
  riders,
  loading,
  selectedRider,
  setSelectedRider,
  actionLoading,
  onClose,
  onSubmit,
}) {
  return (
    <Modal
      title="Assign Pickup Rider"
      onClose={onClose}
    >
      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Rider
          </label>

          <select
            value={selectedRider}
            onChange={(event) =>
              setSelectedRider(
                event.target.value
              )
            }
            disabled={loading}
            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
          >
            <option value="">
              {loading
                ? "Loading riders..."
                : "Select rider"}
            </option>

            {riders.map((rider) => (
              <option
                key={rider.id}
                value={rider.id}
              >
                {rider.name ||
                  rider.full_name ||
                  `Rider #${rider.id}`}
                {rider.phone
                  ? ` — ${rider.phone}`
                  : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={
              !selectedRider ||
              Boolean(actionLoading)
            }
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {actionLoading ===
            "assign" && (
              <RefreshCw className="h-4 w-4 animate-spin" />
            )}

            Assign Rider
          </button>
        </div>
      </div>
    </Modal>
  );
}

/*
|--------------------------------------------------------------------------
| Fail modal
|--------------------------------------------------------------------------
*/

function FailPickupModal({
  reason,
  setReason,
  loading,
  onClose,
  onSubmit,
}) {
  return (
    <Modal
      title="Fail Pickup"
      onClose={onClose}
    >
      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Reason
          </label>

          <textarea
            value={reason}
            onChange={(event) =>
              setReason(
                event.target.value
              )
            }
            rows={5}
            placeholder="Enter why this pickup failed..."
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-3 text-sm text-gray-700 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
          />
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Uncollected shipments will be
          returned to{" "}
          <strong>
            awaiting pickup
          </strong>{" "}
          according to your backend service.
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={
              !reason.trim() ||
              loading
            }
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading && (
              <RefreshCw className="h-4 w-4 animate-spin" />
            )}

            Fail Pickup
          </button>
        </div>
      </div>
    </Modal>
  );
}

/*
|--------------------------------------------------------------------------
| Modal
|--------------------------------------------------------------------------
*/

function Modal({
  title,
  onClose,
  children,
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-bold text-gray-900">
            {title}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Detail item
|--------------------------------------------------------------------------
*/

function DetailItem({
  label,
  value,
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-gray-800">
        {value || "—"}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Route box
|--------------------------------------------------------------------------
*/

function RouteBox({
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-gray-800">
        {value}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Section title
|--------------------------------------------------------------------------
*/

function SectionTitle({
  children,
}) {
  return (
    <h3 className="mb-3 text-sm font-bold text-gray-900">
      {children}
    </h3>
  );
}

/*
|--------------------------------------------------------------------------
| Timeline
|--------------------------------------------------------------------------
*/

function TimelineItem({
  label,
  value,
}) {
  const exists = Boolean(value);

  return (
    <div className="flex items-center gap-3">
      <div
        className={[
          "h-2.5 w-2.5 rounded-full",
          exists
            ? "bg-gray-900"
            : "bg-gray-200",
        ].join(" ")}
      />

      <div className="flex flex-1 items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
        <span
          className={[
            "text-sm",
            exists
              ? "font-medium text-gray-700"
              : "text-gray-400",
          ].join(" ")}
        >
          {label}
        </span>

        <span className="text-xs text-gray-500">
          {exists
            ? formatDate(value)
            : "Pending"}
        </span>
      </div>
    </div>
  );
}