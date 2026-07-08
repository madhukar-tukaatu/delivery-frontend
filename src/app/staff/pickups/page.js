"use client";

import { useEffect, useState } from "react";
import { Button, Card, Space, Table, Tag, message } from "antd";
import { staffAcceptPickup, staffGetPickups, staffPickedUp } from "@/services/deliveryOperationsApi";

export default function StaffPickupsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try { setRows(await staffGetPickups()); } catch { message.error("Could not load pickups."); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function run(action) {
    try { await action(); message.success("Updated."); load(); } catch (e) { message.error(e?.response?.data?.message || "Action failed."); }
  }

  return <Card title="Pickup Jobs">
    <Table rowKey="id" loading={loading} dataSource={rows} columns={[
      { title: "Tracking", dataIndex: "tracking_number" },
      { title: "Customer", dataIndex: "customer_name" },
      { title: "Phone", dataIndex: "customer_phone" },
      { title: "Status", dataIndex: "status", render: (v) => <Tag>{v}</Tag> },
      { title: "Action", render: (_, r) => <Space>
        <Button disabled={r.status !== "assigned"} onClick={() => run(() => staffAcceptPickup(r.id))}>Accept</Button>
        <Button type="primary" disabled={!['accepted','assigned'].includes(r.status)} onClick={() => run(() => staffPickedUp(r.id, "Picked up by staff"))}>Mark Picked Up</Button>
      </Space> },
    ]} />
  </Card>;
}
