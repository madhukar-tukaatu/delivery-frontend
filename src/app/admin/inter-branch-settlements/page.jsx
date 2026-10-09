"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { SwapOutlined, ReloadOutlined, MailOutlined, ThunderboltOutlined } from "@ant-design/icons";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import BranchScopeNotice, { useIsFinanceHq } from "@/components/admin/billing/BranchScopeNotice";
import { usePermissions } from "@/hooks/usePermission";
import api from "@/lib/api";

const { Text, Paragraph } = Typography;

function unwrap(r) {
  return r?.data?.data ?? r?.data ?? r;
}

const money = (v) => `Rs ${Number(v || 0).toFixed(2)}`;
const STATUS_COLORS = { draft: "default", issued: "orange", paid: "blue", received: "green" };
const errText = (e, fallback) => {
  const errors = e?.response?.data?.errors;
  return (errors && Object.values(errors).flat()[0]) || e?.response?.data?.message || fallback;
};

export default function InterBranchSettlementsPage() {
  const isHq = useIsFinanceHq();
  const { branchId } = usePermissions();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });
  const [status, setStatus] = useState();
  const [direction, setDirection] = useState();
  const [genRange, setGenRange] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [detail, setDetail] = useState(null);
  const [payRef, setPayRef] = useState({ open: false, id: null, ref: "" });

  async function load(page = 1, pageSize = pagination.pageSize) {
    setLoading(true);
    try {
      const p = unwrap(await api.get("/admin/inter-branch-settlements", { params: { page, per_page: pageSize, status, direction } }));
      setRows(p?.data || []);
      setPagination({ current: p?.current_page || page, pageSize: p?.per_page || pageSize, total: p?.total || 0 });
    } catch (e) {
      message.error(errText(e, "Could not load statements."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, direction]);

  async function openDetail(id) {
    try {
      setDetail(unwrap(await api.get(`/admin/inter-branch-settlements/${id}`)));
    } catch (e) {
      message.error(errText(e, "Could not load statement."));
    }
  }

  async function generate(period) {
    setGenerating(true);
    try {
      const body = genRange?.[0]
        ? { from: genRange[0].format("YYYY-MM-DD"), to: genRange[1].format("YYYY-MM-DD") }
        : { period };
      const res = await api.post("/admin/inter-branch-settlements/generate", body);
      message.success(res?.data?.message || "Statements generated.");
      load(1);
    } catch (e) {
      message.error(errText(e, "Generate failed."));
    } finally {
      setGenerating(false);
    }
  }

  async function act(id, action, body = {}, okMsg = "Done") {
    try {
      const res = await api.post(`/admin/inter-branch-settlements/${id}/${action}`, body);
      const d = unwrap(res);
      if (action === "send-email" && d?.to) message.success(`Emailed to ${d.to.join(", ")}`);
      else if (action === "pay-hamropay") {
        message.success("HamroPay session created. Finish the payment, then mark it paid.");
        if (d?.gateway_url && d?.checkout) console.info("Inter-branch HamroPay", d);
      } else message.success(okMsg);
      load(pagination.current);
      if (detail?.id === id) openDetail(id);
    } catch (e) {
      message.error(errText(e, "Action failed."));
    }
  }

  const mine = (id) => isHq || Number(id) === Number(branchId);

  const columns = [
    {
      title: "Statement",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <a onClick={() => openDetail(r.id)}>{r.statement_number}</a>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {String(r.period_start || "").slice(0, 10)} to {String(r.period_end || "").slice(0, 10)}
          </Text>
        </Space>
      ),
    },
    {
      title: "Pays (collected the fare)",
      render: (_, r) => r.from_branch?.name || `#${r.from_branch_id}`,
    },
    {
      title: "Receives",
      render: (_, r) => r.to_branch?.name || `#${r.to_branch_id}`,
    },
    { title: "Parcels", dataIndex: "line_count", align: "right" },
    { title: "Amount", dataIndex: "total_amount", align: "right", render: (v) => <Text strong>{money(v)}</Text> },
    { title: "Status", dataIndex: "status", render: (v) => <Tag color={STATUS_COLORS[v]}>{v}</Tag> },
    {
      title: "Actions",
      render: (_, r) => (
        <Space wrap size={4}>
          {r.status === "draft" && mine(r.from_branch_id) ? (
            <Button size="small" onClick={() => act(r.id, "issue", {}, "Statement issued.")}>Issue</Button>
          ) : null}
          {["draft", "issued"].includes(r.status) && mine(r.from_branch_id) ? (
            <>
              <Button size="small" type="primary" onClick={() => act(r.id, "pay-hamropay")}>Pay via HamroPay</Button>
              <Button size="small" onClick={() => setPayRef({ open: true, id: r.id, ref: "" })}>Mark paid</Button>
            </>
          ) : null}
          {["issued", "paid"].includes(r.status) && mine(r.to_branch_id) ? (
            <Popconfirm title="Confirm the money reached your branch?" onConfirm={() => act(r.id, "mark-received", {}, "Marked received.")}>
              <Button size="small" type="primary" ghost>Mark received</Button>
            </Popconfirm>
          ) : null}
          <Button size="small" icon={<MailOutlined />} onClick={() => act(r.id, "send-email")}>Email</Button>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <AdminPageHeader
        title="Inter-branch settlements"
        subtitle="The branch that collected a transfer's delivery charge pays the other branches their shares."
        icon={<SwapOutlined />}
        actions={<Button icon={<ReloadOutlined />} onClick={() => load(pagination.current)}>Refresh</Button>}
      />

      <Alert
        type="info"
        showIcon
        message="How it works"
        description={
          <Paragraph style={{ marginBottom: 0 }}>
            The origin branch bills the merchant (or Tukaatu / FCA for marketplace free delivery). Once that bill is paid,
            each other branch's share goes on a weekly statement from the origin branch. When the customer paid the
            delivery charge at the door, the delivery branch holds it and pays the others. Customer POD money is not part of this.
          </Paragraph>
        }
      />

      <BranchScopeNotice />

      <Card>
        <Space wrap>
          <Select
            allowClear
            placeholder="Status"
            style={{ width: 140 }}
            value={status}
            onChange={setStatus}
            options={["draft", "issued", "paid", "received"].map((v) => ({ label: v, value: v }))}
          />
          {!isHq ? (
            <Select
              allowClear
              placeholder="Direction"
              style={{ width: 170 }}
              value={direction}
              onChange={setDirection}
              options={[
                { label: "My branch pays", value: "payable" },
                { label: "My branch receives", value: "receivable" },
              ]}
            />
          ) : null}
          <DatePicker.RangePicker value={genRange} onChange={setGenRange} placeholder={["Generate from", "to"]} />
          <Button icon={<ThunderboltOutlined />} loading={generating} onClick={() => generate("weekly")}>
            {genRange?.[0] ? "Generate for dates" : "Generate last 7 days"}
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          columns={columns}
          scroll={{ x: 1000 }}
          pagination={{ ...pagination, onChange: (p, ps) => load(p, ps) }}
        />
      </Card>

      <Drawer open={!!detail} width={760} onClose={() => setDetail(null)} title={detail?.statement_number}>
        {detail ? (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Descriptions size="small" bordered column={2}>
              <Descriptions.Item label="Pays">{detail.from_branch?.name || `#${detail.from_branch_id}`}</Descriptions.Item>
              <Descriptions.Item label="Receives">{detail.to_branch?.name || `#${detail.to_branch_id}`}</Descriptions.Item>
              <Descriptions.Item label="Period">
                {String(detail.period_start || "").slice(0, 10)} to {String(detail.period_end || "").slice(0, 10)}
              </Descriptions.Item>
              <Descriptions.Item label="Status"><Tag color={STATUS_COLORS[detail.status]}>{detail.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="Amount">{money(detail.total_amount)}</Descriptions.Item>
              <Descriptions.Item label="Reference">{detail.payment_reference || "-"}</Descriptions.Item>
              <Descriptions.Item label="Paid">{detail.paid_at ? new Date(detail.paid_at).toLocaleString() : "-"}</Descriptions.Item>
              <Descriptions.Item label="Received">{detail.received_at ? new Date(detail.received_at).toLocaleString() : "-"}</Descriptions.Item>
            </Descriptions>
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={detail.lines || []}
              columns={[
                { title: "Shipment", render: (_, l) => <a href={`/admin/shipments/${l.shipment_id}`}>{l.shipment?.tracking_number || `#${l.shipment_id}`}</a> },
                { title: "Role", dataIndex: "role" },
                { title: "Share", dataIndex: "share_amount", align: "right", render: money },
                { title: "Transport", dataIndex: "transport_amount", align: "right", render: money },
                { title: "Extra km", dataIndex: "extra_distance_amount", align: "right", render: money },
                { title: "Amount", dataIndex: "amount", align: "right", render: (v) => <Text strong>{money(v)}</Text> },
              ]}
            />
          </Space>
        ) : null}
      </Drawer>

      <Modal
        open={payRef.open}
        title="Mark statement paid"
        okText="Mark paid"
        onCancel={() => setPayRef({ open: false, id: null, ref: "" })}
        onOk={async () => {
          await act(payRef.id, "mark-paid", { payment_reference: payRef.ref || undefined }, "Marked paid.");
          setPayRef({ open: false, id: null, ref: "" });
        }}
      >
        <Input
          placeholder="Payment reference (bank / HamroPay txn)"
          value={payRef.ref}
          onChange={(e) => setPayRef((p) => ({ ...p, ref: e.target.value }))}
        />
      </Modal>
    </Space>
  );
}
