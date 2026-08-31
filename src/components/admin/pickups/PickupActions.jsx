import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  RefreshCw,
  UserCheck,
  XCircle,
} from "lucide-react";

const STATUS = {
  REQUESTED: "requested",
  ASSIGNED: "assigned",
  STARTED: "started",
  ARRIVED: "arrived",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

export default function PickupActions({
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

      {status === STATUS.ASSIGNED && (
        <ActionButton
          loading={
            actionLoading === "start"
          }
          disabled={busy}
          onClick={onStart}
        >
          <ArrowRight className="h-4 w-4" />
          Start Pickup
        </ActionButton>
      )}

      {status === STATUS.STARTED && (
        <ActionButton
          loading={
            actionLoading === "arrive"
          }
          disabled={busy}
          onClick={onArrive}
        >
          <MapPin className="h-4 w-4" />
          Mark Arrived
        </ActionButton>
      )}

      {status === STATUS.ARRIVED && (
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

function ActionButton({
  loading,
  disabled,
  onClick,
  children,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
    >
      {loading && (
        <RefreshCw className="h-4 w-4 animate-spin" />
      )}

      {children}
    </button>
  );
}