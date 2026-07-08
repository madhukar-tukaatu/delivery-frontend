export const STATUS_LABELS = {
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
  transferred_to_destination_sub_branch: 'Transferred to Destination Sub-Branch',
  received_at_destination_sub_branch: 'Received at Destination Sub-Branch',
  assigned_to_rider: 'Assigned to Rider',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  delivery_failed: 'Delivery Failed',
  return_initiated: 'Return Initiated',
  returned_to_origin: 'Returned to Origin',
  cancelled: 'Cancelled',
};

export const STATUS_COLORS = {
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
  transferred_to_destination_sub_branch: 'gold',
  received_at_destination_sub_branch: 'gold',
  assigned_to_rider: 'magenta',
  out_for_delivery: 'processing',
  delivered: 'success',
  delivery_failed: 'error',
  return_initiated: 'warning',
  returned_to_origin: 'warning',
  cancelled: 'default',
};

export const ROUTE_STEP_STATUS_LABELS = {
  pending: 'Pending',
  departed: 'Departed',
  in_transit: 'In Transit',
  received: 'Received',
  failed: 'Failed',
};

export const ROUTE_STEP_STATUS_COLORS = {
  pending: 'default',
  departed: 'blue',
  in_transit: 'processing',
  received: 'success',
  failed: 'error',
};

export function prettyStatus(status) {
  return STATUS_LABELS[status] || String(status || '-').replaceAll('_', ' ');
}

export function statusColor(status) {
  return STATUS_COLORS[status] || 'default';
}

export function routeStepStatusLabel(status) {
  return ROUTE_STEP_STATUS_LABELS[status] || String(status || '-').replaceAll('_', ' ');
}

export function routeStepStatusColor(status) {
  return ROUTE_STEP_STATUS_COLORS[status] || 'default';
}

export function formatMoney(value) {
  const amount = Number(value || 0);

  return `NPR ${amount.toLocaleString('en-NP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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