"use client";

import { useEffect, useState } from "react";
import { Button, Card, Space, Table, Tag, message } from "antd";
import api from "@/lib/api";

function unwrap(r) {
  return r?.data?.data ?? r?.data ?? r;
}

export default function AdminInvoicesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/admin/invoices", { params: { per_page: 50 } });
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
      message.success("HamroPay session created (merchant → branch)");
      console.info(unwrap(res));
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Pay failed");
    }
  }

  return (
    <Card title="Invoices (delivery fees + others)" loading={loading}>
      <Table
        rowKey="id"
        dataSource={rows}
        columns={[
          { title: "Invoice", dataIndex: "invoice_number" },
          { title: "Type", dataIndex: "type" },
          { title: "Merchant", dataIndex: "merchant_id" },
          { title: "Branch", dataIndex: "branch_id" },
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
                {r.type === "delivery_charges" && r.status !== "paid" ? (
                  <Button size="small" type="primary" onClick={() => payHamro(r.id)}>
                    Pay via HamroPay → branch
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
  );
}
