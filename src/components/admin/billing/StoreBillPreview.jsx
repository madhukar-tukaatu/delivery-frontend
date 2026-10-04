"use client";

import { useState } from "react";
import { Button, Descriptions, Drawer, Table, Typography } from "antd";
import { formatMerchantLabel } from "@/lib/merchantLabel";

const { Paragraph, Text } = Typography;

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function storeBillEmail(invoice) {
  const payer = String(invoice?.payer_type || "merchant").toLowerCase();
  const tracking = invoice?.tracking_number || invoice?.shipment?.tracking_number || "";
  const number = invoice?.invoice_number || "";
  const amount = money(invoice?.total_amount);
  const company = payer === "company";
  const who = invoice?.marketplace_name || "marketplace";
  const subject = company
    ? `Marketplace free delivery bill ${number} (${who})`
    : `Delivery charge bill ${number}`;
  const dueTo = company ? "marketplace (tukaatu.com)" : "branch";
  const body = [
    `Delivery charge bill for shipment ${tracking}.`,
    `Invoice: ${number}`,
    `Amount due to ${dueTo}: Rs. ${amount}`,
    "(This is separate from POD cash and from HQ commission.)",
  ].join("\n");
  return {
    canSend: tracking !== "",
    subject,
    body,
    digestStatement: [
      "Shipments: 1",
      `Total amount due: Rs. ${amount}`,
      `- ${number} | Shipment: ${tracking || "N/A"} | Amount: Rs. ${amount}`,
    ].join("\n"),
  };
}

export function deliveryCount(invoice) {
  if (invoice?.delivery_count != null && invoice.delivery_count !== "") {
    return Number(invoice.delivery_count);
  }
  if (String(invoice?.type || "") !== "delivery_charges") return 0;
  if (invoice?.shipment_id || invoice?.tracking_number || invoice?.shipment?.tracking_number) return 1;
  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  return items.filter((item) => !String(item?.description || "").startsWith("POD service fee")).length;
}

export function ViewBillButton({ invoice, size = "small" }) {
  const [open, setOpen] = useState(false);
  if (!invoice || String(invoice.type || "delivery_charges") !== "delivery_charges") return null;
  return (
    <>
      <Button size={size} onClick={() => setOpen(true)}>
        View bill
      </Button>
      <StoreBillDrawer invoice={invoice} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function StoreBillDrawer({ invoice, open, onClose }) {
  const email = storeBillEmail(invoice || {});
  const lines = Array.isArray(invoice?.items) ? invoice.items : [];
  const billDate = invoice?.invoice_date ? String(invoice.invoice_date).slice(0, 10) : "-";
  const count = deliveryCount(invoice);

  return (
    <Drawer
      title={`Store bill ${invoice?.invoice_number || ""}`}
      open={open}
      onClose={onClose}
      width={520}
      destroyOnClose
    >
      <Text strong>Email Send bill actually sends</Text>
      <Paragraph type="secondary" style={{ marginBottom: 8 }}>
        Plain text. One delivery per bill. Daily and weekly digests are a separate email: subject
        Daily Delivery Charges Summary or Weekly Delivery Charges Summary, one line per unpaid bill, then a total.
      </Paragraph>
      {email.canSend ? (
        <>
          <Text type="secondary">Subject</Text>
          <Paragraph style={{ marginTop: 0 }} copyable>
            {email.subject}
          </Paragraph>
          <Text type="secondary">Body</Text>
          <pre style={{ whiteSpace: "pre-wrap", background: "#fafafa", padding: 12, marginTop: 4 }}>
            {email.body}
          </pre>
          <Text type="secondary">Statement line for this bill</Text>
          <pre style={{ whiteSpace: "pre-wrap", background: "#fafafa", padding: 12, marginTop: 4 }}>
            {email.digestStatement}
          </pre>
        </>
      ) : (
        <Paragraph type="warning">
          This bill is not emailed. Send bill stops when the shipment (tracking number) is missing.
        </Paragraph>
      )}

      <Text strong>Bill on file</Text>
      <Paragraph type="secondary" style={{ marginBottom: 8 }}>
        The email does not list these lines. It only names the shipment, invoice number, and amount due.
      </Paragraph>
      <Descriptions size="small" column={1} bordered>
        <Descriptions.Item label="Merchant">
          {String(invoice?.payer_type || "").toLowerCase() === "company"
            ? "Marketplace bill (not the store)"
            : formatMerchantLabel(invoice)}
        </Descriptions.Item>
        <Descriptions.Item label="Deliveries on this bill">{count}</Descriptions.Item>
        <Descriptions.Item label="Marketplace">{invoice?.marketplace_name || "-"}</Descriptions.Item>
        <Descriptions.Item label="Bill to">{invoice?.bill_to || "-"}</Descriptions.Item>
        <Descriptions.Item label="Bill date">{billDate}</Descriptions.Item>
        <Descriptions.Item label="Subtotal">{invoice?.subtotal ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="Total due">{invoice?.total_amount ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="Status">{invoice?.status || "-"}</Descriptions.Item>
      </Descriptions>
      <Table
        style={{ marginTop: 12 }}
        size="small"
        pagination={false}
        rowKey={(row) => String(row.id ?? row.description)}
        dataSource={lines}
        locale={{ emptyText: "No line items stored on this bill." }}
        columns={[
          { title: "Tracking / charge", dataIndex: "description" },
          { title: "Bill date", render: () => billDate },
          { title: "Qty", dataIndex: "quantity", width: 56 },
          { title: "Charge", dataIndex: "total", width: 80 },
        ]}
      />
    </Drawer>
  );
}
