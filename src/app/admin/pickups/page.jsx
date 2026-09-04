"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Search,
  RefreshCw,
  Eye,
  UserRoundPlus,
  ArrowRightLeft,
  XCircle,
  Package,
  MapPin,
  Phone,
  Store,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
} from "lucide-react";

import {
  getPickups,
  getPickup,
  getPickupAssignableStaff,
  assignPickup,
  transferPickup,
  failPickup,
  resendPickupCallback,
} from "@/services/pickupService";

/*
|--------------------------------------------------------------------------
| Resendable pickup callback events
|--------------------------------------------------------------------------
*/

const RESEND_EVENTS = [
  { value: "pickup.rider_assigned", label: "Rider assigned", scope: "pickup" },
  { value: "pickup.rider_started", label: "Rider started", scope: "pickup" },
  { value: "pickup.rider_arrived", label: "Rider arrived", scope: "pickup" },
  { value: "pickup.completed", label: "Pickup completed", scope: "pickup" },
  { value: "shipment.collected", label: "Shipment collected", scope: "shipment" },
  {
    value: "shipment.received_at_origin",
    label: "Shipment received at origin",
    scope: "shipment",
  },
];

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function getPickupId(pickup) {
  return pickup?.id ?? pickup?.pickup_request_id ?? null;
}

function getRequestNumber(pickup) {
  return pickup?.request_number ?? `#${getPickupId(pickup) ?? "-"}`;
}

function getMerchantName(pickup) {
  return (
    pickup?.merchant?.name ??
    pickup?.merchant?.business_name ??
    "Unknown merchant"
  );
}

function getLocationName(pickup) {
  return (
    pickup?.pickup_location?.name ??
    pickup?.pickupLocation?.name ??
    pickup?.pickup_name ??
    "Pickup location"
  );
}

function getRiderName(pickup) {
  return (
    pickup?.assigned_staff?.name ?? pickup?.assignedStaff?.name ?? "Unassigned"
  );
}

function getShipments(pickup) {
  if (!Array.isArray(pickup?.shipments)) {
    return [];
  }

  return pickup.shipments.map((item) => item?.shipment ?? item).filter(Boolean);
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return "-";
  }
}

