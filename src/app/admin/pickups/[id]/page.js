"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Modal,
  Row,
  Select,
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
  UserSwitchOutlined,
} from "@ant-design/icons";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  assignPickup,
  failPickup,
  getPickup,
  receivePickupShipment,
} from "@/services/pickupService";

import {
  getBranchStaff,
} from "@/services/staffService";

const {
  Title,
  Text,
} = Typography;

const ASSIGNABLE_STATUSES = [
  "requested",
  "pending",
  "assigned",
];

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

function staffLabel(staff) {
  if (!staff) {
    return "-";
  }

  if (typeof staff === "string") {
    return staff;
  }

  return (
    staff.name ||
    staff.full_name ||
    staff.username ||
    staff.email ||
    "-"
  );
}

function getStaffId(staff) {
  if (!staff) {
    return null;
  }

  return (
    staff.id ??
    staff.user_id ??
    null
  );
}

export default function PickupDetailPage() {
  const params = useParams();
  const router = useRouter();

  const pickupId = params?.id;

  const [pickup, setPickup] =
    useState(null);

  const [staff, setStaff] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [staffLoading, setStaffLoading] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [assignModalOpen, setAssignModalOpen] =
    useState(false);

  const [selectedStaffId, setSelectedStaffId] =
    useState(undefined);

  async function loadPickup() {
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

      setPickup(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadStaff() {
    try {
      setStaffLoading(true);

      /*
       * This endpoint should return staff/riders
       * belonging to the authenticated manager's
       * authorized branch.
       */
      const result =
        await getBranchStaff();

      setStaff(
        Array.isArray(result)
          ? result
          : result?.list ?? []
      );
    } catch (error) {
      message.error(
        error?.response?.data?.message ||
          "Could not load branch staff."
      );
    } finally {
      setStaffLoading(false);
    }
  }

  useEffect(() => {
    if (!pickupId) {
      return;
    }

    loadPickup();
  }, [pickupId]);

  async function openAssignModal() {
    setSelectedStaffId(
      getStaffId(
        pickup?.assignedStaff ||
          pickup?.assigned_staff
      ) ?? undefined
    );

    setAssignModalOpen(true);

    await loadStaff();
  }

  async function handleAssign() {
    if (!selectedStaffId) {
      message.warning(
        "Please select a staff member."
      );

      return;
    }

    try {
      setActionLoading(true);

      await assignPickup(
        pickup.id,
        {
          staff_id:
            Number(
              selectedStaffId
            ),
        }
      );

      message.success(
        "Pickup assigned successfully."
      );

      setAssignModalOpen(false);

      await loadPickup();
    } catch (error) {
      message.error(
        error?.response?.data?.message ||
          "Could not assign pickup."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleFail() {
    try {
      setActionLoading(true);

      await failPickup(
        pickup.id,
        {
          reason:
            "Failed from branch operations.",
        }
      );

      message.success(
        "Pickup marked as failed."
      );

      await loadPickup();
    } catch (error) {
      message.error(
        error?.response?.data?.message ||
          "Could not fail pickup."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReceiveShipment(
    shipmentId
  ) {
    try {
      setActionLoading(true);

      await receivePickupShipment(
        pickup.id,
        shipmentId
      );

      message.success(
        "Shipment received at origin branch."
      );

      await loadPickup();
    } catch (error) {
      message.error(
        error?.response?.data?.message ||
          "Could not receive shipment."
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
        <Empty
          description="Pickup not found"
        />

        <div
          style={{
            marginTop: 16,
            textAlign: "center",
          }}
        >
          <Button
            icon={
              <ArrowLeftOutlined />
            }
            onClick={() =>
              router.push(
                "/admin/pickups"
              )
            }
          >
            Back to Pickups
          </Button>
        </div>
      </Card>
    );
  }

  const shipments =
    pickup.shipments ?? [];

  const assignedStaff =
    pickup.assignedStaff ??
    pickup.assigned_staff ??
    null;

  const canAssign =
    ASSIGNABLE_STATUSES.includes(
      pickup.status
    );

  return (
    <Space
      direction="vertical"
      size={16}
      style={{
        width: "100%",
      }}
    >
      {/* Header */}

      <Card>
        <Row
          justify="space-between"
          align="middle"
          gutter={[16, 16]}
        >
          <Col>
            <Space>
              <Button
                icon={
                  <ArrowLeftOutlined />
                }
                onClick={() =>
                  router.push(
                    "/admin/pickups"
                  )
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
            <Space wrap>
              {statusTag(
                pickup.status
              )}

              <Button
                icon={
                  <ReloadOutlined />
                }
                loading={loading}
                onClick={
                  loadPickup
                }
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Main information */}

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
                  `#${pickup.id}`}
              </Descriptions.Item>

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
                {pickup.pickupLocation?.name ||
                  pickup.pickup_location?.name ||
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
        </Col>

        {/* Assignment */}

        <Col
          xs={24}
          lg={12}
        >
          <Card title="Pickup Assignment">
            <Space
              direction="vertical"
              size={16}
              style={{
                width: "100%",
              }}
            >
              <Descriptions
                bordered
                column={1}
                size="small"
              >
                <Descriptions.Item label="Status">
                  {statusTag(
                    pickup.status
                  )}
                </Descriptions.Item>

                <Descriptions.Item label="Assigned Staff / Rider">
                  {staffLabel(
                    assignedStaff
                  )}
                </Descriptions.Item>

                <Descriptions.Item label="Staff ID">
                  {getStaffId(
                    assignedStaff
                  ) ?? "-"}
                </Descriptions.Item>
              </Descriptions>

              <Space wrap>
                {canAssign ? (
                  <Button
                    type="primary"
                    icon={
                      <UserSwitchOutlined />
                    }
                    onClick={
                      openAssignModal
                    }
                  >
                    {assignedStaff
                      ? "Reassign Pickup"
                      : "Assign Pickup"}
                  </Button>
                ) : null}

                {pickup.status !==
                  "completed" &&
                pickup.status !==
                  "failed" &&
                pickup.status !==
                  "cancelled" ? (
                  <Button
                    danger
                    loading={
                      actionLoading
                    }
                    onClick={
                      handleFail
                    }
                  >
                    Fail Pickup
                  </Button>
                ) : null}
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Assignment modal */}

      <Modal
        title={
          assignedStaff
            ? "Reassign Pickup"
            : "Assign Pickup"
        }
        open={
          assignModalOpen
        }
        confirmLoading={
          actionLoading
        }
        onCancel={() =>
          setAssignModalOpen(
            false
          )
        }
        onOk={
          handleAssign
        }
        okText="Assign Pickup"
      >
        <Space
          direction="vertical"
          size={8}
          style={{
            width: "100%",
          }}
        >
          <Text>
            Select the staff member or rider
            who will perform this pickup.
          </Text>

          <Select
            showSearch
            allowClear
            loading={
              staffLoading
            }
            style={{
              width: "100%",
            }}
            placeholder="Select staff / rider"
            value={
              selectedStaffId
            }
            onChange={
              setSelectedStaffId
            }
            optionFilterProp="label"
            options={staff.map(
              (member) => ({
                value:
                  member.id ??
                  member.user_id,

                label:
                  staffLabel(
                    member
                  ),
              })
            )}
          />
        </Space>
      </Modal>

      {/* Shipments */}

      <Card title="Shipments in Pickup">
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
                ) =>
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

                  const canReceive =
                    shipmentStatus ===
                      "picked_up" ||
                    shipmentStatus ===
                      "pickup_completed" ||
                    shipmentStatus ===
                      "collected";

                  return (
                    <Space>
                      <Button
                        onClick={() =>
                          router.push(
                            `/admin/shipments/${shipmentId}`
                          )
                        }
                      >
                        Shipment
                      </Button>

                      {canReceive ? (
                        <Button
                          type="primary"
                          loading={
                            actionLoading
                          }
                          onClick={() =>
                            handleReceiveShipment(
                              shipmentId
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
          <Empty
            description="No shipments attached to this pickup."
          />
        )}
      </Card>
    </Space>
  );
}