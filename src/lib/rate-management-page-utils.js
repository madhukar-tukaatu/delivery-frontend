export function extractCollection(payload) {
  const candidates = [payload, payload?.data, payload?.data?.data].filter(
    Boolean,
  );

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return {
        rows: candidate,
        currentPage: 1,
        pageSize: candidate.length || 20,
        total: candidate.length,
        lastPage: 1,
      };
    }

    if (candidate && Array.isArray(candidate.data)) {
      return {
        rows: candidate.data,

        currentPage: Number(candidate.current_page ?? candidate.page ?? 1),

        pageSize: Number(
          candidate.per_page ??
            candidate.page_size ??
            candidate.data.length ??
            20,
        ),

        total: Number(candidate.total ?? candidate.data.length ?? 0),

        lastPage: Number(candidate.last_page ?? 1),
      };
    }
  }

  return {
    rows: [],
    currentPage: 1,
    pageSize: 20,
    total: 0,
    lastPage: 1,
  };
}

export function toBoolean(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

export function toNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

export function nullableNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function hasValidCoordinates(branch) {
  return (
    Number.isFinite(Number(branch?.latitude)) &&
    Number.isFinite(Number(branch?.longitude))
  );
}
export function normalizeBranch(branch = {}) {
  const latitude =
    branch.latitude ??
    branch.lat ??
    branch.location?.latitude ??
    branch.coordinates?.latitude ??
    branch.geo?.latitude ??
    null;

  const longitude =
    branch.longitude ??
    branch.lng ??
    branch.lon ??
    branch.location?.longitude ??
    branch.coordinates?.longitude ??
    branch.geo?.longitude ??
    null;

  return {
    ...branch,

    id: Number(branch.id ?? branch.branch_id),

    name: branch.name ?? branch.branch_name ?? branch.title ?? "-",

    code: branch.code ?? branch.branch_code ?? null,

    latitude:
      latitude !== null && latitude !== undefined && latitude !== ""
        ? Number(latitude)
        : null,

    longitude:
      longitude !== null && longitude !== undefined && longitude !== ""
        ? Number(longitude)
        : null,
  };
}

export function enrichBranch(branch, branchesById) {
  if (!branch) {
    return null;
  }

  const branchId = nullableNumber(branch.id ?? branch.branch_id);

  const partialBranch = normalizeBranch(branch);

  const fullBranch =
    branchId !== null
      ? normalizeBranch(branchesById.get(Number(branchId)))
      : null;

  /*
   * The transfer-route API may return only:
   *
   * id
   * name
   * code
   *
   * The full branch list usually contains coordinates.
   */
  const merged = normalizeBranch({
    ...(fullBranch ?? {}),
    ...branch,

    id: branchId ?? fullBranch?.id,

    coverage_location:
      branch.coverage_location ??
      branch.coverageLocation ??
      fullBranch?.coverage_location ??
      null,
  });

  if (!hasValidCoordinates(merged) && hasValidCoordinates(fullBranch)) {
    return {
      ...merged,

      latitude: fullBranch.latitude,

      longitude: fullBranch.longitude,
    };
  }

  if (!hasValidCoordinates(merged) && hasValidCoordinates(partialBranch)) {
    return {
      ...merged,

      latitude: partialBranch.latitude,

      longitude: partialBranch.longitude,
    };
  }

  return merged;
}

export function buildBranchMap(branches) {
  return new Map(
    branches
      .filter((branch) => Number.isFinite(Number(branch?.id)))
      .map((branch) => [Number(branch.id), normalizeBranch(branch)]),
  );
}

export function normalizeBranchRate(row) {
  const pickupId = nullableNumber(
    row.pickup_coverage_location_id ?? row.pickup_branch_id ?? row.pickup_branch?.id,
  );

  const deliveryId = nullableNumber(
    row.delivery_coverage_location_id ?? row.delivery_branch_id ?? row.delivery_branch?.id,
  );

  // Coverage locations are the pricing entities — build display objects from the name/code columns
  const pickupBranch = row.pickup_branch ?? (
    pickupId ? { id: pickupId, name: row.pickup_branch_name ?? `Zone ${pickupId}`, code: row.pickup_branch_code ?? String(pickupId) } : null
  );

  const deliveryBranch = row.delivery_branch ?? (
    deliveryId ? { id: deliveryId, name: row.delivery_branch_name ?? `Zone ${deliveryId}`, code: row.delivery_branch_code ?? String(deliveryId) } : null
  );

  return {
    ...row,

    id: nullableNumber(row.id),

    pickup_branch_id: pickupId,
    delivery_branch_id: deliveryId,

    pickup_coverage_location_id: pickupId,
    delivery_coverage_location_id: deliveryId,

    pickup_branch: pickupBranch ? normalizeBranch(pickupBranch) : null,
    delivery_branch: deliveryBranch ? normalizeBranch(deliveryBranch) : null,

    base_rate: toNumber(row.base_rate),
    is_active: toBoolean(row.is_active),
  };
}

export function normalizeTransferLane(row, branchesById) {
  const fromId = nullableNumber(
    row.from_branch_id ?? row.fromBranch?.id ?? row.from_branch?.id,
  );

  const toId = nullableNumber(
    row.to_branch_id ?? row.toBranch?.id ?? row.to_branch?.id,
  );

  return {
    ...row,

    id: nullableNumber(row.id),

    from_branch_id: fromId,

    to_branch_id: toId,

    from_branch: enrichBranch(
      row.from_branch ?? row.fromBranch ?? branchesById.get(Number(fromId)),
      branchesById,
    ),

    to_branch: enrichBranch(
      row.to_branch ?? row.toBranch ?? branchesById.get(Number(toId)),
      branchesById,
    ),

    distance_km: toNumber(row.distance_km),

    estimated_hours: toNumber(row.estimated_hours, 1),

    priority: toNumber(row.priority, 100),

    is_bidirectional: toBoolean(row.is_bidirectional),

    is_active: toBoolean(row.is_active),
  };
}

function pushUniqueBranch(nodes, branch) {
  if (!branch) {
    return;
  }

  const previous = nodes.length > 0 ? nodes[nodes.length - 1] : null;

  if (previous && Number(previous.id) === Number(branch.id)) {
    return;
  }

  nodes.push(branch);
}

function buildPathFromLanes(row, branchesById) {
  const laneMappings =
    row.lanes ??
    row.route_lanes ??
    row.routeLanes ??
    row.branch_transfer_route_lanes ??
    [];

  if (!Array.isArray(laneMappings)) {
    return [];
  }

  const orderedMappings = [...laneMappings].sort(
    (left, right) =>
      Number(left.sequence ?? left.sequence_number ?? 0) -
      Number(right.sequence ?? right.sequence_number ?? 0),
  );

  const path = [];

  orderedMappings.forEach((mapping) => {
    const lane =
      mapping.branch_transfer_lane ??
      mapping.branchTransferLane ??
      mapping.transfer_lane ??
      mapping.transferLane ??
      mapping.lane ??
      mapping;

    const fromBranchId = nullableNumber(
      lane.from_branch_id ?? lane.fromBranch?.id ?? lane.from_branch?.id,
    );

    const toBranchId = nullableNumber(
      lane.to_branch_id ?? lane.toBranch?.id ?? lane.to_branch?.id,
    );

    const fromBranch = enrichBranch(
      lane.from_branch ??
        lane.fromBranch ??
        branchesById.get(Number(fromBranchId)),
      branchesById,
    );

    const toBranch = enrichBranch(
      lane.to_branch ?? lane.toBranch ?? branchesById.get(Number(toBranchId)),
      branchesById,
    );

    pushUniqueBranch(path, fromBranch);

    pushUniqueBranch(path, toBranch);
  });

  return path;
}

/*
|--------------------------------------------------------------------------
| Only one normalizeTransferRoute definition
|--------------------------------------------------------------------------
*/

export function normalizeTransferRoute(row, branchesById) {
  const originId = nullableNumber(
    row.origin_branch_id ?? row.originBranch?.id ?? row.origin_branch?.id,
  );

  const destinationId = nullableNumber(
    row.destination_branch_id ??
      row.destinationBranch?.id ??
      row.destination_branch?.id,
  );

  const originBranch = enrichBranch(
    row.origin_branch ?? row.originBranch ?? branchesById.get(Number(originId)),
    branchesById,
  );

  const destinationBranch = enrichBranch(
    row.destination_branch ??
      row.destinationBranch ??
      branchesById.get(Number(destinationId)),
    branchesById,
  );

  /*
   * First choice:
   * path supplied by backend.
   */
  const suppliedPath = Array.isArray(row.path)
    ? row.path
        .map((branch) => enrichBranch(branch, branchesById))
        .filter(Boolean)
    : [];

  /*
   * Second choice:
   * rebuild from ordered lanes.
   */
  const lanePath = buildPathFromLanes(row, branchesById);

  /*
   * Third choice:
   * origin + transit + destination.
   */
  const transitSource = row.transit_branches ?? row.transitBranches ?? [];

  const suppliedTransitBranches = Array.isArray(transitSource)
    ? transitSource
        .map((branch) => enrichBranch(branch, branchesById))
        .filter(Boolean)
    : [];

  const transitIds = Array.isArray(row.transit_branch_ids)
    ? row.transit_branch_ids
    : [];

  const transitBranchesFromIds = transitIds
    .map((branchId) =>
      enrichBranch(branchesById.get(Number(branchId)), branchesById),
    )
    .filter(Boolean);

  const fallbackTransitBranches = suppliedTransitBranches.length
    ? suppliedTransitBranches
    : transitBranchesFromIds;

  const fallbackPath = [
    originBranch,
    ...fallbackTransitBranches,
    destinationBranch,
  ].filter(Boolean);

  const path =
    suppliedPath.length >= 2
      ? suppliedPath
      : lanePath.length >= 2
        ? lanePath
        : fallbackPath;

  const transitBranches =
    path.length > 2 ? path.slice(1, -1) : fallbackTransitBranches;

  const transferCount =
    path.length >= 2 ? path.length - 1 : toNumber(row.transfer_count);

  const transitCount =
    path.length >= 2
      ? Math.max(0, path.length - 2)
      : toNumber(row.transit_count);

  return {
    ...row,

    id: nullableNumber(row.id),

    route_code: row.route_code ?? row.code ?? "",

    name: row.name ?? row.route_name ?? row.route_code ?? "Transfer route",

    origin_branch_id: originId,

    destination_branch_id: destinationId,

    origin_branch: originBranch,

    destination_branch: destinationBranch,

    transit_branches: transitBranches,

    transit_branch_ids: transitBranches.map((branch) => Number(branch.id)),

    /*
     * Example:
     * PKR -> KTM -> BRT
     */
    path,

    path_text: path.length
      ? path.map((branch) => branch.name).join(" → ")
      : (row.path_text ?? ""),

    service_type: row.service_type ?? "standard",

    base_rate: toNumber(row.base_rate),

    currency: row.currency ?? "NPR",

    transfer_count: transferCount,

    transit_count: transitCount,

    total_distance_km: toNumber(row.total_distance_km),

    total_estimated_hours: toNumber(row.total_estimated_hours),

    priority: toNumber(row.priority, 100),

    is_default: toBoolean(row.is_default),

    is_active: toBoolean(row.is_active),
  };
}

export function formatMoney(value, currency = "NPR") {
  const amount = toNumber(value);

  return `${currency} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export function apiErrorMessage(
  error,
  fallback = "The request could not be completed.",
) {
  const validationErrors = error?.response?.data?.errors;

  if (validationErrors && typeof validationErrors === "object") {
    const firstError = Object.values(validationErrors).flat().find(Boolean);

    if (firstError) {
      return String(firstError);
    }
  }

  return error?.response?.data?.message ?? error?.message ?? fallback;
}

export function branchLabel(branch) {
  if (!branch) {
    return "Unknown branch";
  }

  return branch.code ? `${branch.name} (${branch.code})` : branch.name;
}
