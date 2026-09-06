"use client";

import { useEffect, useState } from "react";

import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Space,
  Spin,
  Steps,
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
  CarOutlined,
  CloseCircleOutlined,
  InboxOutlined,
} from "@ant-design/icons";

import { useParams, useRouter } from "next/navigation";

import {
  staffGetPickup,
  staffAcceptPickup,
  staffStartPickup,
  staffArrivePickup,
  staffCollectPickupShipment,
  staffStartTransit,
  staffCancelPickup,
} from "@/services/deliveryOperationsApi";

const { Title, Text } = Typography;

const STATUS_COLORS = {
  requested: "blue",
  assigned: "purple",
  accepted: "geekblue",
  started: "cyan",
  arrived: "gold",
  collected: "green",
  on_way_to_branch: "orange",
  completed: "success",
  failed: "error",
  cancelled: "default",
};

function statusTag(status) {
  if (!status) return "-";
  const key = String(status).toLowerCase();
  return (
    <Tag color={STATUS_COLORS[key] ?? "default"}>
      {String(status).replaceAll("_", " ").toUpperCase()}
    </Tag>
  );
}

/*
| Rider lifecycle step index for the Steps component.
*/
const STEP_ORDER = ["assigned", "accepted", "started", "arrived", "collected", "on_way_to_branch", "completed"];

function currentStepIndex(status) {
  const idx = STEP_ORDER.indexOf(String(status).toLowerCase());
  return idx < 0 ? 0 : idx;
}

