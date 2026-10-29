"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Input,
  Modal,
  Radio,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";

import {
  CarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CompassOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  InboxOutlined,
  PhoneOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";

import {
  staffAcceptPickup,
  staffStartPickup,
  staffArrivePickup,
  staffCollectPickupShipment,
  staffStartTransit,
  staffFailPickup,
  staffGetPickups,
  staffGetPickup,
} from "@/services/deliveryOperationsApi";
import { getUser } from "@/lib/auth";
import { useStaffSocket } from "@/hooks/useStaffSocket";
import StaffPickupRunPanel from "@/components/staff/StaffPickupRunPanel";

const { Text } = Typography;
const { TextArea } = Input;

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function getStatus(record) {
  return String(record?.status ?? "").toLowerCase();
}

/**
 * Pickup API may return:
 * shipments: [ { shipment_id: 123, shipment: {...} } ]
 * or direct shipment objects.
 */
function getShipmentItems(record) {
  if (!record) return [];

  if (Array.isArray(record.shipments)) {
    return record.shipments
      .map((item) => {
        if (item?.shipment) {
          return {
            ...item.shipment,
            pickup_item_id: item.id,
            shipment_id: item.shipment_id ?? item.shipment.id,
          };
        }
        return {
          ...item,
          shipment_id: item?.shipment_id ?? item?.id,
        };
      })
      .filter((s) => s && s.shipment_id);
  }

  if (Array.isArray(record.shipment_items)) {
    return record.shipment_items;
  }

  return [];
}

function getTrackingNumber(shipment) {
  return (
    shipment?.tracking_number ||
    shipment?.tracking_no ||
    shipment?.tracking ||
    "-"
  );
}

function getCustomerName(shipment) {
  return (
    shipment?.customer_name ||
    shipment?.receiver_name ||
    shipment?.customer?.name ||
    shipment?.receiver?.name ||
    "-"
  );
}

function getCustomerPhone(shipment) {
  return (
    shipment?.customer_phone ||
    shipment?.receiver_phone ||
    shipment?.customer?.phone ||
    shipment?.receiver?.phone ||
    "-"
  );
}

function getDeliveryAddress(shipment) {
  return (
    shipment?.delivery_address ||
    shipment?.receiver_address ||
    shipment?.address ||
    shipment?.delivery?.address ||
    "-"
  );
}

function isAwaitingCollection(status) {
  return [
    "booked",
    "awaiting_pickup",
    "pickup_assigned",
  ].includes(String(status ?? "").toLowerCase());
}

function getShipmentStatus(shipment) {
  return String(shipment?.status ?? "").toLowerCase();
}

function statusLabel(status) {
  if (!status) return "-";
  return String(status)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusColor(status) {
  switch (String(status ?? "").toLowerCase()) {
    case "awaiting_pickup":
      return "gold";
    case "pickup_assigned":
      return "blue";
    case "picked_up":
      return "green";
    case "cancelled":
      return "red";
    case "assigned":
      return "purple";
    case "accepted":
      return "cyan";
    case "started":
      return "processing";
    case "arrived":
      return "gold";
    case "collected":
      return "blue";
    case "on_way_to_branch":
      return "cyan";
    case "completed":
      return "success";
    case "failed":
      return "error";
    default:
      return "default";
  }
}

const FAIL_REASON_OPTIONS = [
  { label: "Merchant store closed / unavailable", value: "store_closed" },
  { label: "Pickup address unreachable or wrong", value: "wrong_address" },
  { label: "Merchant cancelled / items not ready", value: "cancelled_by_merchant" },
  { label: "Merchant phone unreachable", value: "phone_unreachable" },
  { label: "Other issue", value: "other" },
];

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/

export default function StaffPickupsPage() {
  const [rows, setRows] = useState([]);
  const [staffTab, setStaffTab] = useState("runs");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedPickup, setSelectedPickup] = useState(null);

  // Failure modal state
  const [failModalOpen, setFailModalOpen] = useState(false);
  const [failTargetPickup, setFailTargetPickup] = useState(null);
  const [failReasonType, setFailReasonType] = useState("store_closed");
  const [failReasonNotes, setFailReasonNotes] = useState("");
  const [failLoading, setFailLoading] = useState(false);

  // Bumped after every pickup action so the PR run panel reloads stop status
  // and the "x/y picked up" progress.
  const [runsRefreshKey, setRunsRefreshKey] = useState(0);
  const refreshRuns = useCallback(() => setRunsRefreshKey((k) => k + 1), []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await staffGetPickups();
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load staff pickups:", error);
      message.error(
        error?.response?.data?.message || "Could not load pickups."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const [currentUserId, setCurrentUserId] = useState(() => getUser()?.id);
  useEffect(() => {
    const u = getUser();
    if (u?.id) setCurrentUserId(u.id);
  }, []);

  useStaffSocket(currentUserId, {
    onPickupAssigned: () => {
      load();
      refreshRuns();
    },
    onPickupUpdated: () => {
      load();
      refreshRuns();
    },
  });

  /*
  |--------------------------------------------------------------------------
  | Pickup action runner
  |--------------------------------------------------------------------------
  */

  // opts.successMessage: toast text; opts.openDetail=false: do not pop the
  // detail modal open (used by the run stop cards).
  const run = async (id, action, opts = {}) => {
    try {
      setActionLoading(id);
      await action();
      message.success({ content: opts.successMessage || "Pickup updated successfully.", key: `pickup-action-${id}` });
      await load();
      refreshRuns();

      // Refresh selected pickup with fresh data from backend
      if (opts.openDetail !== false || String(selectedPickup?.id) === String(id)) {
        try {
          const refreshed = await staffGetPickup(id);
          if (refreshed) {
            setSelectedPickup(refreshed);
          }
        } catch {
          // keep modal open with current data
        }
      }
    } catch (error) {
      console.error("Pickup action failed:", error);
      const errors = error?.response?.data?.errors;
      if (errors) {
        const firstError = Object.values(errors).flat().find(Boolean);
        if (firstError) {
          message.error(firstError);
          return;
        }
      }
      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Pickup action failed."
      );
    } finally {
      setActionLoading(null);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Collect single shipment
  |--------------------------------------------------------------------------
  */

  const collectShipment = async (pickup, shipment) => {
    const pickupId = pickup?.id;
    const shipmentId = shipment?.shipment_id ?? shipment?.id;

    if (!pickupId || !shipmentId) {
      message.error("Pickup or Shipment ID is missing.");
      return;
    }

    try {
      setActionLoading(`shipment-${shipmentId}`);
      await staffCollectPickupShipment(pickupId, shipmentId, {
        remarks: "Shipment collected by rider.",
      });

      message.success(
        `Shipment ${getTrackingNumber(shipment)} collected successfully.`
      );
      await load();
      refreshRuns();

      // Refresh modal
      const fresh = await staffGetPickup(pickupId);
      if (fresh) setSelectedPickup(fresh);
    } catch (error) {
      console.error("Collect shipment failed:", error);
      const errors = error?.response?.data?.errors;
      if (errors) {
        const firstError = Object.values(errors).flat().find(Boolean);
        if (firstError) {
          message.error(firstError);
          return;
        }
      }
      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Could not collect shipment."
      );
    } finally {
      setActionLoading(null);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Batch collect all pending shipments
  |--------------------------------------------------------------------------
  */

  const collectAllPending = async (pickup) => {
    const pickupId = pickup?.id;
    if (!pickupId) return;

    const pending = getShipmentItems(pickup).filter((s) =>
      isAwaitingCollection(getShipmentStatus(s))
    );

    if (!pending.length) {
      message.info("All shipments are already collected.");
      return;
    }

    try {
      setActionLoading(`collect-all-${pickupId}`);
      let successCount = 0;
      for (const s of pending) {
        const shipmentId = s.shipment_id ?? s.id;
        try {
          await staffCollectPickupShipment(pickupId, shipmentId, {
            remarks: "Batch collected by rider.",
          });
          successCount++;
        } catch (e) {
          console.error(`Failed to collect shipment #${shipmentId}:`, e);
        }
      }
      message.success(`${successCount} of ${pending.length} shipments collected.`);
      await load();
      refreshRuns();

      const fresh = await staffGetPickup(pickupId);
      if (fresh) setSelectedPickup(fresh);
    } catch (e) {
      message.error(e?.message || "Batch collection failed.");
    } finally {
      setActionLoading(null);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Handle Fail / Report Issue Submit
  |--------------------------------------------------------------------------
  */

  const handleFailSubmit = async () => {
    const target = failTargetPickup || selectedPickup;
    if (!target?.id) return;

    const reasonLabel =
      FAIL_REASON_OPTIONS.find((o) => o.value === failReasonType)?.label ||
      "Other issue";
    const fullReason = failReasonNotes.trim()
      ? `${reasonLabel}: ${failReasonNotes.trim()}`
      : reasonLabel;

    try {
      setFailLoading(true);
      await staffFailPickup(target.id, fullReason);
      message.success("Pickup reported as failed.");
      setFailModalOpen(false);
      setFailReasonNotes("");
      setFailTargetPickup(null);
      await load();
      refreshRuns();

      if (selectedPickup?.id === target.id) {
        try {
          const fresh = await staffGetPickup(target.id);
          if (fresh) setSelectedPickup(fresh);
        } catch {
          setSelectedPickup(null);
        }
      }
    } catch (e) {
      message.error(
        e?.response?.data?.message || e?.message || "Could not fail pickup."
      );
    } finally {
      setFailLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Pickup table columns (Legacy view)
  |--------------------------------------------------------------------------
  */

  const columns = useMemo(
    () => [
      {
        title: "Pickup",
        key: "pickup",
        render: (_, record) => (
          <div>
            <Text strong>
              {record?.request_number ||
                record?.store_reference ||
                `Pickup #${record?.id}`}
            </Text>
            {record?.store_reference && (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Ref: {record.store_reference}
                </Text>
              </div>
            )}
          </div>
        ),
      },
      {
        title: "Shipments",
        key: "shipments",
        render: (_, record) => {
          const shipments = getShipmentItems(record);
          return (
            <div>
              <Text strong>{shipments.length}</Text>
              <Text type="secondary">
                {" "}
                parcel{shipments.length === 1 ? "" : "s"}
              </Text>
              {shipments.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <Text code style={{ fontSize: 11 }}>
                    {getTrackingNumber(shipments[0])}
                  </Text>
                  {shipments.length > 1 && (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {" "}
                      +{shipments.length - 1} more
                    </Text>
                  )}
                </div>
              )}
            </div>
          );
        },
      },
      {
        title: "Merchant / Pickup",
        key: "location",
        render: (_, record) => (
          <div>
            <div style={{ fontWeight: 600 }}>
              {record?.merchant?.name || record?.pickup_name || "-"}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record?.pickupLocation?.name ||
                record?.pickup_location?.name ||
                record?.pickup_address ||
                "-"}
            </Text>
          </div>
        ),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (status) => (
          <Tag color={statusColor(status)}>{statusLabel(status)}</Tag>
        ),
      },
      {
        title: "Actions",
        key: "actions",
        render: (_, record) => {
          const status = getStatus(record);
          const busy = actionLoading === record.id;
          const isActive = ["assigned", "accepted", "started", "arrived"].includes(status);

          return (
            <Space wrap size={4}>
              {status === "assigned" && (
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  loading={busy}
                  onClick={() =>
                    run(record.id, () => staffAcceptPickup(record.id))
                  }
                >
                  Accept
                </Button>
              )}

              {status === "accepted" && (
                <Button
                  type="primary"
                  size="small"
                  icon={<PlayCircleOutlined />}
                  loading={busy}
                  onClick={() =>
                    run(record.id, () => staffStartPickup(record.id))
                  }
                >
                  Start
                </Button>
              )}

              {status === "started" && (
                <Button
                  type="primary"
                  size="small"
                  icon={<EnvironmentOutlined />}
                  loading={busy}
                  onClick={() =>
                    run(record.id, () => staffArrivePickup(record.id))
                  }
                >
                  Arrived
                </Button>
              )}

              {status === "arrived" && (
                <Button
                  type="primary"
                  size="small"
                  icon={<InboxOutlined />}
                  onClick={() => setSelectedPickup(record)}
                >
                  Collect
                </Button>
              )}

              {status === "collected" && (
                <Button
                  type="primary"
                  size="small"
                  icon={<CarOutlined />}
                  loading={busy}
                  onClick={() =>
                    run(record.id, () => staffStartTransit(record.id))
                  }
                >
                  Start Transit
                </Button>
              )}

              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => setSelectedPickup(record)}
              >
                View
              </Button>

              {isActive && (
                <Button
                  size="small"
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => {
                    setFailTargetPickup(record);
                    setFailModalOpen(true);
                  }}
                >
                  Fail
                </Button>
              )}
            </Space>
          );
        },
      },
    ],
    [actionLoading]
  );

  /*
  |--------------------------------------------------------------------------
  | Shipment table inside modal
  |--------------------------------------------------------------------------
  */

  const shipmentColumns = [
    {
      title: "Tracking Number",
      key: "tracking_number",
      render: (_, shipment) => (
        <Text strong style={{ fontFamily: "monospace" }}>
          {getTrackingNumber(shipment)}
        </Text>
      ),
    },
    {
      title: "Customer",
      key: "customer",
      render: (_, shipment) => (
        <div>
          <div>{getCustomerName(shipment)}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {getCustomerPhone(shipment)}
          </Text>
        </div>
      ),
    },
    {
      title: "Delivery Address",
      key: "address",
      render: (_, shipment) => (
        <Text style={{ fontSize: 12 }}>{getDeliveryAddress(shipment)}</Text>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_, shipment) => {
        const status = getShipmentStatus(shipment);
        return <Tag color={statusColor(status)}>{statusLabel(status)}</Tag>;
      },
    },
    {
      title: "Action",
      key: "action",
      render: (_, shipment) => {
        const pickup = selectedPickup;
        const pickupStatus = getStatus(pickup);
        const shipmentStatus = getShipmentStatus(shipment);
        const shipmentId = shipment?.shipment_id ?? shipment?.id;
        const busy = actionLoading === `shipment-${shipmentId}`;

        if (pickupStatus !== "arrived") {
          if (["requested", "assigned", "accepted", "started"].includes(pickupStatus)) {
            return <Text type="secondary">Arrive first</Text>;
          }

          const custody = shipment?.pickup_state;
          if (custody?.state === "with_rider") {
            return <Tag color="blue">Collected · with rider</Tag>;
          }
          if (custody?.label) {
            return (
              <Tag color={custody.state === "received" ? "green" : "gold"}>
                {custody.label}
              </Tag>
            );
          }
          return <Tag color={statusColor(shipmentStatus)}>{statusLabel(shipmentStatus)}</Tag>;
        }

        if (shipmentStatus === "picked_up") {
          return <Tag color="green">Collected</Tag>;
        }
        if (shipmentStatus === "cancelled") {
          return <Tag color="red">Cancelled</Tag>;
        }

        return (
          <Button
            type="primary"
            size="small"
            icon={<InboxOutlined />}
            loading={busy}
            onClick={() => collectShipment(pickup, shipment)}
          >
            Collect
          </Button>
        );
      },
    },
  ];

  /*
  |--------------------------------------------------------------------------
  | Selected pickup metrics
  |--------------------------------------------------------------------------
  */

  const selectedShipments = getShipmentItems(selectedPickup);
  const selectedStatus = getStatus(selectedPickup);
  const pendingSelectedShipments = selectedShipments.filter((shipment) => {
    const status = getShipmentStatus(shipment);
    return isAwaitingCollection(status);
  });

  const merchantPhone =
    selectedPickup?.pickup_phone ||
    selectedPickup?.pickupLocation?.phone ||
    selectedPickup?.merchant?.phone;

  const pickupAddress =
    selectedPickup?.pickup_address ||
    selectedPickup?.pickupLocation?.address ||
    "";

  const pickupLat = selectedPickup?.pickup_lat || selectedPickup?.pickupLocation?.latitude;
  const pickupLng = selectedPickup?.pickup_lng || selectedPickup?.pickupLocation?.longitude;

  const mapsUrl =
    pickupLat && pickupLng
      ? `https://www.google.com/maps/dir/?api=1&destination=${pickupLat},${pickupLng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pickupAddress)}`;

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Segmented
          value={staffTab}
          onChange={setStaffTab}
          size="middle"
          options={[
            {
              label: (
                <Space size={6}>
                  <CarOutlined />
                  <span>My Pickup Runs (PR)</span>
                </Space>
              ),
              value: "runs",
            },
            {
              label: (
                <Space size={6}>
                  <UnorderedListOutlined />
                  <span>Individual Pickup Jobs (Legacy)</span>
                </Space>
              ),
              value: "list",
            },
          ]}
        />
        <Button onClick={load} loading={loading} icon={<ReloadOutlined />}>
          Refresh
        </Button>
      </div>

      {staffTab === "runs" ? (
        <StaffPickupRunPanel
          onChanged={load}
          refreshKey={runsRefreshKey}
          busyPickupId={actionLoading}
          onPickupAction={async (id, action) => {
            if (!id) return;
            const ACTIONS = {
              accept: [staffAcceptPickup, "Pickup accepted."],
              start: [staffStartPickup, "Trip started – heading to merchant."],
              arrive: [staffArrivePickup, "Arrived at merchant location."],
              transit: [staffStartTransit, "On the way to branch."],
            };
            if (ACTIONS[action]) {
              const [fn, msg] = ACTIONS[action];
              await run(id, () => fn(id), { successMessage: msg, openDetail: false });
              return;
            }
            // collect / fail need the legacy modals (parcel list, fail reason).
            let pickup = rows.find((r) => String(r.id) === String(id)) || null;
            try {
              const fetched = await staffGetPickup(id);
              if (fetched) pickup = fetched;
            } catch {
              // fall back to the list row
            }
            if (!pickup) {
              message.error({ content: "Could not open this pickup. Refresh and try again.", key: "staff-open-pickup" });
              return;
            }
            if (action === "fail") {
              setFailTargetPickup(pickup);
              setFailModalOpen(true);
            } else {
              setSelectedPickup(pickup);
            }
          }}
          onOpenPickup={async (id) => {
            try {
              const fetched = await staffGetPickup(id);
              if (fetched) {
                setSelectedPickup(fetched);
                return;
              }
            } catch {
              // fallback
            }
            const row = rows.find((r) => String(r.id) === String(id));
            if (row) setSelectedPickup(row);
          }}
        />
      ) : (
        <Card
          title="My Pickup Jobs (Legacy)"
          extra={
            <Button onClick={load} loading={loading} icon={<ReloadOutlined />}>
              Refresh
            </Button>
          }
        >
          {!rows.length && !loading ? (
            <Empty description="No pickup jobs assigned to you." />
          ) : (
            <Table
              rowKey="id"
              loading={loading}
              dataSource={rows}
              columns={columns}
              expandable={{
                expandedRowRender: (record) => {
                  const shipments = getShipmentItems(record);
                  if (!shipments.length) {
                    return (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No shipments attached to this pickup."
                      />
                    );
                  }
                  return (
                    <Table
                      rowKey={(s) => String(s.shipment_id ?? s.id)}
                      pagination={false}
                      size="small"
                      dataSource={shipments}
                      columns={[
                        {
                          title: "Tracking",
                          render: (_, s) => (
                            <Text strong style={{ fontFamily: "monospace" }}>
                              {getTrackingNumber(s)}
                            </Text>
                          ),
                        },
                        {
                          title: "Customer",
                          render: (_, s) => (
                            <div>
                              <div>{getCustomerName(s)}</div>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {getCustomerPhone(s)}
                              </Text>
                            </div>
                          ),
                        },
                        {
                          title: "Shipment Status",
                          render: (_, s) => {
                            const status = getShipmentStatus(s);
                            return (
                              <Tag color={statusColor(status)}>
                                {statusLabel(status)}
                              </Tag>
                            );
                          },
                        },
                      ]}
                    />
                  );
                },
              }}
            />
          )}
        </Card>
      )}

      {/* Pickup Detail Modal */}
      <Modal
        title={
          selectedPickup
            ? `Pickup ${
                selectedPickup.request_number ||
                selectedPickup.store_reference ||
                `#${selectedPickup.id}`
              }`
            : "Pickup Details"
        }
        open={Boolean(selectedPickup)}
        width={1050}
        onCancel={() => setSelectedPickup(null)}
        footer={null}
        destroyOnHidden
      >
        {selectedPickup && (
          <Space direction="vertical" style={{ width: "100%" }} size={16}>
            {/* Quick action bar for rider */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f0fdf4",
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #bbf7d0",
              }}
            >
              <Space>
                <Tag color={statusColor(selectedStatus)} style={{ fontSize: 13, padding: "2px 8px" }}>
                  {statusLabel(selectedStatus)}
                </Tag>
                <Text style={{ fontSize: 13 }}>
                  {pendingSelectedShipments.length === 0 && selectedShipments.length > 0
                    ? "All parcels collected. Ready for transit to branch."
                    : `${pendingSelectedShipments.length} of ${selectedShipments.length} parcel(s) pending collection`}
                </Text>
              </Space>

              <Space wrap>
                {selectedStatus === "assigned" && (
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    loading={actionLoading === selectedPickup.id}
                    onClick={() =>
                      run(selectedPickup.id, () => staffAcceptPickup(selectedPickup.id))
                    }
                  >
                    Accept Pickup
                  </Button>
                )}

                {selectedStatus === "accepted" && (
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    loading={actionLoading === selectedPickup.id}
                    onClick={() =>
                      run(selectedPickup.id, () => staffStartPickup(selectedPickup.id))
                    }
                  >
                    Start Trip
                  </Button>
                )}

                {selectedStatus === "started" && (
                  <Button
                    type="primary"
                    icon={<EnvironmentOutlined />}
                    loading={actionLoading === selectedPickup.id}
                    onClick={() =>
                      run(selectedPickup.id, () => staffArrivePickup(selectedPickup.id))
                    }
                  >
                    Mark Arrived
                  </Button>
                )}

                {selectedStatus === "arrived" && pendingSelectedShipments.length > 0 && (
                  <Button
                    type="primary"
                    icon={<InboxOutlined />}
                    loading={actionLoading === `collect-all-${selectedPickup.id}`}
                    onClick={() => collectAllPending(selectedPickup)}
                  >
                    Collect All ({pendingSelectedShipments.length})
                  </Button>
                )}

                {(selectedStatus === "collected" ||
                  (selectedStatus === "arrived" && pendingSelectedShipments.length === 0 && selectedShipments.length > 0)) && (
                  <Button
                    type="primary"
                    icon={<CarOutlined />}
                    loading={actionLoading === selectedPickup.id}
                    onClick={() =>
                      run(selectedPickup.id, () => staffStartTransit(selectedPickup.id))
                    }
                  >
                    Start Transit to Branch
                  </Button>
                )}

                {["assigned", "accepted", "started", "arrived"].includes(selectedStatus) && (
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={() => {
                      setFailTargetPickup(selectedPickup);
                      setFailModalOpen(true);
                    }}
                  >
                    Report Issue / Fail
                  </Button>
                )}
              </Space>
            </div>

            {/* Merchant Details & Navigation */}
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Pickup Number">
                <Text strong>{selectedPickup.request_number || "-"}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Store Reference">
                {selectedPickup.store_reference || "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Merchant">
                <Text strong>{selectedPickup.merchant?.name || selectedPickup.pickup_name || "-"}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Merchant Contact">
                <Space>
                  {merchantPhone ? (
                    <Button
                      type="link"
                      size="small"
                      icon={<PhoneOutlined />}
                      href={`tel:${merchantPhone}`}
                      style={{ paddingLeft: 0 }}
                    >
                      {merchantPhone}
                    </Button>
                  ) : (
                    "-"
                  )}
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Pickup Address" span={2}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{pickupAddress || "-"}</span>
                  {pickupAddress && (
                    <Button
                      size="small"
                      icon={<CompassOutlined />}
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Navigate
                    </Button>
                  )}
                </div>
              </Descriptions.Item>

              <Descriptions.Item label="Shipments Count">
                {selectedShipments.length}
              </Descriptions.Item>

              <Descriptions.Item label="Pending Collection">
                <Tag color={pendingSelectedShipments.length > 0 ? "gold" : "green"}>
                  {pendingSelectedShipments.length}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            {/* Shipments List */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Text strong style={{ fontSize: 14 }}>
                  Parcels for Pickup ({selectedShipments.length})
                </Text>

                {selectedStatus === "arrived" && pendingSelectedShipments.length > 1 && (
                  <Button
                    size="small"
                    type="primary"
                    icon={<InboxOutlined />}
                    loading={actionLoading === `collect-all-${selectedPickup.id}`}
                    onClick={() => collectAllPending(selectedPickup)}
                  >
                    Collect All Pending ({pendingSelectedShipments.length})
                  </Button>
                )}
              </div>

              {!selectedShipments.length ? (
                <Empty description="No shipments attached to this pickup." />
              ) : (
                <Table
                  rowKey={(s) => String(s.shipment_id ?? s.id)}
                  size="small"
                  pagination={false}
                  dataSource={selectedShipments}
                  columns={shipmentColumns}
                />
              )}
            </div>

            {/* Bottom finish/transit prompt */}
            {selectedStatus === "arrived" && pendingSelectedShipments.length === 0 && selectedShipments.length > 0 && (
              <Alert
                type="success"
                showIcon
                message="All parcels have been collected!"
                description="Click 'Start Transit to Branch' to close the collection phase and begin transit back to the origin branch."
                action={
                  <Button
                    type="primary"
                    icon={<CarOutlined />}
                    loading={actionLoading === selectedPickup.id}
                    onClick={() =>
                      run(selectedPickup.id, () => staffStartTransit(selectedPickup.id))
                    }
                  >
                    Start Transit
                  </Button>
                }
              />
            )}
          </Space>
        )}
      </Modal>

      {/* Failure Reason Modal */}
      <Modal
        title="Report Pickup Issue / Fail"
        open={failModalOpen}
        onCancel={() => {
          setFailModalOpen(false);
          setFailTargetPickup(null);
          setFailReasonNotes("");
        }}
        onOk={handleFailSubmit}
        confirmLoading={failLoading}
        okText="Confirm Failure"
        okButtonProps={{ danger: true }}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <Alert
            type="warning"
            showIcon
            message="Marking this pickup as failed will notify the branch manager and merchant."
            description="Select the reason why the pickup could not be fulfilled."
          />

          <Radio.Group
            value={failReasonType}
            onChange={(e) => setFailReasonType(e.target.value)}
          >
            <Space direction="vertical">
              {FAIL_REASON_OPTIONS.map((opt) => (
                <Radio key={opt.value} value={opt.value}>
                  {opt.label}
                </Radio>
              ))}
            </Space>
          </Radio.Group>

          <Text orientation="left" style={{ fontSize: 12 }}>
            Additional Remarks (Optional):
          </Text>
          <TextArea
            rows={3}
            placeholder="Provide any extra details about the situation..."
            value={failReasonNotes}
            onChange={(e) => setFailReasonNotes(e.target.value)}
          />
        </Space>
      </Modal>
    </>
  );
}
