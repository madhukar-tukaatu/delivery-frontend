"use client";

import { useEffect, useState } from "react";

import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from "antd";

import {
  ArrowLeftOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  getPickup,
  receivePickupShipment,
  assignPickup,
  failPickup,
} from "@/services/pickupService";

const {
  Title,
  Text,
} = Typography;

function branchLabel(branch) {
  if (!branch) {
    return "-";
  }

  if (typeof branch === "string") {
    return branch;
  }

  return [
    branch.name,
    branch.area,
  ]
    .filter(Boolean)
    .join(", ") || "-";
}

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

export default function PickupDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [pickup, setPickup] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  async function load() {
    try {
      setLoading(true);

      const result =
        await getPickup(
          params.id
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
    if (params.id) {
      load();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function runAction(
    action,
    success
  ) {
    try {
      setActionLoading(true);

      await action();

      message.success(
        success
      );

      await load();
    } catch (error) {
      message.error(
        error?.response?.data?.message ||
        "Pickup action failed."
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <Spin />
      </Card>
    );
  }

  if (!pickup) {
    return (
      <Empty description="Pickup not found" />
    );
  }

  const shipments =
    pickup.shipments || [];

  return (
    <Space
      direction="vertical"
      size={16}
      style={{
        width: "100%",
      }}
    >
      <Card>
        <Row
          justify="space-between"
          align="middle"
        >
          <Col>
            <Space>
              <Button
                icon={
                  <ArrowLeftOutlined />
                }
                onClick={() =>
                  router.back()
                }
              />

              <div>
                <Title
                  level={3}
                  style={{
                    margin: 0,
                  }}
                >
                  {pickup.request_number ||
                    `Pickup #${pickup.id}`}
                </Title>

                <Text type="secondary">
                  Pickup operation
                </Text>
              </div>
            </Space>
          </Col>

          <Col>
            <Space>
              {statusTag(
                pickup.status
              )}

              <Button
                icon={
                  <ReloadOutlined />
                }
                onClick={load}
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col
          xs={24}
          lg={12}
        >
          <Card title="Pickup Information">
            <Descriptions
              bordered
              column={1}
              size="small"
            >
              <Descriptions.Item label="Request Number">
                {pickup.request_number ||
                  "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Merchant">
                {pickup.merchant?.name ||
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

              <Descriptions.Item label="Branch">
                {branchLabel(
                  pickup.branch
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Sub Branch">
                {branchLabel(
                  pickup.subBranch ||
                  pickup.sub_branch
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Pickup Branch">
                {branchLabel(
                  pickup.pickupBranch ||
                  pickup.pickup_branch
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Pickup Sub Branch">
                {branchLabel(
                  pickup.pickupSubBranch ||
                  pickup.pickup_sub_branch
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Pickup Location">
                {pickup.pickupLocation?.name ||
                  "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Assigned Staff">
                {pickup.assignedStaff?.name ||
                  pickup.assigned_to ||
                  "-"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col
          xs={24}
          lg={12}
        >
          <Card title="Pickup Actions">
            <Space wrap>
              {pickup.status ===
                "failed" ? null : (
                <Button
                  danger
                  loading={
                    actionLoading
                  }
                  onClick={() =>
                    runAction(
                      () =>
                        failPickup(
                          pickup.id,
                          {
                            reason:
                              "Failed from branch operations.",
                          }
                        ),
                      "Pickup marked as failed."
                    )
                  }
                >
                  Fail Pickup
                </Button>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      <Card title="Shipments in Pickup">
        {shipments.length ? (
          <Table
            rowKey={(record) =>
              record.id ??
              record.shipment_id
            }
            dataSource={shipments}
            pagination={false}
            columns={[
              {
                title:
                  "Tracking Number",
                key:
                  "tracking_number",
                render: (_, record) =>
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
                render: (_, record) =>
                  record.shipment
                    ?.merchant_order_id ||
                  record.merchant_order_id ||
                  "-",
              },

              {
                title: "Receiver",
                key:
                  "receiver",
                render: (_, record) =>
                  record.shipment
                    ?.receiver_name ||
                  record.receiver_name ||
                  "-",
              },

              {
                title:
                  "Shipment Status",
                key:
                  "status",
                render: (_, record) =>
                  statusTag(
                    record.shipment
                      ?.status ||
                    record.status
                  ),
              },

              {
                title: "Action",
                key: "action",
                render: (_, record) => {
                  const shipmentId =
                    record.shipment_id ||
                    record.shipment?.id;

                  return (
                    <Space>
                      {shipmentId ? (
                        <Button
                          onClick={() =>
                            router.push(
                              `/admin/shipments/${shipmentId}`
                            )
                          }
                        >
                          Shipment
                        </Button>
                      ) : null}

                      {shipmentId ? (
                        <Button
                          type="primary"
                          loading={
                            actionLoading
                          }
                          onClick={() =>
                            runAction(
                              () =>
                                receivePickupShipment(
                                  pickup.id,
                                  shipmentId
                                ),
                              "Shipment received at origin branch."
                            )
                          }
                        >
                          Receive
                        </Button>
                      ) : null}
                    </Space>
                  );
                },
              },
            ]}
          />
        ) : (
          <Empty description="No shipments attached to this pickup." />
        )}
      </Card>
    </Space>
  );
}