export default function StaffPickupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pickupId = params?.id;

  const [pickup, setPickup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelForm] = Form.useForm();

  async function load() {
    if (!pickupId) return;
    try {
      setLoading(true);
      const result = await staffGetPickup(pickupId);
      setPickup(result);
    } catch (error) {
      message.error(error?.response?.data?.message || "Could not load pickup.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupId]);

  async function run(action, successMessage) {
    try {
      setActionLoading(true);
      await action();
      message.success(successMessage);
      await load();
    } catch (error) {
      message.error(error?.response?.data?.message || "Action failed.");
    } finally {
      setActionLoading(false);
    }
  }

  async function submitCancel() {
    const values = await cancelForm.validateFields();
    try {
      setActionLoading(true);
      await staffCancelPickup(pickup.id, values.reason);
      message.success("Pickup cancelled.");
      setCancelOpen(false);
      cancelForm.resetFields();
      await load();
    } catch (error) {
      message.error(error?.response?.data?.message || "Could not cancel pickup.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <Space>
          <Spin />
          <Text>Loading pickup...</Text>
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

  const status = String(pickup.status ?? "").toLowerCase();
  const shipments = pickup.shipments ?? [];

  const lat = pickup.pickup_lat ?? pickup.pickupLocation?.latitude ?? pickup.pickup_location?.latitude ?? null;
  const lng = pickup.pickup_lng ?? pickup.pickupLocation?.longitude ?? pickup.pickup_location?.longitude ?? null;
  const hasCoords = lat != null && lng != null;

  // How many shipments are still not collected?
  const collectedStatuses = ["picked_up", "collected", "received_at_origin", "received_at_origin_branch"];
  const pendingCount = shipments.filter((r) => {
    const s = (r.shipment?.status ?? r.status ?? "").toLowerCase();
    return !collectedStatuses.includes(s);
  }).length;

  const canCollect = status === "arrived";
  const allCollected = status === "collected";
  const inTransit = status === "on_way_to_branch";
  const isClosed = ["completed", "failed", "cancelled"].includes(status);
  const canCancel = ["assigned", "accepted", "started", "arrived"].includes(status);

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {/* Header */}
      <Card>
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            style={{ padding: 0 }}
            onClick={() => router.push("/staff/pickups")}
          >
            Back to Pickups
          </Button>

          <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
            <Title level={3} style={{ margin: 0 }}>
              {pickup.request_number || `Pickup #${pickup.id}`}
            </Title>
            <Space>
              {statusTag(pickup.status)}
              <Button icon={<ReloadOutlined />} loading={loading} onClick={load}>
                Refresh
              </Button>
            </Space>
          </Space>

          <Steps
            size="small"
            current={currentStepIndex(status)}
            style={{ marginTop: 12 }}
            items={[
              { title: "Assigned" },
              { title: "Accepted" },
              { title: "Started" },
              { title: "Arrived" },
              { title: "Collected" },
              { title: "On Way" },
              { title: "Completed" },
            ]}
          />
        </Space>
      </Card>

      {/* Actions */}
      <Card title="Pickup Actions">
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Space wrap>
            {status === "assigned" && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={actionLoading}
                onClick={() => run(() => staffAcceptPickup(pickup.id), "Pickup accepted.")}
              >
                Accept Pickup
              </Button>
            )}

            {status === "accepted" && (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={actionLoading}
                onClick={() => run(() => staffStartPickup(pickup.id), "On the way to merchant.")}
              >
                Start Pickup
              </Button>
            )}

            {status === "started" && (
              <Button
                type="primary"
                icon={<EnvironmentOutlined />}
                loading={actionLoading}
                onClick={() => run(() => staffArrivePickup(pickup.id), "Arrival recorded.")}
              >
                Arrived at Pickup
              </Button>
            )}

            {allCollected && (
              <Button
                type="primary"
                icon={<CarOutlined />}
                loading={actionLoading}
                onClick={() => run(() => staffStartTransit(pickup.id), "Transit to branch started.")}
              >
                Close Collection & Start Transit
              </Button>
            )}

            {canCancel && (
              <Button
                danger
                icon={<CloseCircleOutlined />}
                loading={actionLoading}
                onClick={() => {
                  cancelForm.resetFields();
                  setCancelOpen(true);
                }}
              >
                Cancel Pickup
              </Button>
            )}
          </Space>

          {/* Contextual guidance */}
          {canCollect && (
            <Alert
              type="info"
              showIcon
              message="Collect each shipment below."
              description={
                pendingCount > 0
                  ? `${pendingCount} shipment(s) still to collect. Once all are collected the pickup moves to "Collected" and you can start transit.`
                  : "All shipments collected. The pickup should now be marked Collected."
              }
            />
          )}

          {allCollected && (
            <Alert
              type="success"
              showIcon
              message="All shipments collected."
              description="Close collection to start your transit to the origin branch. The pickup will complete only after branch staff verify the shipments."
            />
          )}

          {inTransit && (
            <Alert
              type="warning"
              showIcon
              message="On the way to the origin branch."
              description="Hand over the shipments at the branch. Branch staff will verify them and complete the pickup."
            />
          )}

          {isClosed && (
            <Alert
              type={status === "completed" ? "success" : "error"}
              showIcon
              message={`Pickup ${status}.`}
              description={
                status === "completed"
                  ? "Branch staff verified the shipments and completed the pickup."
                  : "This pickup is closed. No further rider action is needed."
              }
            />
          )}
        </Space>
      </Card>

      {/* Pickup info */}
      <Card title="Pickup Information">
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Merchant">
            {pickup.merchant?.name || pickup.merchant_name || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Pickup Name">{pickup.pickup_name || "-"}</Descriptions.Item>
          <Descriptions.Item label="Pickup Phone">{pickup.pickup_phone || "-"}</Descriptions.Item>
          <Descriptions.Item label="Pickup Location">
            {pickup.pickupLocation?.name || pickup.pickup_location?.name || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Address">
            {pickup.pickup_address || pickup.address || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Preferred Pickup">{pickup.preferred_pickup_at || "-"}</Descriptions.Item>
          <Descriptions.Item label="Remarks">{pickup.remarks || "-"}</Descriptions.Item>
        </Descriptions>

        {hasCoords && (
          <div style={{ marginTop: 16 }}>
            <Space style={{ marginBottom: 8 }}>
              <EnvironmentOutlined />
              <Text copyable={{ text: `${lat}, ${lng}` }}>
                {Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}
              </Text>
            </Space>
            <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #f0f0f0" }}>
              <iframe
                title="Pickup location"
                width="100%"
                height="220"
                style={{ border: 0, display: "block" }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`}
              />
            </div>
            <Button
              block
              style={{ marginTop: 8 }}
              icon={<EnvironmentOutlined />}
              href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
              target="_blank"
            >
              Navigate to Pickup
            </Button>
          </div>
        )}
      </Card>

      {/* Shipments */}
      <Card
        title={
          <Space>
            <InboxOutlined /> Shipments to Collect
            {shipments.length ? <Tag>{shipments.length}</Tag> : null}
          </Space>
        }
      >
        {shipments.length ? (
          <Table
            rowKey={(record) => record.id ?? record.shipment_id}
            dataSource={shipments}
            pagination={false}
            scroll={{ x: 900 }}
            columns={[
              {
                title: "Tracking Number",
                key: "tracking_number",
                render: (_, record) =>
                  record.shipment?.tracking_number || record.tracking_number || "-",
              },
              {
                title: "Merchant Order",
                key: "merchant_order_id",
                render: (_, record) =>
                  record.shipment?.merchant_order_id || record.merchant_order_id || "-",
              },
              {
                title: "Receiver",
                key: "receiver",
                render: (_, record) => (
                  <Space direction="vertical" size={0}>
                    <Text>{record.shipment?.receiver_name || record.receiver_name || "-"}</Text>
                    <Text type="secondary">
                      {record.shipment?.receiver_phone || record.receiver_phone || "-"}
                    </Text>
                  </Space>
                ),
              },
              {
                title: "Shipment Status",
                key: "status",
                render: (_, record) => statusTag(record.shipment?.status || record.status),
              },
              {
                title: "Action",
                key: "action",
                render: (_, record) => {
                  const shipmentId = record.shipment_id ?? record.shipment?.id;
                  if (!shipmentId) return "-";

                  const shipmentStatus = (record.shipment?.status || record.status || "").toLowerCase();
                  const alreadyCollected = collectedStatuses.includes(shipmentStatus);

                  return (
                    <Button
                      type="primary"
                      disabled={!canCollect || alreadyCollected}
                      loading={actionLoading}
                      onClick={() =>
                        run(
                          () =>
                            staffCollectPickupShipment(pickup.id, shipmentId, {
                              note: "Collected by pickup staff.",
                            }),
                          "Shipment collected."
                        )
                      }
                    >
                      {alreadyCollected ? "Collected" : "Collect"}
                    </Button>
                  );
                },
              },
            ]}
          />
        ) : (
          <Empty description="No shipments attached to this pickup." />
        )}
      </Card>

      {/* Cancel modal */}
      <Modal
        title="Cancel Pickup"
        open={cancelOpen}
        onCancel={() => setCancelOpen(false)}
        onOk={submitCancel}
        confirmLoading={actionLoading}
        okText="Cancel Pickup"
        okButtonProps={{ danger: true }}
        cancelText="Keep"
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="Cancelling stops this pickup"
          description="Use this only if a shipment is missing, the cutoff has passed, or the requested service cannot be fulfilled."
        />
        <Form form={cancelForm} layout="vertical">
          <Form.Item name="reason" label="Reason" rules={[{ required: true, message: "Enter a reason" }]}>
            <Input.TextArea rows={4} placeholder="Describe why this pickup is being cancelled…" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
