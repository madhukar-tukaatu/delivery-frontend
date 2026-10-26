"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Segmented, Space, Spin, Switch, Typography, message } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import { QRCodeSVG } from "qrcode.react";
import Code128 from "@/components/admin/transfers/Code128";
import { getPickupRun, runErrorText } from "@/services/admin/pickupRunService";
import { fmtDate, vehicleText } from "@/components/admin/delivery-runs/runMeta";

const { Text } = Typography;

/**
 * Printable PR documents.
 *   ?type=sheet : A4 pickup run sheet for rider (stops in sequence, merchants, addresses,
 *                 contact phones, parcel quantities, outcome / notes, handover signatures).
 *   ?type=label : A6 label for pickup crates / bags (PR number, barcode, QR, stops).
 */
export default function PickupRunPrintPage() {
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
    getPickupRun(id, branchId)
      .then((d) => alive && setRun(d))
      .catch((e) => {
        if (!alive) return;
        message.error(runErrorText(e, "Failed to load pickup run"));
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

  const totalParcels = useMemo(() => {
    return items.reduce((acc, i) => {
      const pr = i.pickupRequest || i;
      const count = (i.shipments && i.shipments.length) || pr?.parcel_quantity || 1;
      return acc + count;
    }, 0);
  }, [items]);

  const changeType = (t) => {
    setType(t);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("type", t);
      window.history.replaceState(null, "", url.toString());
    }
  };

  const resultText = (i) => {
    if (i.status === "picked_up") return "Picked Up";
    if (i.status === "failed") return `Failed${i.reason ? `: ${i.reason}` : ""}`;
    return "";
  };

  return (
    <div className="pr-print-root">
      <style>{`
        .pr-print-root { position: fixed; inset: 0; z-index: 2000; background: #f0f2f5; overflow: auto; }
        .pr-toolbar { position: sticky; top: 0; z-index: 1; background: #fff; border-bottom: 1px solid #eee; padding: 8px 16px; }
        .pr-sheet { background: #fff; color: #000; margin: 16px auto; box-shadow: 0 1px 6px rgba(0,0,0,.15); font-family: Arial, Helvetica, sans-serif; }
        .pr-label { width: 105mm; min-height: 148mm; padding: 6mm; box-sizing: border-box; }
        .pr-a4 { width: 210mm; min-height: 297mm; padding: 10mm; box-sizing: border-box; font-size: 10.5px; }
        .pr-big { font-size: 30px; font-weight: 800; letter-spacing: 1px; text-align: center; line-height: 1.1; }
        .pr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; font-size: 12px; margin-top: 6px; }
        .pr-grid b { display: block; font-size: 10px; text-transform: uppercase; color: #444; }
        .pr-box { border: 2px solid #000; border-radius: 4px; padding: 4px 6px; }
        .pr-center { text-align: center; }
        .pr-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        .pr-table th, .pr-table td { border: 1px solid #999; padding: 3px 4px; text-align: left; vertical-align: top; }
        .pr-table th { background: #f2f2f2; font-size: 9.5px; text-transform: uppercase; }
        .pr-sign { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 24px; }
        .pr-sign div { border-top: 1px solid #000; padding-top: 4px; font-size: 11px; min-height: 40px; }
        .pr-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .pr-totals { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 8px; }
        .pr-totals div { border: 1px solid #999; padding: 4px 6px; }
        .pr-totals b { display: block; font-size: 9.5px; text-transform: uppercase; color: #444; }
        @media print {
          @page { size: ${type === "sheet" ? "A4" : "A6"}; margin: ${type === "sheet" ? "8mm" : "0"}; }
          body * { visibility: hidden !important; }
          .pr-print-root, .pr-print-root .pr-sheet, .pr-print-root .pr-sheet * { visibility: visible !important; }
          .pr-print-root { position: absolute; inset: 0; background: #fff; overflow: visible; }
          .pr-toolbar { display: none !important; }
          .pr-sheet { margin: 0; box-shadow: none; }
          .pr-a4 { width: auto; min-height: 0; padding: 0; }
          .pr-table tr { page-break-inside: avoid; }
        }
      `}</style>

      <div className="pr-toolbar">
        <Space wrap>
          <Segmented
            value={type}
            onChange={changeType}
            options={[
              { value: "sheet", label: "Pickup Sheet (A4)" },
              { value: "label", label: "Bag/Crate Label (A6)" },
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
            <Text type="warning">Not dispatched yet: stops can still change.</Text>
          ) : null}
        </Space>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 64 }}>
          <Spin />
        </div>
      ) : !run ? (
        <div style={{ textAlign: "center", padding: 64 }}>Pickup run not found.</div>
      ) : type === "label" ? (
        <div className="pr-sheet pr-label">
          <div className="pr-center" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>
            PICKUP RUN (PR)
          </div>
          <div className="pr-big">{number}</div>
          <div className="pr-center" style={{ margin: "4px 0" }}>
            <Code128 value={number} height={56} moduleWidth={2} showText={false} />
          </div>

          <div className="pr-grid">
            <div className="pr-box">
              <b>Origin Branch</b>
              <div>{run.branch?.name || "-"}</div>
            </div>
            <div className="pr-box">
              <b>Stops / Est. Parcels</b>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                {run.expected_count} stops · {totalParcels} pkgs
              </div>
            </div>
          </div>

          <div className="pr-grid">
            <div>
              <b>Rider</b>
              <div>{rider || "Unassigned"}</div>
            </div>
            <div>
              <b>Vehicle</b>
              <div>{vehicle || "-"}</div>
            </div>
          </div>

          <div className="pr-grid">
            <div>
              <b>Date / Dispatched</b>
              <div>{fmtDate(run.dispatched_at || run.created_at)}</div>
            </div>
            <div>
              <b>Status</b>
              <div style={{ textTransform: "capitalize", fontWeight: 700 }}>{run.status}</div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <div style={{ fontSize: 10, color: "#666" }}>Scan at branch hub check-in</div>
            <QRCodeSVG value={number} size={58} />
          </div>
        </div>
      ) : (
        <div className="pr-sheet pr-a4">
          <div className="pr-head">
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>TUKAATU PICKUP RUN SHEET</div>
              <div style={{ fontSize: 12, color: "#444" }}>
                {run.branch?.name || "Branch"} · Origin Collection Manifest
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "monospace" }}>{number}</div>
              <div style={{ fontSize: 10, color: "#666" }}>
                Printed {new Date().toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
              </div>
            </div>
          </div>

          <div className="pr-grid" style={{ marginTop: 10 }}>
            <div>
              <b>Rider</b>
              <div>{rider || "Not assigned"}</div>
            </div>
            <div>
              <b>Vehicle</b>
              <div>{vehicle || "-"}</div>
            </div>
            <div>
              <b>Area / Zone</b>
              <div>{run.area_label || "All assigned stops"}</div>
            </div>
            <div>
              <b>Dispatched</b>
              <div>{fmtDate(run.dispatched_at) || "Not yet dispatched"}</div>
            </div>
          </div>

          <div className="pr-totals">
            <div>
              <b>Total Stops</b>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{run.expected_count}</div>
            </div>
            <div>
              <b>Picked Up Stops</b>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#166534" }}>{run.picked_up_count}</div>
            </div>
            <div>
              <b>Failed / Skipped</b>
              <div style={{ fontSize: 14, fontWeight: 700, color: run.failed_count ? "#cf1322" : undefined }}>
                {run.failed_count}
              </div>
            </div>
            <div>
              <b>Total Parcels</b>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{totalParcels}</div>
            </div>
          </div>

          <table className="pr-table">
            <thead>
              <tr>
                <th style={{ width: 24, textAlign: "center" }}>#</th>
                <th style={{ width: 95 }}>PR Number</th>
                <th>Merchant & Pickup Location</th>
                <th style={{ width: 110 }}>Phone</th>
                <th style={{ width: 55, textAlign: "center" }}>Pkgs</th>
                {showResult ? <th style={{ width: 85 }}>Status</th> : null}
                <th style={{ width: 110 }}>Merchant Sign / Remarks</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i, idx) => {
                const pr = i.pickupRequest || i;
                const merchantName = pr?.merchant?.name || pr?.merchant?.business_name || pr?.pickup_name || "-";
                const addr = [pr?.pickup_area, pr?.pickup_address].filter(Boolean).join(" · ") || "-";
                const phone = pr?.pickup_phone || "-";
                const count = (i.shipments && i.shipments.length) || pr?.parcel_quantity || 1;
                const result = resultText(i);

                return (
                  <tr key={i.id || i.item_id || idx}>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{i.sequence || idx + 1}</td>
                    <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{pr?.request_number || `-`}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{merchantName}</div>
                      <div style={{ fontSize: 9.5, color: "#444" }}>{addr}</div>
                    </td>
                    <td>{phone}</td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>{count}</td>
                    {showResult ? (
                      <td style={{ fontSize: 9.5, fontWeight: 600 }}>{result}</td>
                    ) : null}
                    <td>&nbsp;</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="pr-sign">
            <div>
              <b>Rider Signature</b>
              <div>I confirm I received the stops above.</div>
            </div>
            <div>
              <b>Branch Dispatcher</b>
              <div>Dispatched with bags/seals.</div>
            </div>
            <div>
              <b>Branch Receiving Staff</b>
              <div>Verified parcels received into hub custody.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

