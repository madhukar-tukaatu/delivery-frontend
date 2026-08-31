"use client";

import {
  useEffect,
  useMemo,
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
  CheckCircleOutlined,
  EnvironmentOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  UserSwitchOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  getPickup,
  getPickupRiders,
  assignPickup,
  startPickup,
  arrivePickup,
  completePickup,
  failPickup,
} from "@/services/adminPickupService";

const {
  Title,
  Text,
} = Typography;

/*
|--------------------------------------------------------------------------
| Status
|--------------------------------------------------------------------------
*/

const STATUS = {
  REQUESTED: "requested",
  ASSIGNED: "assigned",
  STARTED: "started",
  ARRIVED: "arrived",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

const CLOSED_STATUSES = [
  STATUS.COMPLETED,
  STATUS.FAILED,
  STATUS.CANCELLED,
];

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase();
}

function statusTag(status) {
  const normalized =
    normalizeStatus(status);

  if (!normalized) {
    return <Tag>-</Tag>;
  }

  const colors = {
    requested: "gold",
    assigned: "blue",
    started: "geekblue",
    arrived: "purple",
    completed: "green",
    failed: "red",
    cancelled: "default",
  };

  return (
    <Tag
      color={
        colors[normalized] ||
        "default"
      }
    >
      {normalized
        .replaceAll("_", " ")
        .toUpperCase()}
    </Tag>
  );
}

