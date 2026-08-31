import {
  Eye,
  MapPin,
  Package,
} from "lucide-react";

import PickupStatusBadge from "./PickupStatusBadge";

function getInitials(name) {
  if (!name) {
    return "R";
  }

  return String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join("");
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

export default function PickupRow({
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
        <p className="font-semibold text-gray-900">
          {pickup.request_number ||
            `#${pickup.id}`}
        </p>

        {pickup.store_reference && (
          <p className="mt-1 text-xs text-gray-500">
            Ref:{" "}
            <span className="font-medium text-gray-700">
              {pickup.store_reference}
            </span>
          </p>
        )}
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
        <PickupStatusBadge
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
