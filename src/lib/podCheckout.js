// HamroPay checkout opener shared by the rider page and /pod-checkout.
//
// The marketplace pod-qr response gives payment_url + params. HamroPay's
// checkout must be opened with an HTML form POST (x-www-form-urlencoded) of
// every param, the same way Tukaatu marketplace / tukaatu-store do it
// (marketplace/app/components/CheckoutPage.tsx, tukaatu-store subscriptions).
// Opening payment_url?query with GET does not show the payment page.

export const POD_CHECKOUT_WINDOW = "tkt_pod_checkout";

export function podSessionId(session) {
  return session?.payment_session_id || session?.session_id || null;
}

/** { url, params } when the session has a checkout to open, else null. */
export function podCheckoutTarget(session) {
  const url = [session?.payment_url, session?.payment?.checkout_url, session?.checkout_url]
    .find((value) => typeof value === "string" && /^https?:\/\//i.test(value.trim()));
  if (!url) return null;

  const raw = session?.params;
  const params = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};

  return { url: url.trim(), params };
}

export function podCheckoutReady(session) {
  return ["pending", "ready"].includes(session?.status) && !!podCheckoutTarget(session);
}

/** Express page that loads the session and POSTs it to HamroPay. */
export function podCheckoutPageUrl(deliveryId, sessionId = null) {
  const query = new URLSearchParams({ delivery: String(deliveryId) });
  if (sessionId) query.set("session", String(sessionId));
  return `/pod-checkout?${query.toString()}`;
}

/**
 * POST the checkout form (hidden inputs, one per param) into `target`
 * ("_self", "_blank" or a window name).
 */
export function submitPodCheckoutForm(checkout, target = "_self") {
  if (!checkout?.url || typeof document === "undefined") return false;

  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkout.url;
  form.enctype = "application/x-www-form-urlencoded";
  form.target = target;
  form.style.display = "none";

  Object.entries(checkout.params || {}).forEach(([name, value]) => {
    if (value === null || value === undefined) return;
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = String(value);
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  setTimeout(() => form.remove(), 1000);
  return true;
}