import { RefreshCw, XCircle } from "lucide-react";

export default function AssignRiderModal({
  riders,
  loading,
  selectedRider,
  setSelectedRider,
  actionLoading,
  onClose,
  onSubmit,
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
            Assign Pickup Rider
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
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
      </div>
    </div>
  );
}