"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Segmented, Space, Spin, Switch, Typography, message } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import { QRCodeSVG } from "qrcode.react";
import Code128 from "@/components/admin/transfers/Code128";
import { getContainer } from "@/services/admin/transferService";
import { vehicleLabel } from "@/components/admin/transfers/TransferDispatchModal";

const { Text } = Typography;

function fmt(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  return Number.isNaN(d.getTime()) ? String(dt) : d.toLocaleString();
}

function kg(v) {
  const n = Number(v || 0);
  return n ? `${n.toFixed(2)} kg` : "-";
}

const TR_STATUS = {
  open: "Open (not dispatched)",
  dispatched: "Dispatched",
  in_transit: "In transit",
  received: "Received",
  partially_received: "Partially received",
  cancelled: "Cancelled",
};

/**
 * Printable TR documents.
 *   ?type=label    : A6 bag label (big TR number, Code 128 + QR of the TR number, trip, seal, count, weight).
 *   ?type=manifest : A4 manifest sheet (every parcel, last mile / onward, weight, cost share, signatures).
 * The receiving branch scans the label barcode in Transfers > In Transit > Scan TR.
 */
export default function TrPrintPage() {
  const params = useParams();
  const id = params?.id;
  const [type, setType] = useState("label");
  const [branchId, setBranchId] = useState(null);
  const [ready, setReady] = useState(false);
  const [tr, setTr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCost, setShowCost] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    setType(sp.get("type") === "manifest" ? "manifest" : "label");
    setBranchId(sp.get("branch_id") || null);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !id) return;
    let alive = true;
    setLoading(true);
    getContainer(id, branchId ? { branch_id: branchId } : {})
      .then((d) => alive && setTr(d))
      .catch((e) => {
        if (!alive) return;
        message.error(e?.response?.data?.message || "Failed to load TR");
        setTr(null);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [ready, id, branchId]);

  const items = useMemo(
    () => (tr?.items || []).filter((i) => !["cancelled", "moved"].includes(i.status)),
    [tr]
  );
  const number = tr?.transfer_number || tr?.display_number || "";
  const carrier = [tr?.rider?.name || tr?.driver_name, tr?.rider?.phone || tr?.driver_phone].filter(Boolean).join(" · ");
  const vehicle = [vehicleLabel(tr?.vehicle_type), tr?.vehicle_number].filter(Boolean).join(" · ");

  const changeType = (t) => {
    setType(t);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("type", t);
      window.history.replaceState(null, "", url.toString());
    }
  };

  return (
    <div className="tr-print-root">
      <style>{`
        .tr-print-root { position: fixed; inset: 0; z-index: 2000; background: #f0f2f5; overflow: auto; }
        .tr-toolbar { position: sticky; top: 0; z-index: 1; background: #fff; border-bottom: 1px solid #eee; padding: 8px 16px; }
        .tr-sheet { background: #fff; color: #000; margin: 16px auto; box-shadow: 0 1px 6px rgba(0,0,0,.15); font-family: Arial, Helvetica, sans-serif; }
        .tr-label { width: 105mm; min-height: 148mm; padding: 6mm; box-sizing: border-box; }
        .tr-a4 { width: 210mm; min-height: 297mm; padding: 12mm; box-sizing: border-box; font-size: 11px; }
        .tr-big { font-size: 34px; font-weight: 800; letter-spacing: 1px; text-align: center; line-height: 1.1; }
        .tr-trip { font-size: 18px; font-weight: 700; text-align: center; margin: 6px 0; }
        .tr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; font-size: 12px; margin-top: 6px; }
        .tr-grid b { display: block; font-size: 10px; text-transform: uppercase; color: #444; }
        .tr-box { border: 2px solid #000; border-radius: 4px; padding: 4px 6px; }
        .tr-center { text-align: center; }
        .tr-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        .tr-table th, .tr-table td { border: 1px solid #999; padding: 3px 5px; text-align: left; vertical-align: top; }
        .tr-table th { background: #f2f2f2; font-size: 10px; text-transform: uppercase; }
        .tr-sign { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 28px; }
        .tr-sign div { border-top: 1px solid #000; padding-top: 4px; font-size: 11px; min-height: 40px; }
        .tr-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        @media print {
          @page { size: ${type === "manifest" ? "A4" : "A6"}; margin: ${type === "manifest" ? "8mm" : "0"}; }
          body * { visibility: hidden !important; }
          .tr-print-root, .tr-print-root .tr-sheet, .tr-print-root .tr-sheet * { visibility: visible !important; }
          .tr-print-root { position: absolute; inset: 0; background: #fff; overflow: visible; }
          .tr-toolbar { display: none !important; }
          .tr-sheet { margin: 0; box-shadow: none; }
          .tr-a4 { width: auto; min-height: 0; padding: 0; }
          .tr-table tr { page-break-inside: avoid; }
        }
      `}</style>

      <div className="tr-toolbar">
        <Space wrap>
          <Segmented
            value={type}
            onChange={changeType}
            options={[
              { value: "label", label: "Bag label (A6)" },
              { value: "manifest", label: "Manifest sheet (A4)" },
            ]}
          />
          {type === "manifest" ? (
            <Space size={4}>
              <Switch size="small" checked={showCost} onChange={setShowCost} />
              <Text>Show cost share</Text>
            </Space>
          ) : null}
          <Button type="primary" icon={<PrinterOutlined />} disabled={!tr} onClick={() => window.print()}>
            Print
          </Button>
          {tr?.status === "open" ? <Text type="warning">Not dispatched yet: parcels can still change.</Text> : null}
        </Space>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 64 }}>
          <Spin />
        </div>
      ) : !tr ? (
        <div style={{ textAlign: "center", padding: 64 }}>TR not found.</div>
      ) : type === "label" ? (
        <div className="tr-sheet tr-label">
          <div className="tr-center" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>TRANSFER BAG</div>
          <div className="tr-big">{number}</div>
          <div className="tr-center" style={{ margin: "4px 0" }}>
            <Code128 value={number} height={56} moduleWidth={2} showText={false} />
          </div>
          <div className="tr-trip">
            {tr.from_branch?.name || "-"} &rarr; {tr.to_branch?.name || "-"}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <QRCodeSVG value={number} size={96} level="M" />
            <div className="tr-box" style={{ flex: 1 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase" }}>Seal no.</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{tr.seal_number || "—"}</div>
            </div>
          </div>
          <div className="tr-grid">
            <div><b>Parcels</b>{tr.parcel_count}{tr.last_mile_count || tr.onward_count ? ` (${tr.last_mile_count} last mile, ${tr.onward_count} onward)` : ""}</div>
            <div><b>Total weight</b>{kg(tr.total_weight)}</div>
            <div><b>Dispatched</b>{fmt(tr.dispatched_at)}</div>
            <div><b>Vehicle</b>{vehicle || "-"}</div>
            <div style={{ gridColumn: "1 / span 2" }}><b>Rider / driver</b>{carrier || "-"}</div>
            {(tr.onward_breakdown || []).length ? (
              <div style={{ gridColumn: "1 / span 2" }}>
                <b>Onward</b>
                {tr.onward_breakdown.map((o) => `${o.destination_name} ${o.count}`).join(", ")}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="tr-sheet tr-a4">
          <div className="tr-head">
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>TRANSFER MANIFEST</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{number}</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>
                {tr.from_branch?.name || "-"} &rarr; {tr.to_branch?.name || "-"}
              </div>
              <div style={{ marginTop: 2 }}>Status: {TR_STATUS[tr.status] || tr.status}</div>
            </div>
            <div className="tr-center">
              <Code128 value={number} height={44} moduleWidth={1.6} fontSize={11} />
            </div>
          </div>

          <div className="tr-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", fontSize: 11 }}>
            <div><b>Dispatched</b>{fmt(tr.dispatched_at)}</div>
            <div><b>Vehicle</b>{vehicle || "-"}</div>
            <div><b>Rider / driver</b>{carrier || "-"}</div>
            <div><b>Seal no.</b>{tr.seal_number || "-"}</div>
            <div><b>Parcels</b>{tr.parcel_count} ({tr.last_mile_count} last mile, {tr.onward_count} onward)</div>
            <div><b>Total weight</b>{kg(tr.total_weight)}</div>
            <div><b>Trip cost</b>{Number(tr.transport_cost) ? `Rs ${Number(tr.transport_cost).toFixed(2)} (${tr.transport_cost_split_mode})` : "-"}</div>
            <div><b>Received</b>{fmt(tr.received_at)}</div>
          </div>

          <table className="tr-table">
            <thead>
              <tr>
                <th style={{ width: 28 }}>#</th>
                <th>Tracking</th>
                <th>Receiver</th>
                <th>Final destination</th>
                <th>At {tr.to_branch?.name || "next hop"}</th>
                <th style={{ width: 60 }}>Weight</th>
                {showCost ? <th style={{ width: 70 }}>Cost share</th> : null}
                <th style={{ width: 60 }}>Check</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i, idx) => (
                <tr key={i.item_id}>
                  <td>{idx + 1}</td>
                  <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{i.tracking_number || `#${i.shipment_id}`}</td>
                  <td>{i.receiver_name || "-"}</td>
                  <td>{i.destination_name || "-"}</td>
                  <td>{i.is_final_here ? "Last mile" : "Onward"}</td>
                  <td>{kg(i.weight)}</td>
                  {showCost ? <td>{Number(i.transport_cost) ? `Rs ${Number(i.transport_cost).toFixed(2)}` : "-"}</td> : null}
                  <td>{i.status === "received" ? "✓" : i.status === "missing" || i.status === "lost" ? i.status : "☐"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {tr.notes ? <div style={{ marginTop: 8 }}><b>Notes:</b> {tr.notes}</div> : null}

          <div className="tr-sign">
            <div>Sender ({tr.from_branch?.name || "origin"})<br />Name / sign / date</div>
            <div>Driver / rider{carrier ? ` (${carrier})` : ""}<br />Name / sign / date</div>
            <div>Receiver ({tr.to_branch?.name || "next hop"})<br />Name / sign / date</div>
          </div>
        </div>
      )}
    </div>
  );
}