function branchLabel(branch) {
  if (!branch) {
    return "-";
  }

  if (typeof branch === "string") {
    return branch;
  }

  return (
    [
      branch.name,
      branch.area,
    ]
      .filter(Boolean)
      .join(", ") || "-"
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

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(
    "en-NP",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

function getShipment(record) {
  return (
    record?.shipment ||
    record ||
    null
  );
}

function getShipmentId(record) {
  return (
    record?.shipment_id ??
    record?.shipment?.id ??
    record?.id ??
    null
  );
}

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/

export default function PickupDetailPage() {
  const params =
    useParams();

  const router =
    useRouter();

  const pickupId =
    params?.id;

  const [pickup, setPickup] =
    useState(null);

  const [riders, setRiders] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [ridersLoading, setRidersLoading] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState("");

  const [assignModalOpen, setAssignModalOpen] =
    useState(false);

  const [selectedRider, setSelectedRider] =
    useState(undefined);

  const [failModalOpen, setFailModalOpen] =
    useState(false);

  const [failReason, setFailReason] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | Load pickup
  |--------------------------------------------------------------------------
  */

  async function loadPickup({
    silent = false,
  } = {}) {
    if (!pickupId) {
      return;
    }

    try {
      if (!silent) {
        setLoading(true);
      }

      const result =
        await getPickup(
          pickupId
        );

      setPickup(result);
    } catch (error) {
      console.error(
        "Could not load pickup:",
        error
      );

      message.error(
        error?.message ||
          "Could not load pickup."
      );

      if (!silent) {
        setPickup(null);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadPickup();
  }, [pickupId]);

  /*
  |--------------------------------------------------------------------------
  | Riders
  |--------------------------------------------------------------------------
  */

  async function loadRiders() {
    try {
      setRidersLoading(true);

      const result =
        await getPickupRiders();

      setRiders(
        Array.isArray(result)
          ? result
          : []
      );
    } catch (error) {
      message.error(
        error?.message ||
          "Could not load riders."
      );
    } finally {
      setRidersLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Assignment
  |--------------------------------------------------------------------------
  */

  async function openAssignModal() {
    const assigned =
      pickup?.assignedStaff ||
      pickup?.assigned_staff ||
      null;

    setSelectedRider(
      getStaffId(
        assigned
      ) ?? undefined
    );

    setAssignModalOpen(true);

    await loadRiders();
  }

  async function handleAssign() {
    if (!selectedRider) {
      message.warning(
        "Please select a staff member."
      );

      return;
    }

    const requestNumber =
      pickup?.request_number;

    if (!requestNumber) {
      message.error(
        "Pickup request number is missing."
      );

      return;
    }

    try {
      setActionLoading(
        "assign"
      );

      await assignPickup(
        requestNumber,
        {
          staff_id:
            Number(
              selectedRider
            ),
        }
      );

      message.success(
        "Pickup assigned successfully."
      );

      setAssignModalOpen(
        false
      );

      await loadPickup({
        silent: true,
      });
    } catch (error) {
      message.error(
        error?.message ||
          "Could not assign pickup."
      );
    } finally {
      setActionLoading("");
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Lifecycle action
  |--------------------------------------------------------------------------
  */

  async function handleAction(
    action
  ) {
    const requestNumber =
      pickup?.request_number;

    if (!requestNumber) {
      message.error(
        "Pickup request number is missing."
      );

      return;
    }

    try {
      setActionLoading(action);

      switch (action) {
        case "start":
          await startPickup(
            requestNumber
          );
          break;

        case "arrive":
          await arrivePickup(
            requestNumber
          );
          break;

        case "complete":
          await completePickup(
            requestNumber
          );
          break;

        default:
          throw new Error(
            "Unsupported pickup action."
          );
      }

      const messages = {
        start:
          "Pickup started successfully.",
        arrive:
          "Pickup marked as arrived.",
        complete:
          "Pickup completed successfully.",
      };

      message.success(
        messages[action]
      );

      await loadPickup({
        silent: true,
      });
    } catch (error) {
      message.error(
        error?.message ||
          `Could not ${action} pickup.`
      );
    } finally {
      setActionLoading("");
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Fail
  |--------------------------------------------------------------------------
  */

  async function handleFail() {
    const reason =
      failReason.trim();

    if (!reason) {
      message.warning(
        "Please provide a failure reason."
      );

      return;
    }

    const requestNumber =
      pickup?.request_number;

    if (!requestNumber) {
      message.error(
        "Pickup request number is missing."
      );

      return;
    }

    try {
      setActionLoading(
        "fail"
      );

      await failPickup(
        requestNumber,
        {
          reason,
        }
      );

      message.success(
        "Pickup marked as failed."
      );

      setFailReason("");
      setFailModalOpen(false);

      await loadPickup({
        silent: true,
      });
    } catch (error) {
      message.error(
        error?.message ||
          "Could not fail pickup."
      );
    } finally {
      setActionLoading("");
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Derived values
  |--------------------------------------------------------------------------
  */

  const status =
    normalizeStatus(
      pickup?.status
    );

  const assignedStaff =
    pickup?.assignedStaff ??
    pickup?.assigned_staff ??
    null;

  const shipments =
    pickup?.active_shipments ??
    pickup?.shipments ??
    [];

  const canAssign =
    [
      STATUS.REQUESTED,
      STATUS.ASSIGNED,
      STATUS.STARTED,
    ].includes(status);

  const isClosed =
    CLOSED_STATUSES.includes(
      status
    );

  const canStart =
    status ===
    STATUS.ASSIGNED;

  const canArrive =
    status ===
    STATUS.STARTED;

  const canComplete =
    status ===
    STATUS.ARRIVED;

  const canFail =
    [
      STATUS.REQUESTED,
      STATUS.ASSIGNED,
      STATUS.STARTED,
      STATUS.ARRIVED,
    ].includes(status);

  const merchantName =
    pickup?.merchant
      ?.business_name ||
    pickup?.merchant?.name ||
    pickup?.merchant_name ||
    "-";

  const pickupLocation =
    pickup?.pickupLocation ||
    pickup?.pickup_location ||
    null;

  /*
  |--------------------------------------------------------------------------
  | Shipment columns
  |--------------------------------------------------------------------------
  */

  const shipmentColumns =
    useMemo(
      () => [
        {
          title:
            "Tracking Number",
          key:
            "tracking_number",
          render: (_, record) => {
            const shipment =
              getShipment(
                record
              );

            return (
              shipment?.tracking_number ||
              shipment?.awb ||
              "-"
            );
          },
        },

        {
          title:
            "Merchant Order",
          key:
            "merchant_order_id",
          render: (_, record) => {
            const shipment =
              getShipment(
                record
              );

            return (
              shipment?.merchant_order_id ||
              "-"
            );
          },
        },

        {
          title: "Receiver",
          key: "receiver",
          render: (_, record) => {
            const shipment =
              getShipment(
                record
              );

            return (
              shipment?.receiver_name ||
              shipment?.receiver?.name ||
              record?.receiver_name ||
              "-"
            );
          },
        },

        {
          title:
            "Shipment Status",
          key: "status",
          render: (_, record) => {
            const shipment =
              getShipment(
                record
              );

            return statusTag(
              shipment?.status ||
                record?.status
            );
          },
        },

        {
          title: "Action",
          key: "action",
          render: (_, record) => {
            const shipment =
              getShipment(
                record
              );

            const shipmentId =
              getShipmentId(
                record
              );

            if (!shipmentId) {
              return "-";
            }

            return (
              <Button
                onClick={() =>
                  router.push(
                    `/admin/shipments/${shipmentId}`
                  )
                }
              >
                Shipment
              </Button>
            );
          },
        },
      ],
      [router]
    );

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | Not found
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

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
          gutter={[
            16,
            16,
          ]}
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
              {statusTag(status)}

              <Button
                icon={
                  <ReloadOutlined />
                }
                loading={
                  loading
                }
                onClick={() =>
                  loadPickup({
                    silent: true,
                  })
                }
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Pickup Information */}

      <Row
        gutter={[
          16,
          16,
        ]}
      >
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
                {merchantName}
              </Descriptions.Item>

              <Descriptions.Item label="Pickup Name">
                {pickup.pickup_name ||
                  "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Pickup Phone">
                {pickup.pickup_phone ||
                  "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Pickup Email">
                {pickup.pickup_email ||
                  pickup.merchant?.email ||
                  "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Pickup Location">
                {pickupLocation?.name ||
                  "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Pickup Address">
                {pickup.pickup_address ||
                  pickupLocation?.address ||
                  "-"}
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

              <Descriptions.Item label="Origin Branch">
                {branchLabel(
                  pickup.branch
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Origin Sub Branch">
                {branchLabel(
                  pickup.subBranch ||
                    pickup.sub_branch
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Preferred Pickup">
                {formatDate(
                  pickup.preferred_pickup_at
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Requested At">
                {formatDate(
                  pickup.requested_at
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Remarks">
                {pickup.remarks ||
                  "-"}
              </Descriptions.Item>

              {pickup.failed_reason && (
                <Descriptions.Item label="Failure Reason">
                  <Text type="danger">
                    {
                      pickup.failed_reason
                    }
                  </Text>
                </Descriptions.Item>
              )}
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
                  {statusTag(status)}
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

                <Descriptions.Item label="Assigned At">
                  {formatDate(
                    pickup.assigned_at
                  )}
                </Descriptions.Item>

                <Descriptions.Item label="Started At">
                  {formatDate(
                    pickup.started_at ||
                      pickup.accepted_at
                  )}
                </Descriptions.Item>

                <Descriptions.Item label="Arrived At">
                  {formatDate(
                    pickup.arrived_at
                  )}
                </Descriptions.Item>

                <Descriptions.Item label="Completed At">
                  {formatDate(
                    pickup.completed_at
                  )}
                </Descriptions.Item>
              </Descriptions>

              <Space wrap>

                {canAssign && (
                  <Button
                    type="primary"
                    icon={
                      <UserSwitchOutlined />
                    }
                    loading={
                      actionLoading ===
                      "assign"
                    }
                    onClick={
                      openAssignModal
                    }
                  >
                    {assignedStaff
                      ? "Reassign Pickup"
                      : "Assign Pickup"}
                  </Button>
                )}

                {canStart && (
                  <Button
                    type="primary"
                    icon={
                      <PlayCircleOutlined />
                    }
                    loading={
                      actionLoading ===
                      "start"
                    }
                    onClick={() =>
                      handleAction(
                        "start"
                      )
                    }
                  >
                    Start Pickup
                  </Button>
                )}

                {canArrive && (
                  <Button
                    type="primary"
                    icon={
                      <EnvironmentOutlined />
                    }
                    loading={
                      actionLoading ===
                      "arrive"
                    }
                    onClick={() =>
                      handleAction(
                        "arrive"
                      )
                    }
                  >
                    Mark Arrived
                  </Button>
                )}

                {canComplete && (
                  <Button
                    type="primary"
                    icon={
                      <CheckCircleOutlined />
                    }
                    loading={
                      actionLoading ===
                      "complete"
                    }
                    onClick={() =>
                      handleAction(
                        "complete"
                      )
                    }
                  >
                    Complete Pickup
                  </Button>
                )}

                {canFail && (
                  <Button
                    danger
                    icon={
                      <CloseCircleOutlined />
                    }
                    loading={
                      actionLoading ===
                      "fail"
                    }
                    onClick={() =>
                      setFailModalOpen(
                        true
                      )
                    }
                  >
                    Fail Pickup
                  </Button>
                )}

                {isClosed && (
                  <Text type="secondary">
                    This pickup request is
                    closed.
                  </Text>
                )}
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Assignment Modal */}

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
          actionLoading ===
          "assign"
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
        destroyOnClose
      >
        <Space
          direction="vertical"
          size={8}
          style={{
            width: "100%",
          }}
        >
          <Text>
            Select the staff member or
            rider who will perform this
            pickup.
          </Text>

          <Select
            showSearch
            allowClear
            loading={
              ridersLoading
            }
            style={{
              width: "100%",
            }}
            placeholder="Select staff / rider"
            value={
              selectedRider
            }
            onChange={
              setSelectedRider
            }
            optionFilterProp="label"
            options={riders.map(
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

      {/* Failure Modal */}

      <Modal
        title="Fail Pickup"
        open={
          failModalOpen
        }
        confirmLoading={
          actionLoading ===
          "fail"
        }
        onCancel={() => {
          if (
            actionLoading !==
            "fail"
          ) {
            setFailModalOpen(
              false
            );
          }
        }}
        onOk={
          handleFail
        }
        okText="Fail Pickup"
        okButtonProps={{
          danger: true,
          disabled:
            !failReason.trim(),
        }}
        destroyOnClose
      >
        <Space
          direction="vertical"
          size={12}
          style={{
            width: "100%",
          }}
        >
          <Text>
            Enter the reason why this
            pickup cannot be completed.
          </Text>

          <textarea
            value={failReason}
            onChange={(event) =>
              setFailReason(
                event.target.value
              )
            }
            rows={5}
            placeholder="Enter failure reason..."
            style={{
              width: "100%",
              resize: "vertical",
              padding: 10,
              border:
                "1px solid #d9d9d9",
              borderRadius: 6,
            }}
          />
        </Space>
      </Modal>

      {/* Shipments */}

      <Card title="Shipments in Pickup">
        {shipments.length ? (
          <Table
            rowKey={(record) =>
              record.id ??
              record.shipment_id ??
              record.shipment?.id
            }
            dataSource={
              shipments
            }
            pagination={false}
            scroll={{
              x: 1000,
            }}
            columns={
              shipmentColumns
            }
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