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

function getStatusMeta(status) {
  const normalized =
    String(status || "").toLowerCase();

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

export default function PickupStatusBadge({
  status,
}) {
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