export const shipmentStatusLabels = {
  booked: 'Booked',
  pickup_assigned: 'Pickup Assigned',
  picked_up: 'Picked Up',
  received_at_origin_sub_branch: 'Received at Origin Sub-Branch',
  transferred_to_origin_branch: 'Transferred to Origin Branch',
  received_at_origin_branch: 'Received at Origin Branch',
  dispatched_to_transit_hub: 'Dispatched to Transit Hub',
  received_at_transit_hub: 'Received at Transit Hub',
  dispatched_to_destination_branch: 'Dispatched to Destination Branch',
  received_at_destination_branch: 'Received at Destination Branch',
  received_at_destination_sub_branch: 'Received at Destination Sub-Branch',
  assigned_to_rider: 'Assigned to Rider',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  delivery_failed: 'Delivery Failed',
  return_initiated: 'Return Initiated',
  returned_to_origin: 'Returned to Origin',
  cancelled: 'Cancelled',
};

export const shipmentStatusColors = {
  booked: 'blue',
  pickup_assigned: 'cyan',
  picked_up: 'geekblue',
  received_at_origin_sub_branch: 'purple',
  transferred_to_origin_branch: 'purple',
  received_at_origin_branch: 'purple',
  dispatched_to_transit_hub: 'orange',
  received_at_transit_hub: 'orange',
  dispatched_to_destination_branch: 'orange',
  received_at_destination_branch: 'gold',
  received_at_destination_sub_branch: 'gold',
  assigned_to_rider: 'magenta',
  out_for_delivery: 'processing',
  delivered: 'success',
  delivery_failed: 'error',
  return_initiated: 'warning',
  returned_to_origin: 'warning',
  cancelled: 'default',
};

export const taskStatusLabels = {
  pending: 'Pending',
  assigned: 'Assigned',
  picked_up: 'Picked Up',
  failed: 'Failed',
  ready: 'Ready',
  in_transit: 'In Transit',
  received: 'Received',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
};

export const taskStatusColors = {
  pending: 'default',
  assigned: 'blue',
  picked_up: 'success',
  failed: 'error',
  ready: 'gold',
  in_transit: 'processing',
  received: 'success',
  out_for_delivery: 'processing',
  delivered: 'success',
};

export function labelForStatus(status) {
  return shipmentStatusLabels[status] || taskStatusLabels[status] || String(status || '-').replaceAll('_', ' ');
}

export function colorForStatus(status) {
  return shipmentStatusColors[status] || taskStatusColors[status] || 'default';
}

export function formatMoney(value) {
  const amount = Number(value || 0);
  return `NPR ${amount.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-NP', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function unwrapApi(response) {
  const payload = response?.data?.data ?? response?.data ?? response;
  return payload;
}

export function unwrapPaginated(response) {
  const payload = unwrapApi(response);
  if (Array.isArray(payload)) return { items: payload, meta: null };
  if (Array.isArray(payload?.data)) return { items: payload.data, meta: payload };
  return { items: [], meta: payload || null };
}
