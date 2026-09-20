"use client";

import { useEffect, useState } from "react";
import { Button, Card, Space, Table, Tag, message } from "antd";
import api from "@/lib/api";

function unwrap(r) {
  return r?.data?.data ?? r?.data ?? r;
}

export default function MerchantInvoicesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/merchant/invoices", { params: { per_page: 50 } });
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

  async function pay(id) {
    try {
      const res = await api.post(`/merchant/invoices/${id}/pay-hamropay`, {});
      message.success("Open HamroPay checkout to pay the branch delivery bill.");
      console.info(unwrap(res));
    } catch (e) {
      message.error(e?.response?.data?.message || "Pay failed");
    }
  }

  return (
    <Card title="My invoices (pay delivery charges to branch)" loading={loading}>
      <Table
        rowKey="id"
        dataSource={rows}
        columns={[
          { title: "Invoice", dataIndex: "invoice_number" },
          { title: "Type", dataIndex: "type" },
          { title: "Total", dataIndex: "total_amount" },
          {
            title: "Status",
            dataIndex: "status",
            render: (v) => <Tag color={v === "paid" ? "green" : "orange"}>{v}</Tag>,
          },
          {
            title: "Action",
            render: (_, r) =>
              r.status !== "paid" && r.type === "delivery_charges" ? (
                <Button type="primary" onClick={() => pay(r.id)}>
                  Pay via HamroPay
                </Button>
              ) : (
                "-"
              ),
          },
        ]}
      />
    </Card>
  );
}
