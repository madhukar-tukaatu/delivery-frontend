"use client";

import React, {
  useEffect,
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
  message,
} from "antd";

import {
  CheckCircleOutlined,
  EnvironmentOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";

import {
  staffAcceptPickup,
  staffStartPickup,
  staffArrivePickup,
  staffCompletePickup,
  staffGetPickups,
} from "@/services/deliveryOperationsApi";

function getStatus(record) {
  return String(
    record?.status ?? ""
  ).toLowerCase();
}

function getCustomerName(record) {
  return (
    record?.customer_name ||
    record?.receiver_name ||
    record?.customer?.name ||
    "-"
  );
}

function getCustomerPhone(record) {
  return (
    record?.customer_phone ||
    record?.receiver_phone ||
    record?.customer?.phone ||
    "-"
  );
}

export default function StaffPickupsPage() {
  const [rows, setRows] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(null);

  const [selectedPickup, setSelectedPickup] =
    useState(null);

  const load = async () => {
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
  };

  useEffect(() => {
    load();
  }, []);

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
    } catch (error) {
      console.error(error);

      message.error(
        error?.response?.data?.message ||
          "Pickup action failed."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const columns = [
    {
      title: "Tracking",
      dataIndex:
        "tracking_number",
      key: "tracking",
    },

    {
      title: "Customer",
      key: "customer",
      render: (_, record) => (
        <div>
          <div>
            {getCustomerName(
              record
            )}
          </div>

          <div
            style={{
              color: "#888",
            }}
          >
            {getCustomerPhone(
              record
            )}
          </div>
        </div>
      ),
    },

    {
      title: "Pickup Location",
      key: "location",
      render: (_, record) =>
        record?.pickup_location
          ?.name ||
        record?.merchant?.name ||
        record?.pickup_address ||
        "-",
    },

    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag>
          {status}
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
          />
        )}
      </Card>

      <Modal
        title="Pickup Details"
        open={
          Boolean(
            selectedPickup
          )
        }
        onCancel={() =>
          setSelectedPickup(
            null
          )
        }
        footer={null}
      >
        {selectedPickup && (
          <Descriptions
            bordered
            column={1}
          >
            <Descriptions.Item label="Tracking">
              {
                selectedPickup.tracking_number
              }
            </Descriptions.Item>

            <Descriptions.Item label="Customer">
              {getCustomerName(
                selectedPickup
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Phone">
              {getCustomerPhone(
                selectedPickup
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Status">
              <Tag>
                {
                  selectedPickup.status
                }
              </Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Address">
              {
                selectedPickup.pickup_address ||
                selectedPickup.address ||
                "-"
              }
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  );
}