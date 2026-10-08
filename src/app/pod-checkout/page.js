"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, Button, Card, Spin, Typography } from "antd";
import { getToken } from "@/lib/auth";
import { staffGetPodPayment } from "@/services/deliveryOperationsApi";
import {
  podCheckoutReady,
  podCheckoutTarget,
  podSessionId,
  submitPodCheckoutForm,
} from "@/lib/podCheckout";

const { Text } = Typography;

const POLL_MS = 2000;
const MAX_WAIT_MS = 120000;
// Opened without ?session=: give the rider page time to pass the new session.
const UNNAMED_GRACE_MS = 15000;

function submittedKey(sessionId) {
  return `pod_checkout_submitted:${sessionId}`;
}

function PodCheckoutInner() {
  const search = useSearchParams();
  const deliveryId = search.get("delivery");
  const wantedSession = search.get("session");
  const [state, setState] = useState({ phase: "loading", message: "Preparing the payment page..." });
  const [session, setSession] = useState(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!deliveryId) {
      setState({ phase: "error", message: "Missing delivery id." });
      return undefined;
    }
    if (!getToken()) {
      setState({ phase: "error", message: "Log in to the rider app in this browser, then open the payment page again." });
      return undefined;
    }

    let cancelled = false;
    let timer = null;
    const startedAt = Date.now();

    const tick = async () => {
      if (cancelled || submittedRef.current) return;
      const elapsed = Date.now() - startedAt;
      try {
        const current = await staffGetPodPayment(deliveryId, false);
        if (cancelled) return;
        setSession(current || null);
        const sid = podSessionId(current) != null ? String(podSessionId(current)) : null;
        const matches = wantedSession ? sid === wantedSession : elapsed >= UNNAMED_GRACE_MS;

        if (current?.status === "paid") {
          setState({ phase: "done", message: "This payment is already confirmed. You can close this tab." });
          return;
        }

        if (matches && podCheckoutReady(current)) {
          // Auto-submit once per session (a reload / back shows the button instead).
          let already = false;
          try { already = !!window.sessionStorage.getItem(submittedKey(sid)); } catch { /* ignore */ }
          if (already) {
            setState({ phase: "manual", message: "The payment page was already opened for this session." });
            return;
          }
          try { window.sessionStorage.setItem(submittedKey(sid), String(Date.now())); } catch { /* ignore */ }
          submittedRef.current = true;
          setState({ phase: "redirecting", message: "Opening the HamroPay payment page..." });
          submitPodCheckoutForm(podCheckoutTarget(current), "_self");
          return;
        }

        if (wantedSession && sid === wantedSession && ["failed", "expired", "cancelled", "refunded"].includes(current?.status)) {
          setState({ phase: "error", message: current?.last_error || `Payment session ${current?.status}. Retry from the rider app.` });
          return;
        }
      } catch (error) {
        if (cancelled) return;
        if (elapsed >= MAX_WAIT_MS) {
          setState({ phase: "error", message: error?.response?.data?.message || "Could not load the payment session." });
          return;
        }
      }

      if (Date.now() - startedAt >= MAX_WAIT_MS) {
        setState({ phase: "error", message: "The payment page is not ready yet. Go back to the rider app and retry." });
        return;
      }
      setState((prev) => (prev.phase === "loading" ? prev : { phase: "loading", message: "Preparing the payment page..." }));
      timer = setTimeout(tick, POLL_MS);
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [deliveryId, wantedSession]);

  const checkout = podCheckoutReady(session) ? podCheckoutTarget(session) : null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "#f5f7fa" }}>
      <Card style={{ maxWidth: 420, width: "100%", textAlign: "center" }} title="POD online payment">
        {["loading", "redirecting"].includes(state.phase) && (
          <div style={{ padding: "12px 0" }}>
            <Spin />
            <div style={{ marginTop: 10 }}>{state.message}</div>
          </div>
        )}
        {state.phase === "done" && <Alert type="success" showIcon message={state.message} />}
        {state.phase === "error" && <Alert type="error" showIcon message={state.message} />}
        {state.phase === "manual" && <Alert type="info" showIcon message={state.message} />}
        {checkout && state.phase !== "done" && (
          <Button
            type="primary"
            size="large"
            block
            style={{ marginTop: 16 }}
            onClick={() => submitPodCheckoutForm(checkout, "_self")}
          >
            Open payment page
          </Button>
        )}
        {session?.amount ? (
          <Text type="secondary" style={{ display: "block", marginTop: 12, fontSize: 12 }}>
            Amount: Rs. {Number(session.amount).toFixed(2)} {session.currency || "NPR"}
          </Text>
        ) : null}
      </Card>
    </div>
  );
}

export default function PodCheckoutPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, textAlign: "center" }}><Spin /></div>}>
      <PodCheckoutInner />
    </Suspense>
  );
}