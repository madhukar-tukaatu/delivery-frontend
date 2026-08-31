"use client";

import { useCallback, useEffect, useState } from "react";

import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";

import {
  CheckCircleOutlined,
  EnvironmentOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";

import {
  staffAcceptPickup,
  staffArrivePickup,
  staffCompletePickup,
  staffGetPickups,
  staffStartPickup,
} from "@/services/deliveryOperationsApi";

const { Text } = Typography;

function getStatusColor(status) {
  switch (String(status || "").toLowerCase()) {
    case "assigned":
      return "blue";

    case "accepted":
      return "cyan";

    case "started":
    case "in_progress":
      return "processing";

    case "arrived":
      return "gold";

    case "completed":
    case "picked_up":
      return "green";

    case "failed":
    case "cancelled":
      return "red";

    default:
      return "default";
  }
}

function formatStatus(status) {
  if (!status) {
    return "-";
  }

  return String(status)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

export default function StaffPickupsPage() {
  const [rows, setRows] = useState([]);

  const [loading, setLoading] =
    useState(false);

  const [selectedPickup, setSelectedPickup] =
    useState(null);

  const [detailsOpen, setDetailsOpen] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(false);

  const load = useCallback(
    async () => {
      try {
        setLoading(true);

        const data =
          await staffGetPickups();

        setRows(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (error) {
        console.error(error);

        message.error(
          error?.response?.data?.message ||
          "Could not load pickups."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  async function run(
    action,
    successMessage
  ) {
    try {
      setActionLoading(true);

      await action();

      message.success(
        successMessage ||
        "Pickup updated successfully."
      );

      await load();

      setDetailsOpen(false);
      setSelectedPickup(null);
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

  function openDetails(record) {
    setSelectedPickup(record);
    setDetailsOpen(true);
  }

  function confirmComplete(record) {
    Modal.confirm({
      title: "Complete pickup?",
      content:
        "Confirm that the shipment(s) have been collected from the merchant.",
      okText: "Complete Pickup",
      okButtonProps: {
        type: "primary",
      },
      onOk: () =>
        run(
          () =>
            staffCompletePickup(
              record.id,
              {
                note:
                  "Pickup completed by staff.",
              }
            ),
          "Pickup completed successfully."
        ),
    });
  }

  function renderActions(record) {
    const status =
      String(
        record.status || ""
      ).toLowerCase();

    if (
      status === "assigned"
    ) {
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
                staffAcceptPickup(
                  record.id
                ),
              "Pickup accepted."
            )
          }
        >
          Accept
        </Button>
      );
    }

    if (
      status === "accepted"
    ) {
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
                staffStartPickup(
                  record.id
                ),
              "Pickup started."
            )
          }
        >
          Start
        </Button>
      );
    }

    if (
      status === "started" ||
      status === "in_progress"
    ) {
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
                staffArrivePickup(
                  record.id
                ),
              "Arrival recorded."
            )
          }
        >
          Arrived
        </Button>
      );
    }

    if (
      status === "arrived"
    ) {
      return (
        <Button
          type="primary"
          icon={
            <CheckCircleOutlined />
          }
          loading={actionLoading}
          onClick={() =>
            confirmComplete(record)
          }
        >
          Complete
        </Button>
      );
    }

    return null;
  }

  const columns = [
    {
      title: "Tracking",
      dataIndex: "tracking_number",
      key: "tracking_number",
      render: (value, record) =>
        value ||
        record.shipment?.tracking_number ||
        "-",
    },

    {
      title: "Merchant",
      dataIndex: "merchant_name",
      key: "merchant_name",
      render: (value, record) =>
        value ||
        record.merchant?.name ||
        "-",
    },

    {
      title: "Customer",
      dataIndex: "customer_name",
      key: "customer_name",
      render: (value, record) =>
        value ||
        record.shipment?.customer_name ||
        "-",
    },

    {
      title: "Phone",
      dataIndex: "customer_phone",
      key: "customer_phone",
      render: (value, record) =>
        value ||
        record.shipment?.customer_phone ||
        "-",
    },

    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => (
        <Tag
          color={getStatusColor(
            value
          )}
        >
          {formatStatus(value)}
        </Tag>
      ),
    },

    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Space>
          <Button
            onClick={() =>
              openDetails(record)
            }
          >
            View
          </Button>

          {renderActions(record)}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title="My Pickup Jobs"
        extra={
          <Button
            onClick={load}
            loading={loading}
          >
            Refresh
          </Button>
        }
      >
        {rows.length || loading ? (
          <Table
            rowKey="id"
            loading={loading}
            dataSource={rows}
            columns={columns}
            pagination={{
              pageSize: 20,
            }}
            scroll={{
              x: 1000,
            }}
          />
        ) : (
          <Empty
            description="No pickup jobs assigned to you."
          />
        )}
      </Card>

      <Drawer
        title="Pickup Details"
        open={detailsOpen}
        width={600}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedPickup(null);
        }}
      >
        {selectedPickup ? (
          <>
            <Descriptions
              bordered
              column={1}
            >
              <Descriptions.Item label="Tracking">
                {selectedPickup.tracking_number ||
                  selectedPickup.shipment
                    ?.tracking_number ||
                  "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Merchant">
                {selectedPickup.merchant_name ||
                  selectedPickup.merchant
                    ?.name ||
                  "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Customer">
                {selectedPickup.customer_name ||
                  selectedPickup.shipment
                    ?.customer_name ||
                  "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Phone">
                {selectedPickup.customer_phone ||
                  selectedPickup.shipment
                    ?.customer_phone ||
                  "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Address">
                {selectedPickup.pickup_address ||
                  selectedPickup.address ||
                  selectedPickup.merchant
                    ?.address ||
                  "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Status">
                <Tag
                  color={getStatusColor(
                    selectedPickup.status
                  )}
                >
                  {formatStatus(
                    selectedPickup.status
                  )}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <div
              style={{
                marginTop: 24,
              }}
            >
              <Text strong>
                Pickup Actions
              </Text>

              <div
                style={{
                  marginTop: 12,
                }}
              >
                {renderActions(
                  selectedPickup
                )}
              </div>
            </div>
          </>
        ) : (
          <Empty />
        )}
      </Drawer>
    </>
  );
}