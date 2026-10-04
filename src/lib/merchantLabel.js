/**
 * Display helpers for merchant / store partners.
 * Branch managers and staff need name + id (and store code when present).
 */

export function merchantName(merchantOrRow) {
  if (!merchantOrRow) return null;
  const m =
    merchantOrRow.merchant && typeof merchantOrRow.merchant === "object"
      ? merchantOrRow.merchant
      : merchantOrRow;

  const name =
    m?.name ||
    m?.business_name ||
    merchantOrRow.merchant_name ||
    null;

  return name ? String(name) : null;
}

export function merchantId(merchantOrRow) {
  if (!merchantOrRow) return null;
  const m =
    merchantOrRow.merchant && typeof merchantOrRow.merchant === "object"
      ? merchantOrRow.merchant
      : merchantOrRow;
  return (
    m?.id ??
    merchantOrRow.merchant_id ??
    null
  );
}

export function merchantStoreId(merchantOrRow) {
  if (!merchantOrRow) return null;
  const m =
    merchantOrRow.merchant && typeof merchantOrRow.merchant === "object"
      ? merchantOrRow.merchant
      : merchantOrRow;
  return (
    m?.external_store_id ||
    merchantOrRow.external_store_id ||
    null
  );
}

/**
 * "Fashion Wear (STORE-00003 · #3)" or "Fashion Wear (#3)" or "#3"
 */
export function formatMerchantLabel(merchantOrRow, fallback = "-") {
  if (!merchantOrRow && merchantOrRow !== 0) return fallback;

  // Plain numeric id
  if (typeof merchantOrRow === "number" || (typeof merchantOrRow === "string" && /^\d+$/.test(merchantOrRow))) {
    return `#${merchantOrRow}`;
  }

  const name = merchantName(merchantOrRow);
  const id = merchantId(merchantOrRow);
  const store = merchantStoreId(merchantOrRow);

  const idPart = [store || null, id != null ? `#${id}` : null]
    .filter(Boolean)
    .join(" · ");

  if (name && idPart) return `${name} (${idPart})`;
  if (name) return name;
  if (idPart) return idPart;
  return fallback;
}

export function marketplaceLabel(row, fallback = "-") {
  if (!row) return fallback;
  const name =
    row.marketplace_name ||
    row.marketplace?.name ||
    row.merchant?.marketplace?.name ||
    null;
  const id =
    row.marketplace_id ??
    row.marketplace?.id ??
    row.merchant?.marketplace_id ??
    null;
  if (name && id != null) return `${name} (#${id})`;
  if (name) return name;
  if (id != null) return `#${id}`;
  return fallback;
}
