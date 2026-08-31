"use client";

import { useEffect, useState } from "react";

import { Button, Card, Space, Table, Tag, Typography, message } from "antd";

import {
  EnvironmentOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

import { useRouter } from "next/navigation";

import {
  staffAcceptPickup,
  staffArrivePickup,
  staffCompletePickup,
  staffGetPickups,
} from "@/services/pickupService";

const { Text } = Typography;

function statusTag(status) {
  if (!status) {
    return "-";
  }

  return <Tag>{String(status).replaceAll("_", " ").toUpperCase()}</Tag>;
}

function shipmentCount(record) {
  if (Array.isArray(record.shipments)) {
    return record.shipments.length;
  }

  return record.shipment_count ?? 0;
}

export default function StaffPickupsPage() {
  const router = useRouter();

  const [rows, setRows] = useState([]);

  const [loading, setLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);

      const result = await staffGetPickups();

      setRows(Array.isArray(result) ? result : []);
    } catch (error) {
      message.error(
        error?.response?.data?.message || "Could not load pickups.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function run(action, successMessage) {
    try {
      setActionLoading(true);

      await action();

      message.success(successMessage);

      await load();
    } catch (error) {
      message.error(error?.response?.data?.message || "Pickup action failed.");
    } finally {
      setActionLoading(false);
    }
  }

  function renderActions(record) {
    const status = record.status;

    return (
      <Space wrap>
        <Button
          icon={<EyeOutlined />}
          onClick={() => router.push(`/staff/pickups/${record.id}`)}
        >
          View
        </Button>

        {status === "assigned" ? (
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            loading={actionLoading}
            onClick={() =>
              run(() => staffAcceptPickup(record.id), "Pickup started.")
            }
          >
            Start Pickup
          </Button>
        ) : null}

        {status === "started" ? (
          <Button
            type="primary"
            icon={<EnvironmentOutlined />}
            loading={actionLoading}
            onClick={() =>
              run(() => staffArrivePickup(record.id), "Arrival recorded.")
            }
          >
            Arrived
          </Button>
        ) : null}

        {status === "collecting" ? (
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={actionLoading}
            onClick={() =>
              run(() => staffCompletePickup(record.id), "Pickup completed.")
            }
          >
            Complete
          </Button>
        ) : null}
      </Space>
    );
  }

  return (
    <Card
      title="Pickup Jobs"
      extra={
        <Button icon={<ReloadOutlined />} loading={loading} onClick={load}>
          Refresh
        </Button>
      }
    >
      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        scroll={{
          x: 1100,
        }}
        columns={[
          {
            title: "Pickup Request",

            key: "request_number",

            render: (_, record) => (
              <Button
                type="link"
                style={{
                  padding: 0,
                }}
                onClick={() => router.push(`/staff/pickups/${record.id}`)}
              >
                {record.request_number || `#${record.id}`}
              </Button>
            ),
          },

          {
            title: "Merchant",

            key: "merchant",

            render: (_, record) =>
              record.merchant?.name || record.merchant_name || "-",
          },

          {
            title: "Pickup Location",

            key: "pickup_location",

            render: (_, record) => (
              <Space direction="vertical" size={0}>
                <Text strong>
                  {record.pickupLocation?.name ||
                    record.pickup_location?.name ||
                    record.pickup_name ||
                    "-"}
                </Text>

                <Text type="secondary">{record.pickup_phone || "-"}</Text>
              </Space>
            ),
          },

          {
            title: "Shipments",

            key: "shipments",

            render: (_, record) => shipmentCount(record),
          },

          {
            title: "Status",

            dataIndex: "status",

            key: "status",

            render: statusTag,
          },

          {
            title: "Actions",

            key: "actions",

            fixed: "right",

            render: (_, record) => renderActions(record),
          },
        ]}
      />
    </Card>
  );
}