function formatStatus(status) {
  if (!status) {
    return "Unknown";
  }

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/*
|--------------------------------------------------------------------------
| Status badge
|--------------------------------------------------------------------------
*/

function StatusBadge({ status }) {
  const normalized = String(status ?? "").toLowerCase();

  let classes = "bg-gray-100 text-gray-700";

  if (normalized === "requested") {
    classes = "bg-blue-100 text-blue-700";
  }

  if (normalized === "assigned") {
    classes = "bg-indigo-100 text-indigo-700";
  }

  if (normalized === "started") {
    classes = "bg-yellow-100 text-yellow-700";
  }

  if (normalized === "arrived") {
    classes = "bg-purple-100 text-purple-700";
  }

  if (normalized === "completed") {
    classes = "bg-green-100 text-green-700";
  }

  if (normalized === "failed") {
    classes = "bg-red-100 text-red-700";
  }

  if (normalized === "cancelled") {
    classes = "bg-red-100 text-red-700";
  }

  return (
    <span
      className={[
        "inline-flex items-center",
        "rounded-full px-2.5 py-1",
        "text-xs font-semibold",
        classes,
      ].join(" ")}
    >
      {formatStatus(status)}
    </span>
  );
}

/*
|--------------------------------------------------------------------------
| Action button
|--------------------------------------------------------------------------
*/

function ActionButton({ children, onClick, disabled = false, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center gap-2",
        "rounded-lg border px-3 py-2",
        "text-sm font-medium",
        "transition",
        danger
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-gray-200 text-gray-700 hover:bg-gray-50",
        "disabled:cursor-not-allowed",
        "disabled:opacity-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/

export default function AdminPickupsPage() {
  const [pickups, setPickups] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [status, setStatus] = useState("");

  const [page, setPage] = useState(1);

  const [total, setTotal] = useState(0);

  const [pageSize, setPageSize] = useState(20);

  const [selectedPickup, setSelectedPickup] = useState(null);

  const [detailsLoading, setDetailsLoading] = useState(false);

  const [staff, setStaff] = useState([]);

  const [staffLoading, setStaffLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  const [actionError, setActionError] = useState("");

  const [assignMode, setAssignMode] = useState(null);

  const [selectedStaffId, setSelectedStaffId] = useState("");

  const [reason, setReason] = useState("");

  const [resendEvent, setResendEvent] = useState("");

  const [resendShipmentId, setResendShipmentId] = useState("");

  const [resendMessage, setResendMessage] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Load list
  |--------------------------------------------------------------------------
  */

  const loadPickups = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getPickups({
        page,
        per_page: pageSize,
        search: search.trim() || undefined,
        status: status || undefined,
      });

      setPickups(Array.isArray(result?.list) ? result.list : []);

      setTotal(Number(result?.total ?? 0));

      setPageSize(Number(result?.pageSize ?? pageSize));
    } catch (err) {
      setError(
        err?.response?.data?.message ??
          err?.message ??
          "Unable to load pickups.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, status]);

  /*
  |--------------------------------------------------------------------------
  | Initial/list refresh
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPickups();
    }, 250);

    return () => clearTimeout(timer);
  }, [loadPickups]);

  /*
  |--------------------------------------------------------------------------
  | Open details
  |--------------------------------------------------------------------------
  */

  const openDetails = async (pickup) => {
    const id = getPickupId(pickup);

    if (!id) {
      return;
    }

    setDetailsLoading(true);
    setActionError("");

    try {
      const result = await getPickup(id);

      setSelectedPickup(result);
    } catch (err) {
      setActionError(
        err?.response?.data?.message ??
          err?.message ??
          "Unable to load pickup.",
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Load riders
  |--------------------------------------------------------------------------
  */

  const loadStaff = async (pickup) => {
    const id = getPickupId(pickup);

    if (!id) {
      return;
    }

    setStaffLoading(true);
    setActionError("");

    try {
      const result = await getPickupAssignableStaff(id);

      setStaff(Array.isArray(result) ? result : []);
    } catch (err) {
      setActionError(
        err?.response?.data?.message ??
          err?.message ??
          "Unable to load riders.",
      );
    } finally {
      setStaffLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Assign
  |--------------------------------------------------------------------------
  */

  const handleAssign = async () => {
    const id = getPickupId(selectedPickup);

    if (!id || !selectedStaffId) {
      return;
    }

    setActionLoading(true);
    setActionError("");

    try {
      await assignPickup(id, Number(selectedStaffId));

      setAssignMode(null);
      setSelectedStaffId("");

      const updated = await getPickup(id);

      setSelectedPickup(updated);

      await loadPickups();
    } catch (err) {
      setActionError(
        err?.response?.data?.message ??
          err?.message ??
          "Unable to assign rider.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Transfer
  |--------------------------------------------------------------------------
  */

  const handleTransfer = async () => {
    const id = getPickupId(selectedPickup);

    if (!id || !selectedStaffId) {
      return;
    }

    if (!reason.trim()) {
      setActionError("Please enter a transfer reason.");

      return;
    }

    setActionLoading(true);
    setActionError("");

    try {
      await transferPickup(id, Number(selectedStaffId), reason);

      setAssignMode(null);
      setSelectedStaffId("");
      setReason("");

      const updated = await getPickup(id);

      setSelectedPickup(updated);

      await loadPickups();
    } catch (err) {
      setActionError(
        err?.response?.data?.message ??
          err?.message ??
          "Unable to transfer pickup.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Cancel
  |--------------------------------------------------------------------------
  */

  const handleCancel = async () => {
    const id = getPickupId(selectedPickup);

    if (!id) {
      return;
    }

    if (!reason.trim()) {
      setActionError("Please enter a cancellation reason.");

      return;
    }

    setActionLoading(true);
    setActionError("");

    try {
      await failPickup(id, reason);

      setReason("");

      const updated = await getPickup(id);

      setSelectedPickup(updated);

      await loadPickups();
    } catch (err) {
      setActionError(
        err?.response?.data?.message ??
          err?.message ??
          "Unable to cancel pickup.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Resend callback
  |--------------------------------------------------------------------------
  */

  const handleResendCallback = async () => {
    const id = getPickupId(selectedPickup);

    if (!id || !resendEvent) {
      return;
    }

    const eventDef = RESEND_EVENTS.find(
      (item) => item.value === resendEvent,
    );

    if (eventDef?.scope === "shipment" && !resendShipmentId) {
      setActionError("Please select a shipment for this event.");

      return;
    }

    setActionLoading(true);
    setActionError("");
    setResendMessage("");

    try {
      await resendPickupCallback(
        id,
        resendEvent,
        eventDef?.scope === "shipment" ? Number(resendShipmentId) : null,
      );

      setResendMessage(
        `Callback "${eventDef?.label ?? resendEvent}" re-queued to the store.`,
      );

      setResendEvent("");
      setResendShipmentId("");
    } catch (err) {
      setActionError(
        err?.response?.data?.message ??
          err?.message ??
          "Unable to resend callback.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Pagination
  |--------------------------------------------------------------------------
  */

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const canPrevious = page > 1;

  const canNext = page < totalPages;

  /*
  |--------------------------------------------------------------------------
  | Stats
  |--------------------------------------------------------------------------
  */

  const stats = useMemo(() => {
    return {
      total: total,

      requested: pickups.filter((item) => item.status === "requested").length,

      assigned: pickups.filter((item) => item.status === "assigned").length,

      started: pickups.filter((item) => item.status === "started").length,

      completed: pickups.filter((item) => item.status === "completed").length,
    };
  }, [pickups, total]);

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-[1600px]">
        {/* Header */}

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Pickup Management
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage pickup requests, riders, transfers and cancellations.
            </p>
          </div>

          <button
            type="button"
            onClick={loadPickups}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Stats */}

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard label="Total" value={stats.total} />

          <StatCard label="Requested" value={stats.requested} />

          <StatCard label="Assigned" value={stats.assigned} />

          <StatCard label="Started" value={stats.started} />

          <StatCard label="Completed" value={stats.completed} />
        </div>

        {/* Filters */}

        <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Search request number, store, name or phone..."
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-gray-400"
              />
            </div>

            <select
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value);
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
            >
              <option value="">All statuses</option>

              <option value="requested">Requested</option>

              <option value="assigned">Assigned</option>

              <option value="started">Started</option>

              <option value="arrived">Arrived</option>

              <option value="completed">Completed</option>

              <option value="failed">Failed</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatus("");
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Error */}

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <TableHead>Pickup</TableHead>

                  <TableHead>Merchant</TableHead>

                  <TableHead>Location</TableHead>

                  <TableHead>Rider</TableHead>

                  <TableHead>Shipments</TableHead>

                  <TableHead>Status</TableHead>

                  <TableHead>Created</TableHead>

                  <TableHead>Actions</TableHead>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <LoadingRows />
                ) : pickups.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <Package
                        size={38}
                        className="mx-auto mb-3 text-gray-300"
                      />

                      <p className="font-medium text-gray-700">
                        No pickups found
                      </p>

                      <p className="mt-1 text-sm text-gray-400">
                        Try changing your search or filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  pickups.map((pickup) => {
                    const shipments = getShipments(pickup);

                    return (
                      <tr
                        key={getPickupId(pickup)}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-4">
                          <div className="font-semibold text-gray-900">
                            {getRequestNumber(pickup)}
                          </div>

                          <div className="mt-1 text-xs text-gray-400">
                            ID: {getPickupId(pickup)}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Store size={16} className="text-gray-400" />

                            <span className="text-sm font-medium text-gray-700">
                              {getMerchantName(pickup)}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex max-w-[220px] items-start gap-2">
                            <MapPin
                              size={16}
                              className="mt-0.5 shrink-0 text-gray-400"
                            />

                            <span className="text-sm text-gray-600">
                              {getLocationName(pickup)}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-700">
                            {getRiderName(pickup)}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                            <Package size={13} />

                            {shipments.length}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge status={pickup.status} />
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Clock size={14} />

                            {formatDate(pickup.created_at)}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <ActionButton onClick={() => openDetails(pickup)}>
                            <Eye size={15} />
                            View
                          </ActionButton>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}

          <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Page <span className="font-semibold text-gray-700">{page}</span>{" "}
              of{" "}
              <span className="font-semibold text-gray-700">{totalPages}</span>
              {" · "}
              {total} pickups
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canPrevious}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium disabled:opacity-40"
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <button
                type="button"
                disabled={!canNext}
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium disabled:opacity-40"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Details drawer */}

      {selectedPickup && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setSelectedPickup(null)}
            className="absolute inset-0 bg-black/40"
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
            {/* Drawer header */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Pickup
                </p>

                <h2 className="text-lg font-bold text-gray-900">
                  {getRequestNumber(selectedPickup)}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPickup(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            {detailsLoading ? (
              <div className="flex min-h-[400px] items-center justify-center">
                <RefreshCw size={28} className="animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-6 p-5">
                {/* Status */}

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Current status</p>

                    <div className="mt-1">
                      <StatusBadge status={selectedPickup.status} />
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-gray-400">Created</p>

                    <p className="text-sm text-gray-700">
                      {formatDate(selectedPickup.created_at)}
                    </p>
                  </div>
                </div>

                {/* Pickup information */}

                <section className="rounded-xl border border-gray-200 p-4">
                  <h3 className="mb-4 font-semibold text-gray-900">
                    Pickup information
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoItem
                      label="Merchant"
                      value={getMerchantName(selectedPickup)}
                      icon={<Store size={16} />}
                    />

                    <InfoItem
                      label="Pickup location"
                      value={getLocationName(selectedPickup)}
                      icon={<MapPin size={16} />}
                    />

                    <InfoItem
                      label="Pickup phone"
                      value={selectedPickup.pickup_phone ?? "-"}
                      icon={<Phone size={16} />}
                    />

                    <InfoItem
                      label="Rider"
                      value={getRiderName(selectedPickup)}
                      icon={<UserRoundPlus size={16} />}
                    />
                  </div>
                </section>

                {/* Management actions */}

                <section className="rounded-xl border border-gray-200 p-4">
                  <h3 className="mb-4 font-semibold text-gray-900">
                    Management
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    {["requested", "assigned"].includes(
                      selectedPickup.status,
                    ) && (
                      <ActionButton
                        onClick={async () => {
                          setAssignMode("assign");

                          setSelectedStaffId("");

                          setReason("");

                          await loadStaff(selectedPickup);
                        }}
                      >
                        <UserRoundPlus size={15} />

                        {selectedPickup.assigned_to
                          ? "Reassign"
                          : "Assign rider"}
                      </ActionButton>
                    )}

                    {["requested", "assigned", "started"].includes(
                      selectedPickup.status,
                    ) && (
                      <ActionButton
                        onClick={async () => {
                          setAssignMode("transfer");

                          setSelectedStaffId("");

                          setReason("");

                          await loadStaff(selectedPickup);
                        }}
                      >
                        <ArrowRightLeft size={15} />
                        Transfer
                      </ActionButton>
                    )}

                    {["requested", "assigned", "started", "arrived"].includes(
                      selectedPickup.status,
                    ) && (
                      <ActionButton
                        danger
                        onClick={() => {
                          setAssignMode("cancel");

                          setSelectedStaffId("");

                          setReason("");
                        }}
                      >
                        <XCircle size={15} />
                        Cancel pickup
                      </ActionButton>
                    )}

                    <ActionButton
                      onClick={() => {
                        setAssignMode("resend");

                        setSelectedStaffId("");

                        setReason("");

                        setResendEvent("");

                        setResendShipmentId("");

                        setResendMessage("");

                        setActionError("");
                      }}
                    >
                      <Send size={15} />
                      Resend callback
                    </ActionButton>
                  </div>

                  {/* Action form */}

                  {assignMode && (
                    <div className="mt-4 rounded-lg bg-gray-50 p-4">
                      {actionError && (
                        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          {actionError}
                        </div>
                      )}

                      {assignMode === "assign" && (
                        <>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Select rider
                          </label>

                          <select
                            value={selectedStaffId}
                            onChange={(event) =>
                              setSelectedStaffId(event.target.value)
                            }
                            disabled={staffLoading || actionLoading}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm"
                          >
                            <option value="">
                              {staffLoading
                                ? "Loading riders..."
                                : "Select rider"}
                            </option>

                            {staff.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                                {item.email ? ` — ${item.email}` : ""}
                              </option>
                            ))}
                          </select>

                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={handleAssign}
                              disabled={!selectedStaffId || actionLoading}
                              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                            >
                              {actionLoading ? "Assigning..." : "Assign rider"}
                            </button>

                            <button
                              type="button"
                              onClick={() => setAssignMode(null)}
                              className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      )}

                      {assignMode === "transfer" && (
                        <>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Transfer to rider
                          </label>

                          <select
                            value={selectedStaffId}
                            onChange={(event) =>
                              setSelectedStaffId(event.target.value)
                            }
                            disabled={staffLoading || actionLoading}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm"
                          >
                            <option value="">
                              {staffLoading
                                ? "Loading riders..."
                                : "Select new rider"}
                            </option>

                            {staff
                              .filter(
                                (item) =>
                                  Number(item.id) !==
                                  Number(selectedPickup.assigned_to),
                              )
                              .map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}

                                  {item.email ? ` — ${item.email}` : ""}
                                </option>
                              ))}
                          </select>

                          <textarea
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            rows={3}
                            placeholder="Why is this pickup being transferred?"
                            className="mt-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm"
                          />

                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={handleTransfer}
                              disabled={
                                !selectedStaffId ||
                                !reason.trim() ||
                                actionLoading
                              }
                              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                            >
                              {actionLoading
                                ? "Transferring..."
                                : "Transfer pickup"}
                            </button>

                            <button
                              type="button"
                              onClick={() => setAssignMode(null)}
                              className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      )}

                      {assignMode === "cancel" && (
                        <>
                          <p className="mb-3 text-sm text-red-600">
                            Cancelling this pickup will return eligible
                            uncollected shipments to awaiting pickup.
                          </p>

                          <textarea
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            rows={3}
                            placeholder="Cancellation reason"
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm"
                          />

                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={handleCancel}
                              disabled={!reason.trim() || actionLoading}
                              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                            >
                              {actionLoading
                                ? "Cancelling..."
                                : "Confirm cancellation"}
                            </button>

                            <button
                              type="button"
                              onClick={() => setAssignMode(null)}
                              className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
                            >
                              Back
                            </button>
                          </div>
                        </>
                      )}

                      {assignMode === "resend" && (
                        <>
                          <p className="mb-3 text-sm text-gray-600">
                            Re-send a lifecycle callback to the store partner
                            using this pickup&apos;s current data. Useful when a
                            callback previously failed.
                          </p>

                          {resendMessage && (
                            <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                              {resendMessage}
                            </div>
                          )}

                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Event
                          </label>

                          <select
                            value={resendEvent}
                            onChange={(event) => {
                              setResendEvent(event.target.value);
                              setResendShipmentId("");
                            }}
                            disabled={actionLoading}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm"
                          >
                            <option value="">Select event</option>

                            {RESEND_EVENTS.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>

                          {RESEND_EVENTS.find(
                            (item) => item.value === resendEvent,
                          )?.scope === "shipment" && (
                            <>
                              <label className="mb-2 mt-3 block text-sm font-medium text-gray-700">
                                Shipment
                              </label>

                              <select
                                value={resendShipmentId}
                                onChange={(event) =>
                                  setResendShipmentId(event.target.value)
                                }
                                disabled={actionLoading}
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm"
                              >
                                <option value="">Select shipment</option>

                                {getShipments(selectedPickup).map(
                                  (shipment) => (
                                    <option
                                      key={shipment.id}
                                      value={shipment.id}
                                    >
                                      {shipment.tracking_number ??
                                        `Shipment #${shipment.id}`}
                                    </option>
                                  ),
                                )}
                              </select>
                            </>
                          )}

                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={handleResendCallback}
                              disabled={!resendEvent || actionLoading}
                              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                            >
                              {actionLoading ? "Sending..." : "Resend callback"}
                            </button>

                            <button
                              type="button"
                              onClick={() => setAssignMode(null)}
                              className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
                            >
                              Back
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </section>

                {/* Shipments */}

                <section className="rounded-xl border border-gray-200 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Shipments</h3>

                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                      {getShipments(selectedPickup).length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {getShipments(selectedPickup).length === 0 ? (
                      <p className="py-6 text-center text-sm text-gray-400">
                        No shipments attached.
                      </p>
                    ) : (
                      getShipments(selectedPickup).map((shipment) => (
                        <div
                          key={shipment.id}
                          className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-gray-800">
                                {shipment.tracking_number ??
                                  `Shipment #${shipment.id}`}
                              </p>

                              <p className="mt-1 text-xs text-gray-500">
                                {shipment.status ?? "Unknown status"}
                              </p>
                            </div>

                            <span className="text-xs font-medium text-gray-500">
                              ID {shipment.id}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {/* Timeline */}

                <section className="rounded-xl border border-gray-200 p-4">
                  <h3 className="mb-4 font-semibold text-gray-900">
                    Pickup timeline
                  </h3>

                  <TimelineItem
                    label="Created"
                    value={selectedPickup.created_at}
                  />

                  <TimelineItem
                    label="Assigned"
                    value={selectedPickup.assigned_at}
                  />

                  <TimelineItem
                    label="Arrived"
                    value={selectedPickup.arrived_at}
                  />

                  <TimelineItem
                    label="Picked up"
                    value={selectedPickup.picked_up_at}
                  />

                  <TimelineItem
                    label="Completed"
                    value={selectedPickup.completed_at}
                  />

                  <TimelineItem
                    label="Failed"
                    value={selectedPickup.failed_at}
                  />

                  {selectedPickup.failed_reason && (
                    <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      <strong>Failure reason:</strong>{" "}
                      {selectedPickup.failed_reason}
                    </div>
                  )}
                </section>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Small components
|--------------------------------------------------------------------------
*/

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>

      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function TableHead({ children }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
      {children}
    </th>
  );
}

function InfoItem({ label, value, icon }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <div className="flex items-start gap-2 text-sm text-gray-700">
        <span className="mt-0.5 text-gray-400">{icon}</span>

        <span>{value}</span>
      </div>
    </div>
  );
}

function TimelineItem({ label, value }) {
  if (!value) {
    return null;
  }

  return (
    <div className="flex gap-3 border-l-2 border-gray-200 pb-4 pl-4 last:pb-0">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>

        <p className="mt-0.5 text-xs text-gray-400">{formatDate(value)}</p>
      </div>
    </div>
  );
}

function LoadingRows() {
  return Array.from({ length: 6 }).map((_, index) => (
    <tr key={index}>
      {Array.from({ length: 8 }).map((_, column) => (
        <td key={column} className="px-4 py-5">
          <div className="h-4 animate-pulse rounded bg-gray-100" />
        </td>
      ))}
    </tr>
  ));
}
