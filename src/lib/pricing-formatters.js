import dayjs from "dayjs";

export function money(value, currency = "NPR") {
  const amount = Number(value || 0);
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY, hh:mm A") : "—";
}

export function booleanText(value) {
  return value ? "Yes" : "No";
}

export const quoteStatusColors = {
  pending: "gold",
  confirmed: "green",
  expired: "default",
  cancelled: "red",
  rejected: "volcano",
};
