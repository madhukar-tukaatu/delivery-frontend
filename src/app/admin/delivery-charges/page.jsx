"use client";

import { FileTextOutlined } from "@ant-design/icons";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import { useEffect, useState } from "react";
import { Button, Card, Space, Table, Tag, message } from "antd";
import api from "@/lib/api";
import BranchScopeNotice from "@/components/admin/billing/BranchScopeNotice";

function unwrap(r) {
  return r?.data?.data ?? r?.data ?? r;
}

export default function AdminDeliveryChargesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/admin/delivery-charges", {
        params: { per_page: 50, type: "delivery_charges" },
      });
      const data = unwrap(res);
      setRows(data?.data || data || []);
    } catch (e) {
      message.error(e?.response?.data?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function sendBill(id) {
    try {
      const res = await api.post(`/admin/invoices/${id}/send-email`, {});
      const data = unwrap(res);
      message.success(data?.to ? `Bill sent to ${data.to}` : "Bill sent");
    } catch (e) {
      message.error(e?.response?.data?.message || "Send failed");
    }
  }

  async function markPaid(id) {
    try {
      await api.post(`/admin/invoices/${id}/mark-paid`, {});
      message.success("Marked paid");
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed");
    }
  }

  async function payHamro(id) {
    try {
      const res = await api.post(`/admin/invoices/${id}/pay-hamropay`, {});
      const data = unwrap(res);
      const host = data?.payment_api_base_url || data?.marketplace?.code || "";
      message.success(host ? `HamroPay session created (${host})` : "HamroPay session created");
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Pay failed");
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Delivery charges"
        subtitle="Store free delivery is billed and emailed to the store. Marketplace free delivery is billed and emailed to that marketplace (tukaatu.com, FCA, or any other). Payment host is the marketplace API base URL."
        icon={<FileTextOutlined />}
      />
      <BranchScopeNotice style={{ marginBottom: 12 }} />
      <Card loading={loading}>
        <Table
          rowKey="id"
          dataSource={rows}
          pagination={{ pageSize: 20 }}
          columns={[
            { title: "Invoice", dataIndex: "invoice_number" },
            { title: "Payer", dataIndex: "payer_type", render: (v) => v || "merchant" },
            { title: "Marketplace", dataIndex: "marketplace_name", render: (v, r) => v || r.marketplace_code || "-" },
            { title: "Merchant", dataIndex: "merchant_name", render: (v, r) => v || r.merchant_id || "-" },
            { title: "Bill to", dataIndex: "bill_to", render: (v) => v || "-" },
            { title: "Total", dataIndex: "total_amount" },
            {
              title: "Status",
              dataIndex: "status",
              render: (v) => <Tag color={v === "paid" ? "green" : "orange"}>{v}</Tag>,
            },
            {
              title: "Action",
              render: (_, r) => (
                <Space>
                  <Button size="small" onClick={() => sendBill(r.id)}>
                    Send bill
                  </Button>
                  {r.status !== "paid" ? (
                    <Button size="small" type="primary" onClick={() => payHamro(r.id)}>
                      Pay via HamroPay
                    </Button>
                  ) : null}
                  <Button size="small" disabled={r.status === "paid"} onClick={() => markPaid(r.id)}>
                    Mark paid
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
