"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  Button,
  Card,
  Empty,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";

import {
  EnvironmentOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";

import {
  getStaffPickups,
  startStaffPickup,
  arriveStaffPickup,
  completeStaffPickup,
} from "@/services/deliveryOperationsApi";

const {
  Text,
} = Typography;

function statusColor(status) {
  switch (status) {
    case "assigned":
      return "blue";

    case "started":
      return "processing";

    case "arrived":
      return "orange";

    case "collecting":
      return "gold";

    case "completed":
      return "green";

    case "failed":
      return "red";

    default:
      return "default";
  }
}

function statusLabel(status) {
  return String(
    status || "-"
  )
    .replaceAll("_", " ")
    .toUpperCase();
}

export default function StaffPickupsPage() {
  const [rows, setRows] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(false);

  async function load() {
    try {
      setLoading(true);

      const result =
        await getStaffPickups();

      setRows(
        Array.isArray(result)
          ? result
          : result?.list ?? []
      );
    } catch (error) {
      console.error(error);

      message.error(
        error?.response?.data?.message ||
          "Couldnt load pickups."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function run(
    action,
    successMessage
  ) {
    try {
      setActionLoading(true);

      await action();

      message.success(
        successMessage
      );

      await load();
    } catch (error) {
      console.error(error);

      message.error(
        error?.response?.data?.message ||
          "Action failed."
      );
    } finally {
      setActionLoading(false);
    }
  }

  function renderAction(record) {
    switch (record.status) {
      case "assigned":
        return (
          <Button
            type="primary"
            icon={
              <PlayCircleOutlined />
            }
            loading={actionLoading}
            onClick={() =>
              run(
                () =>
                  startStaffPickup(
                    record.id
                  ),
                "Pickup started."
              )
            }
          >
            Start Pickup
          </Button>
        );

      case "started":
        return (
          <Button
            type="primary"
            icon={
              <EnvironmentOutlined />
            }
            loading={actionLoading}
            onClick={() =>
              run(
                () =>
                  arriveStaffPickup(
                    record.id
                  ),
                "Marked as arrived."
              )
            }
          >
            Mark Arrived
          </Button>
        );

      case "arrived":
      case "collecting":
        return (
          <Button
            type="primary"
            icon={
              <CheckCircleOutlined />
            }
            loading={actionLoading}
            onClick={() =>
              run(
                () =>
                  completeStaffPickup(
                    record.id
                  ),
                "Pickup completed."
              )
            }
          >
            Complete Pickup
          </Button>
        );

      default:
        return "-";
    }
  }

  return (
    <Card title="My Pickup Jobs">
      {rows.length ||
      loading ? (
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          scroll={{
            x: 1000,
          }}
          columns={[
            {
              title: "Pickup",
              key: "pickup",
              render: (_, record) => (
                <Space
                  direction="vertical"
                  size={0}
                >
                  <Text strong>
                    {record.request_number ||
                      record.tracking_number ||
                      `#${record.id}`}
                  </Text>

                  <Text type="secondary">
                    {record.pickup_name ||
                      record.customer_name ||
                      "-"}
                  </Text>
                </Space>
              ),
            },

            {
              title: "Phone",
              key: "phone",
              render: (_, record) =>
                record.pickup_phone ||
                record.customer_phone ||
                "-",
            },

            {
              title: "Location",
              key: "location",
              render: (_, record) =>
                record.pickupLocation?.name ||
                record.pickup_location?.name ||
                record.pickup_address ||
                "-",
            },

            {
              title: "Shipments",
              key: "shipments",
              render: (_, record) => {
                if (
                  Array.isArray(
                    record.shipments
                  )
                ) {
                  return record.shipments
                    .length;
                }

                return (
                  record.shipment_count ??
                  0
                );
              },
            },

            {
              title: "Status",
              dataIndex: "status",
              key: "status",
              render: (value) => (
                <Tag
                  color={statusColor(
                    value
                  )}
                >
                  {statusLabel(
                    value
                  )}
                </Tag>
              ),
            },

            {
              title: "Action",
              key: "action",
              fixed: "right",
              render: (_, record) =>
                renderAction(
                  record
                ),
            },
          ]}
          pagination={{
            pageSize: 20,
          }}
        />
      ) : (
        <Empty
          description="No pickup jobs assigned to you."
        />
      )}
    </Card>
  );
}