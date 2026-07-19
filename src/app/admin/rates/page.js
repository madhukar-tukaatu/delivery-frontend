"use client";
import { useState } from "react";
import api from "@/lib/api";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  SimpleTablePage,
  StatusTag,
  message,
} from "@/components/PageTools";
export default function RatesPage() {
  const [cardOpen, setCardOpen] = useState(false);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [cardForm] = Form.useForm();
  const [ruleForm] = Form.useForm();
  const cardColumns = [
    { title: "Name", dataIndex: "name" },
    { title: "Code", dataIndex: "code" },
    { title: "Rules", dataIndex: "rules_count" },
    {
      title: "Status",
      dataIndex: "status",
      render: (v) => <StatusTag value={v} />,
    },
  ];
  const ruleColumns = [
    { title: "Card", dataIndex: "rate_card_id" },
    { title: "Origin", dataIndex: "origin_city" },
    { title: "Destination", dataIndex: "destination_city" },
    { title: "Weight", render: (_, r) => `${r.min_weight}-${r.max_weight}` },
    { title: "Base", dataIndex: "base_charge" },
    { title: "POD %", dataIndex: "pod_percent" },
    {
      title: "Status",
      dataIndex: "status",
      render: (v) => <StatusTag value={v} />,
    },
  ];
  async function createCard(values) {
    await api.post("/admin/rate-cards", values);
    message.success("Rate card created");
    setCardOpen(false);
    setRefresh(Date.now());
  }
  async function createRule(values) {
    await api.post("/admin/rate-rules", values);
    message.success("Rate rule created");
    setRuleOpen(false);
    setRefresh(Date.now());
  }
  return (
    <>
      <SimpleTablePage
        title="Rate Cards"
        endpoint="/admin/rate-cards"
        columns={cardColumns}
        reloadKey={refresh}
        extra={
          <Button type="primary" onClick={() => setCardOpen(true)}>
            Add Card
          </Button>
        }
      />
      <div style={{ height: 16 }} />
      <SimpleTablePage
        title="Rate Rules"
        endpoint="/admin/rate-rules"
        columns={ruleColumns}
        reloadKey={refresh}
        extra={
          <Button type="primary" onClick={() => setRuleOpen(true)}>
            Add Rule
          </Button>
        }
      />
      <Modal
        open={cardOpen}
        title="Add Rate Card"
        onCancel={() => setCardOpen(false)}
        onOk={() => cardForm.submit()}
      >
        <Form form={cardForm} layout="vertical" onFinish={createCard}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="code" label="Code" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        open={ruleOpen}
        title="Add Rate Rule"
        onCancel={() => setRuleOpen(false)}
        onOk={() => ruleForm.submit()}
      >
        <Form form={ruleForm} layout="vertical" onFinish={createRule}>
          <Form.Item
            name="rate_card_id"
            label="Rate Card ID"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="origin_city" label="Origin City">
            <Input />
          </Form.Item>
          <Form.Item name="destination_city" label="Destination City">
            <Input />
          </Form.Item>
          <Form.Item
            name="min_weight"
            label="Min Weight"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="max_weight"
            label="Max Weight"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="base_charge"
            label="Base Charge"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="extra_per_kg" label="Extra Per KG">
            <Input />
          </Form.Item>
          <Form.Item name="pod_percent" label="POD Percent">
            <Input />
          </Form.Item>
          <Form.Item name="pod_fixed" label="POD Fixed">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
