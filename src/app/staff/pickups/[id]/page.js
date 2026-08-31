"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  Button,
  Card,
  Descriptions,
  Empty,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from "antd";

import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  getPickup,
  staffAcceptPickup,
  staffArrivePickup,
  staffCollectShipment,
  staffCompletePickup,
} from "@/services/pickupService";

const {
  Title,
  Text,
} = Typography;

function statusTag(status) {
  if (!status) {
    return "-";
  }

  return (
    <Tag>
      {String(status)
        .replaceAll("_", " ")
        .toUpperCase()}
    </Tag>
  );
}

export default function StaffPickupDetailPage() {
  const params =
    useParams();

  const router =
    useRouter();

  const pickupId =
    params?.id;

  const [pickup, setPickup] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  async function load() {
    if (!pickupId) {
      return;
    }

    try {
      setLoading(true);

      const result =
        await getPickup(
          pickupId
        );

      setPickup(result);
    } catch (error) {
      message.error(
        error?.response?.data?.message ||
          "Could not load pickup."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [pickupId]);

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
      message.error(
        error?.response?.data?.message ||
          "Action failed."
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <Space>
          <Spin />
          <Text>
            Loading pickup...
          </Text>
        </Space>
      </Card>
    );
  }

  if (!pickup) {
    return (
      <Card>
        <Empty description="Pickup not found" />
      </Card>
    );
  }

  const shipments =
    pickup.shipments ?? [];

  return (
    <Space
      direction="vertical"
      size={16}
      style={{
        width: "100%",
      }}
    >
      <Card>
        <Space
          direction="vertical"
          size={8}
        >
          <Button
            type="link"
            icon={
              <ArrowLeftOutlined />
            }
            style={{
              padding: 0,
            }}
            onClick={() =>
              router.push(
                "/staff/pickups"
              )
            }
          >
            Back to Pickups
          </Button>

          <Title
            level={3}
            style={{
              margin: 0,
            }}
          >
            {pickup.request_number ||
              `Pickup #${pickup.id}`}
          </Title>

          <Space>
            {statusTag(
              pickup.status
            )}

            <Button
              icon={
                <ReloadOutlined />
              }
              loading={loading}
              onClick={load}
            >
              Refresh
            </Button>
          </Space>
        </Space>
      </Card>

      <Card title="Pickup Information">
        <Descriptions
          bordered
          column={1}
          size="small"
        >
          <Descriptions.Item label="Merchant">
            {pickup.merchant?.name ||
              pickup.merchant_name ||
              "-"}
          </Descriptions.Item>

          <Descriptions.Item label="Pickup Name">
            {pickup.pickup_name ||
              "-"}
          </Descriptions.Item>

          <Descriptions.Item label="Pickup Phone">
            {pickup.pickup_phone ||
              "-"}
          </Descriptions.Item>

          <Descriptions.Item label="Pickup Location">
            {pickup.pickupLocation
              ?.name ||
              pickup.pickup_location
                ?.name ||
              "-"}
          </Descriptions.Item>

          <Descriptions.Item label="Address">
            {pickup.pickup_address ||
              pickup.address ||
              "-"}
          </Descriptions.Item>

          <Descriptions.Item label="Preferred Pickup">
            {pickup.preferred_pickup_at ||
              "-"}
          </Descriptions.Item>

          <Descriptions.Item label="Remarks">
            {pickup.remarks ||
              "-"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Pickup Actions">
        <Space wrap>
          {pickup.status ===
          "assigned" ? (
            <Button
              type="primary"
              icon={
                <PlayCircleOutlined />
              }
              loading={
                actionLoading
              }
              onClick={() =>
                run(
                  () =>
                    staffAcceptPickup(
                      pickup.id
                    ),
                  "Pickup started."
                )
              }
            >
              Start Pickup
            </Button>
          ) : null}

          {pickup.status ===
          "started" ? (
            <Button
              type="primary"
              icon={
                <EnvironmentOutlined />
              }
              loading={
                actionLoading
              }
              onClick={() =>
                run(
                  () =>
                    staffArrivePickup(
                      pickup.id
                    ),
                  "Arrival recorded."
                )
              }
            >
              Arrived at Pickup
            </Button>
          ) : null}

          {pickup.status ===
          "collecting" ? (
            <Button
              type="primary"
              icon={
                <CheckCircleOutlined />
              }
              loading={
                actionLoading
              }
              onClick={() =>
                run(
                  () =>
                    staffCompletePickup(
                      pickup.id
                    ),
                  "Pickup completed."
                )
              }
            >
              Complete Pickup
            </Button>
          ) : null}
        </Space>
      </Card>

      <Card title="Shipments to Collect">
        {shipments.length ? (
          <Table
            rowKey={(record) =>
              record.id ??
              record.shipment_id
            }
            dataSource={
              shipments
            }
            pagination={false}
            scroll={{
              x: 1000,
            }}
            columns={[
              {
                title:
                  "Tracking Number",

                key:
                  "tracking_number",

                render: (
                  _,
                  record
                ) =>
                  record.shipment
                    ?.tracking_number ||
                  record.tracking_number ||
                  "-",
              },

              {
                title:
                  "Merchant Order",

                key:
                  "merchant_order_id",

                render: (
                  _,
                  record
                ) =>
                  record.shipment
                    ?.merchant_order_id ||
                  record.merchant_order_id ||
                  "-",
              },

              {
                title:
                  "Receiver",

                key:
                  "receiver",

                render: (
                  _,
                  record
                ) => (
                  <Space
                    direction="vertical"
                    size={0}
                  >
                    <Text>
                      {record.shipment
                        ?.receiver_name ||
                        record.receiver_name ||
                        "-"}
                    </Text>

                    <Text type="secondary">
                      {record.shipment
                        ?.receiver_phone ||
                        record.receiver_phone ||
                        "-"}
                    </Text>
                  </Space>
                ),
              },

              {
                title:
                  "Shipment Status",

                key:
                  "status",

                render: (
                  _,
                  record
                ) =>
                  statusTag(
                    record.shipment
                      ?.status ||
                      record.status
                  ),
              },

              {
                title:
                  "Action",

                key:
                  "action",

                render: (
                  _,
                  record
                ) => {
                  const shipmentId =
                    record.shipment_id ??
                    record.shipment?.id;

                  if (!shipmentId) {
                    return "-";
                  }

                  const shipmentStatus =
                    record.shipment
                      ?.status ||
                    record.status;

                  const canCollect =
                    pickup.status ===
                      "arrived" ||
                    pickup.status ===
                      "collecting";

                  const alreadyCollected =
                    [
                      "picked_up",
                      "received_at_origin",
                    ].includes(
                      shipmentStatus
                    );

                  return (
                    <Button
                      type="primary"
                      disabled={
                        !canCollect ||
                        alreadyCollected
                      }
                      loading={
                        actionLoading
                      }
                      onClick={() =>
                        run(
                          () =>
                            staffCollectShipment(
                              pickup.id,
                              shipmentId,
                              {
                                note:
                                  "Collected by pickup staff.",
                              }
                            ),
                          "Shipment collected."
                        )
                      }
                    >
                      {alreadyCollected
                        ? "Collected"
                        : "Collect"}
                    </Button>
                  );
                },
              },
            ]}
          />
        ) : (
          <Empty
            description="No shipments attached to this pickup."
          />
        )}
      </Card>
    </Space>
  );
}