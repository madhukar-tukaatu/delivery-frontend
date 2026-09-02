"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Button,
  Card,
  Descriptions,
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
  EyeOutlined,
  InboxOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";

import {
  staffAcceptPickup,
  staffStartPickup,
  staffArrivePickup,
  staffCollectPickupShipment,
  staffCompletePickup,
  staffGetPickups,
} from "@/services/deliveryOperationsApi";

const { Text } = Typography;

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function getStatus(record) {
  return String(
    record?.status ?? ""
  ).toLowerCase();
}

/**
 * Pickup API may return:
 *
 * shipments: [
 *   {
 *     shipment_id: 123,
 *     shipment: {...}
 *   }
 * ]
 *
 * Normalize that here.
 */
function getShipmentItems(record) {
  if (!record) {
    return [];
  }

  if (Array.isArray(record.shipments)) {
    return record.shipments
      .map((item) => {
        /*
         * Normal pivot structure:
         *
         * {
         *   id,
         *   shipment_id,
         *   shipment: {...}
         * }
         */
        if (item?.shipment) {
          return {
            ...item.shipment,
            pickup_item_id: item.id,
            shipment_id:
              item.shipment_id ??
              item.shipment.id,
          };
        }

        /*
         * Fallback if API returns shipment directly.
         */
        return {
          ...item,
          shipment_id:
            item?.shipment_id ??
            item?.id,
        };
      })
      .filter(
        (shipment) =>
          shipment &&
          shipment.shipment_id
      );
  }

  /*
   * Fallback for alternative API structures.
   */
  if (
    Array.isArray(
      record.shipment_items
    )
  ) {
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

function getShipmentStatus(shipment) {
  return String(
    shipment?.status ?? ""
  ).toLowerCase();
}

function statusLabel(status) {
  if (!status) {
    return "-";
  }

  return String(status)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
}

function statusColor(status) {
  switch (
    String(status ?? "").toLowerCase()
  ) {
    case "awaiting_pickup":
      return "gold";

    case "pickup_assigned":
      return "blue";

    case "picked_up":
      return "green";

    case "cancelled":
      return "red";

    case "assigned":
      return "blue";

    case "accepted":
      return "cyan";

    case "started":
      return "processing";

    case "arrived":
      return "purple";

    case "completed":
      return "success";

    case "failed":
      return "error";

    default:
      return "default";
  }
}

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/

export default function StaffPickupsPage() {
  const [rows, setRows] = useState([]);

  const [loading, setLoading] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(null);

  const [selectedPickup, setSelectedPickup] =
    useState(null);

  const load = useCallback(
    async () => {
      try {
        setLoading(true);

        const data =
          await staffGetPickups();

        /*
         * staffGetPickups() already normalizes
         * the Laravel response.
         */
        setRows(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (error) {
        console.error(
          "Failed to load staff pickups:",
          error
        );

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

  /*
  |--------------------------------------------------------------------------
  | Pickup action
  |--------------------------------------------------------------------------
  */

  const run = async (
    id,
    action
  ) => {
    try {
      setActionLoading(id);

      await action();

      message.success(
        "Pickup updated successfully."
      );

      await load();

      /*
       * Refresh selected pickup as well.
       *
       * The list reload may contain the
       * updated shipment statuses.
       */
      setSelectedPickup((current) => {
        if (!current) {
          return null;
        }

        const updated = rows.find(
          (row) =>
            Number(row.id) ===
            Number(current.id)
        );

        return updated ?? current;
      });
    } catch (error) {
      console.error(
        "Pickup action failed:",
        error
      );

      const errors =
        error?.response?.data?.errors;

      if (errors) {
        const firstError =
          Object.values(errors)
            .flat()
            .find(Boolean);

        if (firstError) {
          message.error(
            firstError
          );
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
  | Collect shipment
  |--------------------------------------------------------------------------
  */

  const collectShipment = async (
    pickup,
    shipment
  ) => {
    const pickupId =
      pickup?.id;

    const shipmentId =
      shipment?.shipment_id ??
      shipment?.id;

    if (!pickupId) {
      message.error(
        "Pickup ID is missing."
      );
      return;
    }

    if (!shipmentId) {
      message.error(
        "Shipment ID is missing."
      );
      return;
    }

    try {
      setActionLoading(
        `shipment-${shipmentId}`
      );

      await staffCollectPickupShipment(
        pickupId,
        shipmentId,
        {
          remarks:
            "Shipment collected by rider.",
        }
      );

      message.success(
        `Shipment ${getTrackingNumber(
          shipment
        )} collected successfully.`
      );

      await load();

      /*
       * Reload selected pickup if
       * the details modal is open.
       */
      const refreshed =
        await staffGetPickups();

      if (Array.isArray(refreshed)) {
        const updatedPickup =
          refreshed.find(
            (item) =>
              Number(item.id) ===
              Number(pickupId)
          );

        if (updatedPickup) {
          setSelectedPickup(
            updatedPickup
          );
        }
      }
    } catch (error) {
      console.error(
        "Collect shipment failed:",
        error
      );

      const errors =
        error?.response?.data?.errors;

      if (errors) {
        const firstError =
          Object.values(errors)
            .flat()
            .find(Boolean);

        if (firstError) {
          message.error(
            firstError
          );
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
  | Pickup table
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
                <Text type="secondary">
                  Store ref:{" "}
                  {
                    record.store_reference
                  }
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
          const shipments =
            getShipmentItems(
              record
            );

          return (
            <div>
              <Text strong>
                {shipments.length}
              </Text>

              <Text type="secondary">
                {" "}
                shipment
                {shipments.length === 1
                  ? ""
                  : "s"}
              </Text>

              {shipments.length > 0 && (
                <div
                  style={{
                    marginTop: 4,
                  }}
                >
                  <Text code>
                    {getTrackingNumber(
                      shipments[0]
                    )}
                  </Text>

                  {shipments.length >
                    1 && (
                    <Text type="secondary">
                      {" "}
                      +
                      {shipments.length -
                        1}{" "}
                      more
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
            <div>
              {record?.merchant
                ?.name ||
                record?.pickup_name ||
                "-"}
            </div>

            <Text type="secondary">
              {record
                ?.pickupLocation
                ?.name ||
                record
                  ?.pickup_location
                  ?.name ||
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
          <Tag
            color={statusColor(
              status
            )}
          >
            {statusLabel(status)}
          </Tag>
        ),
      },

      {
        title: "Actions",
        key: "actions",
        render: (_, record) => {
          const status =
            getStatus(record);

          const busy =
            actionLoading ===
            record.id;

          const shipments =
            getShipmentItems(
              record
            );

          const pendingShipmentCount =
            shipments.filter(
              (shipment) => {
                const shipmentStatus =
                  getShipmentStatus(
                    shipment
                  );

                return (
                  shipmentStatus !==
                    "picked_up" &&
                  shipmentStatus !==
                    "cancelled"
                );
              }
            ).length;

          return (
            <Space wrap>
              {status ===
                "assigned" && (
                <Button
                  type="primary"
                  icon={
                    <CheckCircleOutlined />
                  }
                  loading={busy}
                  onClick={() =>
                    run(
                      record.id,
                      () =>
                        staffAcceptPickup(
                          record.id
                        )
                    )
                  }
                >
                  Accept
                </Button>
              )}

              {status ===
                "accepted" && (
                <Button
                  type="primary"
                  icon={
                    <PlayCircleOutlined />
                  }
                  loading={busy}
                  onClick={() =>
                    run(
                      record.id,
                      () =>
                        staffStartPickup(
                          record.id
                        )
                    )
                  }
                >
                  Start
                </Button>
              )}

              {status ===
                "started" && (
                <Button
                  type="primary"
                  icon={
                    <EnvironmentOutlined />
                  }
                  loading={busy}
                  onClick={() =>
                    run(
                      record.id,
                      () =>
                        staffArrivePickup(
                          record.id
                        )
                    )
                  }
                >
                  Arrived
                </Button>
              )}

              {status ===
                "arrived" && (
                <Button
                  type="primary"
                  icon={
                    <InboxOutlined />
                  }
                  onClick={() =>
                    setSelectedPickup(
                      record
                    )
                  }
                >
                  Collect
                </Button>
              )}

              {status ===
                "arrived" &&
                pendingShipmentCount ===
                  0 && (
                  <Button
                    type="primary"
                    loading={busy}
                    onClick={() =>
                      run(
                        record.id,
                        () =>
                          staffCompletePickup(
                            record.id,
                            {
                              note:
                                "Pickup completed.",
                            }
                          )
                      )
                    }
                  >
                    Complete
                  </Button>
                )}

              <Button
                icon={
                  <EyeOutlined />
                }
                onClick={() =>
                  setSelectedPickup(
                    record
                  )
                }
              >
                View
              </Button>
            </Space>
          );
        },
      },
    ],
    [actionLoading, load]
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
        <Text strong>
          {getTrackingNumber(
            shipment
          )}
        </Text>
      ),
    },

    {
      title: "Customer",
      key: "customer",
      render: (_, shipment) => (
        <div>
          <div>
            {getCustomerName(
              shipment
            )}
          </div>

          <Text type="secondary">
            {getCustomerPhone(
              shipment
            )}
          </Text>
        </div>
      ),
    },

    {
      title: "Delivery Address",
      key: "address",
      render: (_, shipment) => (
        <Text>
          {getDeliveryAddress(
            shipment
          )}
        </Text>
      ),
    },

    {
      title: "Shipment Status",
      key: "status",
      render: (_, shipment) => {
        const status =
          getShipmentStatus(
            shipment
          );

        return (
          <Tag
            color={statusColor(
              status
            )}
          >
            {statusLabel(status)}
          </Tag>
        );
      },
    },

    {
      title: "Action",
      key: "action",
      render: (_, shipment) => {
        const pickup =
          selectedPickup;

        const pickupStatus =
          getStatus(pickup);

        const shipmentStatus =
          getShipmentStatus(
            shipment
          );

        const shipmentId =
          shipment?.shipment_id ??
          shipment?.id;

        const busy =
          actionLoading ===
          `shipment-${shipmentId}`;

        /*
         * Collection is only possible
         * after rider has arrived.
         */
        if (
          pickupStatus !==
          "arrived"
        ) {
          return (
            <Text type="secondary">
              Arrive first
            </Text>
          );
        }

        /*
         * Already collected.
         */
        if (
          shipmentStatus ===
          "picked_up"
        ) {
          return (
            <Tag color="green">
              Collected
            </Tag>
          );
        }

        /*
         * Cancelled.
         */
        if (
          shipmentStatus ===
          "cancelled"
        ) {
          return (
            <Tag color="red">
              Cancelled
            </Tag>
          );
        }

        /*
         * Collect.
         */
        return (
          <Button
            type="primary"
            size="small"
            icon={
              <InboxOutlined />
            }
            loading={busy}
            onClick={() =>
              collectShipment(
                pickup,
                shipment
              )
            }
          >
            Collect
          </Button>
        );
      },
    },
  ];

  /*
  |--------------------------------------------------------------------------
  | Selected pickup shipments
  |--------------------------------------------------------------------------
  */

  const selectedShipments =
    getShipmentItems(
      selectedPickup
    );

  const selectedStatus =
    getStatus(
      selectedPickup
    );

  const pendingSelectedShipments =
    selectedShipments.filter(
      (shipment) => {
        const status =
          getShipmentStatus(
            shipment
          );

        return (
          status !==
            "picked_up" &&
          status !==
            "cancelled"
        );
      }
    );

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

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
        {!rows.length &&
        !loading ? (
          <Empty
            description="No pickup jobs assigned to you."
          />
        ) : (
          <Table
            rowKey="id"
            loading={loading}
            dataSource={rows}
            columns={columns}
            expandable={{
              expandedRowRender:
                (record) => {
                  const shipments =
                    getShipmentItems(
                      record
                    );

                  if (
                    !shipments.length
                  ) {
                    return (
                      <Empty
                        image={
                          Empty.PRESENTED_IMAGE_SIMPLE
                        }
                        description="No shipments attached to this pickup."
                      />
                    );
                  }

                  return (
                    <Table
                      rowKey={(shipment) =>
                        String(
                          shipment.shipment_id ??
                            shipment.id
                        )
                      }
                      pagination={
                        false
                      }
                      size="small"
                      dataSource={
                        shipments
                      }
                      columns={[
                        {
                          title:
                            "Tracking",
                          render:
                            (
                              _,
                              shipment
                            ) => (
                              <Text strong>
                                {getTrackingNumber(
                                  shipment
                                )}
                              </Text>
                            ),
                        },

                        {
                          title:
                            "Customer",
                          render:
                            (
                              _,
                              shipment
                            ) => (
                              <div>
                                <div>
                                  {getCustomerName(
                                    shipment
                                  )}
                                </div>

                                <Text type="secondary">
                                  {getCustomerPhone(
                                    shipment
                                  )}
                                </Text>
                              </div>
                            ),
                        },

                        {
                          title:
                            "Shipment Status",
                          render:
                            (
                              _,
                              shipment
                            ) => {
                              const status =
                                getShipmentStatus(
                                  shipment
                                );

                              return (
                                <Tag
                                  color={statusColor(
                                    status
                                  )}
                                >
                                  {statusLabel(
                                    status
                                  )}
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
        open={Boolean(
          selectedPickup
        )}
        width={1100}
        onCancel={() =>
          setSelectedPickup(
            null
          )
        }
        footer={null}
      >
        {selectedPickup && (
          <>
            <Descriptions
              bordered
              column={2}
              size="small"
            >
              <Descriptions.Item label="Pickup Number">
                {selectedPickup.request_number ||
                  "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Store Reference">
                {selectedPickup.store_reference ||
                  "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Merchant">
                {selectedPickup
                  .merchant
                  ?.name ||
                  "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Pickup Location">
                {selectedPickup
                  .pickupLocation
                  ?.name ||
                  selectedPickup
                    .pickup_location
                    ?.name ||
                  "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Pickup Phone">
                {selectedPickup.pickup_phone ||
                  selectedPickup
                    .pickupLocation
                    ?.phone ||
                  "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Status">
                <Tag
                  color={statusColor(
                    selectedStatus
                  )}
                >
                  {statusLabel(
                    selectedStatus
                  )}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item
                label="Pickup Address"
                span={2}
              >
                {selectedPickup.pickup_address ||
                  selectedPickup
                    .pickupLocation
                    ?.address ||
                  "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Shipment Count">
                {selectedShipments.length}
              </Descriptions.Item>

              <Descriptions.Item label="Pending Collection">
                {pendingSelectedShipments.length}
              </Descriptions.Item>
            </Descriptions>

            <div
              style={{
                marginTop: 24,
                marginBottom: 12,
              }}
            >
              <Text strong>
                Shipments in this pickup
              </Text>
            </div>

            {!selectedShipments.length ? (
              <Empty
                description="No shipments attached to this pickup."
              />
            ) : (
              <Table
                rowKey={(shipment) =>
                  String(
                    shipment.shipment_id ??
                      shipment.id
                  )
                }
                size="small"
                pagination={false}
                dataSource={
                  selectedShipments
                }
                columns={
                  shipmentColumns
                }
              />
            )}

            {selectedStatus ===
              "arrived" && (
              <div
                style={{
                  marginTop: 20,
                  display: "flex",
                  justifyContent:
                    "flex-end",
                }}
              >
                <Space>
                  {pendingSelectedShipments.length >
                    0 && (
                    <Text type="warning">
                      Collect all shipments
                      before completing
                      this pickup.
                    </Text>
                  )}

                  {pendingSelectedShipments.length ===
                    0 && (
                    <Button
                      type="primary"
                      loading={
                        actionLoading ===
                        selectedPickup.id
                      }
                      onClick={() =>
                        run(
                          selectedPickup.id,
                          () =>
                            staffCompletePickup(
                              selectedPickup.id,
                              {
                                note:
                                  "Pickup completed.",
                              }
                            )
                        )
                      }
                    >
                      Complete Pickup
                    </Button>
                  )}
                </Space>
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
}