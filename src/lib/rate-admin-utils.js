export function money(value, currency = "NPR") {
  const amount = Number(value ?? 0);
  return `${currency} ${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"}`;
}

export function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function booleanValue(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

export function branchMap(branches = []) {
  return new Map(branches.map((branch) => [Number(branch.id), branch]));
}

export function getBranchById(map, id) {
  return map.get(Number(id)) ?? null;
}

export function routeNodesFromIds(map, ids = []) {
  return ids.map((id) => getBranchById(map, id)).filter(Boolean);
}

export function enrichPath(path = [], map) {
  return (Array.isArray(path) ? path : [])
    .map((node) => {
      const matched = getBranchById(map, node?.id ?? node?.branch_id);
      return {
        ...matched,
        ...node,
        id: Number(node?.id ?? node?.branch_id ?? matched?.id),
        name: node?.name ?? node?.branch_name ?? matched?.name,
        code: node?.code ?? matched?.code,
        latitude: Number(node?.latitude ?? node?.lat ?? matched?.latitude),
        longitude: Number(node?.longitude ?? node?.lng ?? node?.lon ?? matched?.longitude),
      };
    })
    .filter((node) => node.id || node.name);
}

export function extractErrors(error) {
  const errors = error?.data?.errors;
  if (!errors || typeof errors !== "object") return error?.message ?? "Unable to complete the request.";

  return Object.values(errors)
    .flat()
    .filter(Boolean)
    .join(" ");
}

export function normalizeRateRow(row, map) {
  const pickupId = Number(row?.pickup_branch_id ?? row?.pickup_branch?.id);
  const deliveryId = Number(row?.delivery_branch_id ?? row?.delivery_branch?.id);

  return {
    ...row,
    pickup_branch_id: pickupId,
    delivery_branch_id: deliveryId,
    pickup_branch: row?.pickup_branch ?? getBranchById(map, pickupId),
    delivery_branch: row?.delivery_branch ?? getBranchById(map, deliveryId),
    base_rate: Number(row?.base_rate ?? 0),
    is_active: booleanValue(row?.is_active),
  };
}

export function normalizeLaneRow(row, map) {
  const fromId = Number(row?.from_branch_id ?? row?.from_branch?.id);
  const toId = Number(row?.to_branch_id ?? row?.to_branch?.id);

  return {
    ...row,
    from_branch_id: fromId,
    to_branch_id: toId,
    from_branch: row?.from_branch ?? getBranchById(map, fromId),
    to_branch: row?.to_branch ?? getBranchById(map, toId),
    distance_km: Number(row?.distance_km ?? 0),
    estimated_hours: Number(row?.estimated_hours ?? 0),
    priority: Number(row?.priority ?? 100),
    is_bidirectional: booleanValue(row?.is_bidirectional),
    is_active: booleanValue(row?.is_active),
  };
}

export function normalizeRouteRow(row, map) {
  const originId = Number(row?.origin_branch_id ?? row?.origin_branch?.id ?? row?.pickup_branch_id);
  const destinationId = Number(
    row?.destination_branch_id ?? row?.destination_branch?.id ?? row?.delivery_branch_id,
  );

  let path = enrichPath(row?.path ?? row?.branches ?? [], map);

  if (path.length === 0) {
    const transitIds = (row?.transit_branch_ids ?? row?.transit_branches ?? []).map((branch) =>
      Number(typeof branch === "object" ? branch.id : branch),
    );
    path = routeNodesFromIds(map, [originId, ...transitIds, destinationId]);
  }

  const transitBranches = path.length > 2 ? path.slice(1, -1) : [];

  return {
    ...row,
    origin_branch_id: originId,
    destination_branch_id: destinationId,
    origin_branch: row?.origin_branch ?? getBranchById(map, originId),
    destination_branch: row?.destination_branch ?? getBranchById(map, destinationId),
    path,
    transit_branches: transitBranches,
    transit_branch_ids: transitBranches.map((branch) => Number(branch.id)),
    base_rate: Number(row?.base_rate ?? 0),
    transfer_count: Number(row?.transfer_count ?? Math.max(0, path.length - 1)),
    transit_count: Number(row?.transit_count ?? Math.max(0, path.length - 2)),
    total_distance_km: Number(row?.total_distance_km ?? 0),
    total_estimated_hours: Number(row?.total_estimated_hours ?? 0),
    priority: Number(row?.priority ?? 100),
    is_default: booleanValue(row?.is_default),
    is_active: booleanValue(row?.is_active),
  };
}
