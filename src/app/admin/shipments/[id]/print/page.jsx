"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Space, Spin, Typography, message } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import { QRCodeSVG } from "qrcode.react";
import Code128 from "@/components/admin/transfers/Code128";
import { getAdminShipment } from "@/services/workflowService";
import { normalizeShipmentDetailResponse } from "@/services/merchantShipmentService";
import { formatMerchantLabel } from "@/lib/merchantLabel";

const { Text } = Typography;

const pick = (...values) => {
  for (const v of values) {
    if (v !== null && v !== undefined && String(v).trim() !== "") return v;
  }
  return null;
};
const branchName = (b) => (b ? b.name || b.branch_name || null : null);
const money = (v) => `Rs ${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** A6 shipping label for one shipment (opened from the shipment drawer). */
export default function ShipmentLabelPrintPage() {
  const params = useParams();
  const id = params?.id;
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return undefined;
    let alive = true;
    setLoading(true);
    getAdminShipment(id)
      .then((res) => {
        if (!alive) return;
        const data = normalizeShipmentDetailResponse(res);
        setShipment(data?.shipment ?? data?.data ?? (data?.id ? data : null));
      })
      .catch((e) => {
        if (!alive) return;
        message.error(e?.response?.data?.message || "Could not load shipment.");
        setShipment(null);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  const view = useMemo(() => {
    const s = shipment;
    if (!s) return null;
    const isPod = String(s.payment_type || "").toLowerCase() === "pod";
    const products = s.packet_products ?? s.packetProducts;
    const qty = Array.isArray(products) && products.length
      ? products.reduce((a, p) => a + Number(p.quantity || 1), 0)
      : pick(s.parcel_quantity, s.quantity, 1);
    return {
      number: s.tracking_number || `#${s.id}`,
      merchant: formatMerchantLabel(s.merchant || s),
      orderId: s.merchant_order_id,
      senderName: pick(s.sender_name, s.merchant?.business_name, s.merchant?.name),
      senderPhone: pick(s.sender_phone, s.merchant?.phone),
      senderAddress: pick(s.sender_address, s.pickup_address),
      receiverName: pick(s.receiver_name, s.customer_name),
      receiverPhone: pick(s.receiver_phone, s.customer_phone),
      receiverAddress: [pick(s.receiver_address, s.delivery_address), s.receiver_area, s.receiver_city].filter(Boolean).join(", "),
      origin: pick(branchName(s.origin_branch ?? s.originBranch), s.origin_branch_name),
      destination: pick(branchName(s.destination_branch ?? s.destinationBranch), s.destination_branch_name),
      service: s.service_type ? String(s.service_type).replaceAll("_", " ") : null,
      isPod,
      collect: Number(pick(s.total_collectable_amount, s.total_collectable, s.pod_amount, 0)),
      weight: pick(s.chargeable_weight, s.weight),
      qty,
      fragile: !!(s.is_fragile ?? s.fragile),
      description: pick(s.parcel_description, s.description),
      created: s.created_at,
    };
  }, [shipment]);

  return (
    <div className="sl-print-root">
      <style>{`
        .sl-print-root { position: fixed; inset: 0; z-index: 2000; background: #f0f2f5; overflow: auto; }
        .sl-toolbar { position: sticky; top: 0; z-index: 1; background: #fff; border-bottom: 1px solid #eee; padding: 8px 16px; }
        .sl-label { background: #fff; color: #000; margin: 16px auto; box-shadow: 0 1px 6px rgba(0,0,0,.15);
          font-family: Arial, Helvetica, sans-serif; width: 105mm; min-height: 148mm; padding: 5mm; box-sizing: border-box; font-size: 11px; }
        .sl-row { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 8px; margin-top: 5px; }
        .sl-box { border: 1.5px solid #000; border-radius: 3px; padding: 4px 6px; }
        .sl-box b, .sl-k { display: block; font-size: 9px; text-transform: uppercase; color: #444; font-weight: 700; }
        .sl-big { font-size: 15px; font-weight: 800; }
        .sl-center { text-align: center; }
        @media print {
          @page { size: A6; margin: 0; }
          body * { visibility: hidden !important; }
          .sl-print-root, .sl-print-root .sl-label, .sl-print-root .sl-label * { visibility: visible !important; }
          .sl-print-root { position: absolute; inset: 0; background: #fff; overflow: visible; }
          .sl-toolbar { display: none !important; }
          .sl-label { margin: 0; box-shadow: none; }
        }
      `}</style>

      <div className="sl-toolbar">
        <Space wrap>
          <Button type="primary" icon={<PrinterOutlined />} disabled={!view} onClick={() => window.print()}>
            Print label
          </Button>
          <Text type="secondary">A6 shipping label</Text>
        </Space>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 64 }}>
          <Spin />
        </div>
      ) : !view ? (
        <div style={{ textAlign: "center", padding: 64 }}>Shipment not found.</div>
      ) : (
        <div className="sl-label">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 800, letterSpacing: 1 }}>TUKAATU EXPRESS</div>
            <div style={{ fontWeight: 700, textTransform: "uppercase" }}>{view.service || ""}</div>
          </div>
          <div className="sl-center" style={{ marginTop: 4 }}>
            <Code128 value={view.number} height={54} moduleWidth={1.6} showText={false} />
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 1 }}>{view.number}</div>
          </div>

          <div className="sl-row">
            <div className="sl-box">
              <b>From branch</b>
              <div className="sl-big">{view.origin || "-"}</div>
            </div>
            <div className="sl-box">
              <b>To branch</b>
              <div className="sl-big">{view.destination || "-"}</div>
            </div>
          </div>

          <div className="sl-box" style={{ marginTop: 5 }}>
            <b>Deliver to</b>
            <div className="sl-big">{view.receiverName || "-"}</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{view.receiverPhone || ""}</div>
            <div>{view.receiverAddress || "-"}</div>
          </div>

          <div className="sl-box" style={{ marginTop: 5 }}>
            <b>Sender</b>
            <div style={{ fontWeight: 700 }}>{view.senderName || view.merchant || "-"}</div>
            <div>{[view.senderPhone, view.senderAddress].filter(Boolean).join(" · ")}</div>
            {view.orderId ? <div>Order: {view.orderId}</div> : null}
          </div>

          <div className="sl-row">
            <div className="sl-box" style={{ background: view.isPod ? "#000" : "#fff", color: view.isPod ? "#fff" : "#000" }}>
              <span className="sl-k" style={{ color: view.isPod ? "#fff" : "#444" }}>{view.isPod ? "Collect (POD)" : "Prepaid"}</span>
              <div className="sl-big">{view.isPod ? money(view.collect) : "Do not collect"}</div>
            </div>
            <div className="sl-box">
              <b>Pieces / Weight</b>
              <div className="sl-big">
                {view.qty} pc{Number(view.qty) === 1 ? "" : "s"}
                {view.weight ? ` · ${view.weight} kg` : ""}
              </div>
            </div>
          </div>

          {view.fragile || view.description ? (
            <div style={{ marginTop: 5 }}>
              {view.fragile ? <span style={{ border: "1.5px solid #000", padding: "1px 6px", fontWeight: 800, marginRight: 6 }}>FRAGILE</span> : null}
              {view.description ? <span>{String(view.description).slice(0, 120)}</span> : null}
            </div>
          ) : null}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8 }}>
            <div style={{ fontSize: 9, color: "#555" }}>
              Booked {view.created ? new Date(view.created).toLocaleDateString("en-GB") : "-"}
              <br />
              Printed {new Date().toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
            </div>
            <QRCodeSVG value={view.number} size={64} />
          </div>
        </div>
      )}
    </div>
  );
}
