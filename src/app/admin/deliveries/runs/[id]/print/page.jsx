"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Segmented, Space, Spin, Switch, Typography, message } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import { QRCodeSVG } from "qrcode.react";
import Code128 from "@/components/admin/transfers/Code128";
import { getDeliveryRun, runErrorText } from "@/services/admin/deliveryRunService";
import { RUN_STATUS_META, areaOf, fmtDate, rs, vehicleText } from "@/components/admin/delivery-runs/runMeta";

const { Text } = Typography;

/**
 * Printable DR documents.
 *   ?type=sheet : A4 run sheet for the rider (stops in order, addresses, phones,
 *                 COD to collect, outcome / signature columns, hand-over signatures).
 *   ?type=label : A6 label for the rider bag / crate (DR number, barcode, QR, totals).
 */
export default function DeliveryRunPrintPage() {
  const params = useParams();
  const id = params?.id;
  const [type, setType] = useState("sheet");
  const [branchId, setBranchId] = useState(null);
  const [ready, setReady] = useState(false);
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResult, setShowResult] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    setType(sp.get("type") === "label" ? "label" : "sheet");
    setBranchId(sp.get("branch_id") || null);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !id) return undefined;
    let alive = true;
    setLoading(true);
    getDeliveryRun(id, branchId)
      .then((d) => alive && setRun(d))
      .catch((e) => {
        if (!alive) return;
        message.error(runErrorText(e, "Failed to load the run"));
        setRun(null);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [ready, id, branchId]);

  const items = useMemo(() => (run?.items || []).filter((i) => i.status !== "removed"), [run]);
  const number = run?.run_number || "";
  const rider = [run?.rider?.name, run?.rider?.phone].filter(Boolean).join(" · ");
  const vehicle = vehicleText(run?.vehicle_type, run?.vehicle_number);
  const codCount = items.filter((i) => Number(i.cod_amount) > 0).length;

  const changeType = (t) => {
    setType(t);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("type", t);
      window.history.replaceState(null, "", url.toString());
    }
  };

  const resultText = (i) => {
    if (i.status === "delivered") {
      return Number(i.cod_amount) > 0 ? `Delivered (${i.payment_method === "online" ? "online" : `cash ${rs(i.collected_amount)}`})` : "Delivered";
    }
    if (i.status === "failed") return `Failed${i.reason ? `: ${i.reason}` : ""}`;
    return "";
  };

  return (
    <div className="dr-print-root">
      <style>{`
        .dr-print-root { position: fixed; inset: 0; z-index: 2000; background: #f0f2f5; overflow: auto; }
        .dr-toolbar { position: sticky; top: 0; z-index: 1; background: #fff; border-bottom: 1px solid #eee; padding: 8px 16px; }
        .dr-sheet { background: #fff; color: #000; margin: 16px auto; box-shadow: 0 1px 6px rgba(0,0,0,.15); font-family: Arial, Helvetica, sans-serif; }
        .dr-label { width: 105mm; min-height: 148mm; padding: 6mm; box-sizing: border-box; }
        .dr-a4 { width: 210mm; min-height: 297mm; padding: 10mm; box-sizing: border-box; font-size: 10.5px; }
        .dr-big { font-size: 30px; font-weight: 800; letter-spacing: 1px; text-align: center; line-height: 1.1; }
        .dr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; font-size: 12px; margin-top: 6px; }
        .dr-grid b { display: block; font-size: 10px; text-transform: uppercase; color: #444; }
        .dr-box { border: 2px solid #000; border-radius: 4px; padding: 4px 6px; }
        .dr-center { text-align: center; }
        .dr-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        .dr-table th, .dr-table td { border: 1px solid #999; padding: 3px 4px; text-align: left; vertical-align: top; }
        .dr-table th { background: #f2f2f2; font-size: 9.5px; text-transform: uppercase; }
        .dr-sign { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 24px; }
        .dr-sign div { border-top: 1px solid #000; padding-top: 4px; font-size: 11px; min-height: 40px; }
        .dr-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .dr-totals { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 8px; }
        .dr-totals div { border: 1px solid #999; padding: 4px 6px; }
        .dr-totals b { display: block; font-size: 9.5px; text-transform: uppercase; color: #444; }
        @media print {
          @page { size: ${type === "sheet" ? "A4" : "A6"}; margin: ${type === "sheet" ? "8mm" : "0"}; }
          body * { visibility: hidden !important; }
          .dr-print-root, .dr-print-root .dr-sheet, .dr-print-root .dr-sheet * { visibility: visible !important; }
          .dr-print-root { position: absolute; inset: 0; background: #fff; overflow: visible; }
          .dr-toolbar { display: none !important; }
          .dr-sheet { margin: 0; box-shadow: none; }
          .dr-a4 { width: auto; min-height: 0; padding: 0; }
          .dr-table tr { page-break-inside: avoid; }
        }
      `}</style>

      <div className="dr-toolbar">
        <Space wrap>
          <Segmented
            value={type}
            onChange={changeType}
            options={[
              { value: "sheet", label: "Run sheet (A4)" },
              { value: "label", label: "Bag label (A6)" },
            ]}
          />
          {type === "sheet" ? (
            <Space size={4}>
              <Switch size="small" checked={showResult} onChange={setShowResult} />
              <Text>Show recorded results</Text>
            </Space>
          ) : null}
          <Button type="primary" icon={<PrinterOutlined />} disabled={!run} onClick={() => window.print()}>
            Print
          </Button>
          {run && ["open", "assigned"].includes(run.status) ? (
            <Text type="warning">Not started yet: the rider is collecting and bagging; parcels can still change.</Text>
          ) : null}
        </Space>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 64 }}>
          <Spin />
        </div>
      ) : !run ? (
        <div style={{ textAlign: "center", padding: 64 }}>Delivery run not found.</div>
      ) : type === "label" ? (
        <div className="dr-sheet dr-label">
          <div className="dr-center" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>
            DELIVERY RUN
          </div>
          <div className="dr-big">{number}</div>
          <div className="dr-center" style={{ margin: "4px 0" }}>
            <Code128 value={number} height={56} moduleWidth={2} showText={false} />
          </div>
          <div className="dr-center" style={{ fontSize: 16, fontWeight: 700 }}>
            {run.branch?.name || "-"}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
            <QRCodeSVG value={number} size={96} level="M" />
            <div className="dr-box" style={{ flex: 1 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase" }}>Rider</div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{run.rider?.name || "—"}</div>
              <div style={{ fontSize: 12 }}>{run.rider?.phone || ""}</div>
            </div>
          </div>
          <div className="dr-grid">
            <div>
              <b>Parcels</b>
              {items.length}
            </div>
            <div>
              <b>COD parcels</b>
              {codCount}
            </div>
            <div>
              <b>COD to collect</b>
              {rs(run.cod_expected)}
            </div>
            <div>
              <b>Vehicle</b>
              {vehicle || "-"}
            </div>
            <div style={{ gridColumn: "1 / span 2" }}>
              <b>Started</b>
              {fmtDate(run.started_at || run.dispatched_at)}
            </div>
          </div>
        </div>
      ) : (
        <div className="dr-sheet dr-a4">
          <div className="dr-head">
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>DELIVERY RUN SHEET</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{number}</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {run.branch?.name || "-"}
                {run.branch?.phone ? ` · ${run.branch.phone}` : ""}
              </div>
              <div style={{ marginTop: 2 }}>Status: {RUN_STATUS_META[run.status]?.label || run.status}</div>
            </div>
            <div className="dr-center">
              <Code128 value={number} height={44} moduleWidth={1.6} fontSize={11} />
            </div>
          </div>

          <div className="dr-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", fontSize: 11 }}>
            <div>
              <b>Rider</b>
              {rider || "-"}
            </div>
            <div>
              <b>Vehicle</b>
              {vehicle || "-"}
            </div>
            <div>
              <b>Created</b>
              {fmtDate(run.created_at)}
            </div>
            <div>
              <b>Started</b>
              {fmtDate(run.started_at || run.dispatched_at)}
            </div>
          </div>

          <table className="dr-table">
            <thead>
              <tr>
                <th style={{ width: 22 }}>#</th>
                <th style={{ width: 34 }}>Bag</th>
                <th style={{ width: 110 }}>Tracking</th>
                <th>Receiver / phone</th>
                <th>Address</th>
                <th style={{ width: 70 }}>COD</th>
                <th style={{ width: 110 }}>Result / reason</th>
                <th style={{ width: 80 }}>Receiver sign</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.item_id}>
                  <td>{i.sequence}</td>
                  <td style={{ textAlign: "center", fontSize: 16, lineHeight: 1 }}>
                    {i.status === "queued" ? "\u2610" : "\u2611"}
                  </td>
                  <td style={{ fontFamily: "monospace", fontWeight: 700 }}>
                    {i.tracking_number || `#${i.shipment_id}`}
                    {i.attempt > 1 ? <div style={{ fontWeight: 400 }}>attempt {i.attempt}</div> : null}
                  </td>
                  <td>
                    {i.receiver_name || "-"}
                    <div style={{ fontWeight: 700 }}>{i.receiver_phone || ""}</div>
                    {i.merchant?.name ? <div style={{ color: "#555" }}>{i.merchant.name}</div> : null}
                  </td>
                  <td>
                    <b>{areaOf(i)}</b>
                    <div>{i.delivery_address || "-"}</div>
                    {i.special_instructions ? <div style={{ fontStyle: "italic" }}>{i.special_instructions}</div> : null}
                  </td>
                  <td style={{ fontWeight: 700 }}>{Number(i.cod_amount) > 0 ? rs(i.cod_amount) : "Prepaid"}</td>
                  <td>{showResult ? resultText(i) : ""}</td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>

          <div className="dr-totals">
            <div>
              <b>Parcels</b>
              {items.length} ({codCount} COD)
            </div>
            <div>
              <b>COD to collect</b>
              {rs(run.cod_expected)}
            </div>
            <div>
              <b>Cash collected</b>
              {showResult && Number(run.cod_collected) ? rs(run.cod_collected) : "Rs ________"}
            </div>
            <div>
              <b>Delivered / failed</b>
              {showResult && (run.delivered_count || run.failed_count) ? `${run.delivered_count} / ${run.failed_count}` : "____ / ____"}
            </div>
          </div>

          {run.notes ? (
            <div style={{ marginTop: 8 }}>
              <b>Notes:</b> {run.notes}
            </div>
          ) : null}

          <div className="dr-sign">
            <div>
              Handed over by ({run.branch?.name || "branch"})
              <br />
              Name / sign / time
            </div>
            <div>
              Rider{run.rider?.name ? ` (${run.rider.name})` : ""}
              <br />
              Sign out / sign in
            </div>
            <div>
              Cash &amp; returns received by
              <br />
              Name / sign / amount
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
