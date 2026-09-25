"use client";

import {
  PercentageOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  InputNumber,
  Row,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import api from "@/lib/api";

const { Title, Text, Paragraph } = Typography;

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? response;
}

export default function HqCommissionsPage() {
  const [summary, setSummary] = useState(null);
  const [bills, setBills] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  async function load() {
    setLoading(true);
    try {
      const [sumRes, billsRes, setRes, settingsRes] = await Promise.all([
        api.get("/admin/hq-commissions/summary"),
        api.get("/admin/hq-commissions/bills", { params: { per_page: 50 } }),
        api.get("/admin/hq-commissions/settlements", { params: { per_page: 50 } }),
        api.get("/admin/hq-commissions/settings"),
      ]);
      setSummary(unwrap(sumRes));
      const b = unwrap(billsRes);
      setBills(b?.data || b || []);
      const s = unwrap(setRes);
      setSettlements(s?.data || s || []);
      const settings = unwrap(settingsRes);
      form.setFieldsValue({ hq_percent: settings?.hq_percent ?? 5 });
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to load HQ commissions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveRate(values) {
    try {
      await api.post("/admin/hq-commissions/settings", values);
      message.success("Commission % saved.");
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Save failed.");
    }
  }

  async function createSettlement(branchId) {
    try {
      await api.post("/admin/hq-commissions/settlements", { branch_id: branchId });
      message.success("Settlement batch created.");
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Create settlement failed.");
    }
  }

  async function markPaid(id) {
    try {
      await api.post(`/admin/hq-commissions/settlements/${id}/mark-paid`, {});
      message.success("Marked paid to Tukaatu Express.");
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Mark paid failed.");
    }
  }

  async function payHamro(id) {
    try {
      const res = await api.post(`/admin/hq-commissions/settlements/${id}/pay-hamropay`, {});
      message.success("HamroPay session created (branch pays company).");
      console.info("HQ HamroPay", unwrap(res));
      load();
    } catch (e) {
      message.error(
        e?.response?.data?.message ||
          "Pay failed. Ensure branch + company HamroPay accounts are saved."
      );
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <AdminPageHeader
        title="HQ Commissions"
        subtitle="Branch commission bills payable to Tukaatu Express."
        icon={<PercentageOutlined />}
        actions={
          <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
        }
      />

      <Alert
        type="info"
        showIcon
        message="Tukaatu Express HQ billing"
        description={
          <Paragraph style={{ marginBottom: 0 }}>
            After each successful delivery, the destination branch owes HQ a commission
            (default {summary?.hq_percent ?? 5}% of checkout delivery charge). Branches
            settle that to the company HamroPay account. This is separate from merchant
            POD cash and merchant delivery-fee invoices.
          </Paragraph>
        }
      />

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card loading={loading} title="Unpaid (branches owe HQ)">
            <Title level={3} style={{ margin: 0 }}>
              Rs. {Number(summary?.unpaid_amount || 0).toFixed(2)}
            </Title>
            <Text type="secondary">{summary?.unpaid_count || 0} bills</Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card loading={loading} title="Processing">
            <Title level={3} style={{ margin: 0 }}>
              Rs. {Number(summary?.processing_amount || 0).toFixed(2)}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card loading={loading} title="Paid to HQ">
            <Title level={3} style={{ margin: 0 }}>
              Rs. {Number(summary?.paid_amount || 0).toFixed(2)}
            </Title>
          </Card>
        </Col>
      </Row>

      <Card title="Commission rate (superadmin)">
        <Form form={form} layout="inline" onFinish={saveRate}>
          <Form.Item
            name="hq_percent"
            label="HQ % of delivery charge"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} max={100} step={0.1} />
          </Form.Item>
          <Button type="primary" htmlType="submit">
            Save
          </Button>
        </Form>
      </Card>

      <Card title="Per-delivery HQ commission bills" loading={loading}>
        <Table
          rowKey="id"
          dataSource={bills}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: "Bill", dataIndex: "bill_number" },
            { title: "Branch", dataIndex: "branch_id" },
            { title: "Shipment", dataIndex: "shipment_id" },
            { title: "Delivery base", dataIndex: "delivery_charge_base" },
            {
              title: "Rate %",
              dataIndex: "commission_rate",
              render: (v) => `${v}%`,
            },
            { title: "Commission", dataIndex: "commission_amount" },
            {
              title: "Status",
              dataIndex: "status",
              render: (v) => <Tag>{v}</Tag>,
            },
            {
              title: "Action",
              render: (_, r) =>
                r.status === "unpaid" ? (
                  <Button size="small" onClick={() => createSettlement(r.branch_id)}>
                    Settle branch unpaid
                  </Button>
                ) : null,
            },
          ]}
        />
      </Card>

      <Card title="HQ commission settlements (branch -> company)" loading={loading}>
        <Table
          rowKey="id"
          dataSource={settlements}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: "Number", dataIndex: "settlement_number" },
            { title: "Branch", dataIndex: "branch_id" },
            { title: "Payable", dataIndex: "final_payable_amount" },
            {
              title: "Status",
              dataIndex: "status",
              render: (v) => <Tag color={v === "paid" ? "green" : "orange"}>{v}</Tag>,
            },
            {
              title: "Action",
              render: (_, r) => (
                <Space>
                  <Button
                    type="primary"
                    size="small"
                    disabled={r.status === "paid"}
                    onClick={() => payHamro(r.id)}
                  >
                    Pay via HamroPay
                  </Button>
                  <Button
                    size="small"
                    disabled={r.status === "paid"}
                    onClick={() => markPaid(r.id)}
                  >
                    Mark paid
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
}
