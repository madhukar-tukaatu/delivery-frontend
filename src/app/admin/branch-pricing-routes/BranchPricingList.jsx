"use client";

import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Modal,
  Row,
  Space,
  Table,
  Tag,
  Typography,
  message,
  Popconfirm,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  getBranchPricings,
  deleteBranchPricing,
} from "@/services/branchPricingRouteService";

const { Text } = Typography;

/**
 * Branch Pricing List Component
 * Displays all pricing rules with service type badges
 */
export default function BranchPricingList({
  onEdit,
  onCreateNew,
  refreshTrigger,
}) {
  const [pricings, setPricings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPricing, setSelectedPricing] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    loadPricings();
  }, [refreshTrigger]);

  async function loadPricings() {
    try {
      setLoading(true);
      const data = await getBranchPricings();
      setPricings(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error("Could not load branch pricing");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(pricingId) {
    try {
      await deleteBranchPricing(pricingId);
      message.success("Pricing deleted successfully");
      await loadPricings();
    } catch (error) {
      message.error(error?.response?.data?.message || "Delete failed");
    }
  }

  function handleViewDetails(pricing) {
    setSelectedPricing(pricing);
    setDetailsOpen(true);
  }

  // Get badge color based on service type
  function getServiceTypeColor(serviceType) {
    switch (serviceType) {
      case "standard":
        return "blue";
      case "express":
        return "orange";
      case "same_day":
        return "red";
      default:
        return "default";
    }
  }

  // Get service type label
  function getServiceTypeLabel(serviceType) {
    switch (serviceType) {
      case "standard":
        return "STANDARD";
      case "express":
        return "EXPRESS";
      case "same_day":
        return "SAME DAY";
      default:
        return serviceType;
    }
  }

  // Main table columns
  const columns = [
    {
      title: "Route",
      key: "route",
      render: (_, record) => (
        <div>
          <Text strong>
            {record.pickup_branch.code} → {record.delivery_branch.code}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.pickup_branch.name} to {record.delivery_branch.name}
          </Text>
        </div>
      ),
    },

    {
      title: "Service Types",
      key: "service_types",
      render: (_, record) => (
        <Space wrap>
          {record.service_types.map((st) => (
            <Tag
              key={st.service_type}
              color={getServiceTypeColor(st.service_type)}
            >
              {getServiceTypeLabel(st.service_type)}
            </Tag>
          ))}
        </Space>
      ),
    },

    {
      title: "Distance",
      key: "distance",
      render: (_, record) => {
        const first = record.service_types[0];
        return first?.route?.total_distance_km ? (
          <Text>{first.route.total_distance_km} km</Text>
        ) : (
          <Text type="secondary">-</Text>
        );
      },
    },

    {
      title: "Base Rates",
      key: "rates",
      render: (_, record) => (
        <div>
          {record.service_types.map((st) => (
            <div key={st.service_type} style={{ marginBottom: 4 }}>
              <Text style={{ fontSize: 12 }}>
                <Tag
                  color={getServiceTypeColor(st.service_type)}
                  style={{ marginRight: 4 }}
                >
                  {getServiceTypeLabel(st.service_type).substring(0, 3)}
                </Tag>
                ₨ {st.base_rate}
              </Text>
            </div>
          ))}
        </div>
      ),
    },

    {
      title: "Actions",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
            title="View Details"
          />
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit?.(record)}
            title="Edit"
          />
          <Popconfirm
            title="Delete Pricing"
            description="This will delete all service types for this route. Continue?"
            onConfirm={() => handleDelete(record.service_types[0].id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              title="Delete"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title="Branch Pricing Rules"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreateNew}
          >
            New Pricing
          </Button>
        }
      >
        {pricings.length === 0 && !loading ? (
          <Empty description="No branch pricing configured" />
        ) : (
          <Table
            rowKey={(record) =>
              `${record.pickup_branch_id}_${record.delivery_branch_id}`
            }
            columns={columns}
            dataSource={pricings}
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: true }}
          />
        )}
      </Card>

      {/* Details Modal */}
      <Modal
        title={
          selectedPricing && (
            <div>
              <Text strong>
                {selectedPricing.pickup_branch.code} →{" "}
                {selectedPricing.delivery_branch.code}
              </Text>
              <br />
              <Text type="secondary">
                {selectedPricing.pickup_branch.name} to{" "}
                {selectedPricing.delivery_branch.name}
              </Text>
            </div>
          )
        }
        open={detailsOpen}
        onCancel={() => setDetailsOpen(false)}
        width={900}
        footer={null}
      >
        {selectedPricing && (
          <>
            {/* Route Overview */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={6}>
                  <div>
                    <Text type="secondary">Distance</Text>
                    <div style={{ fontSize: 16, fontWeight: "bold" }}>
                      {selectedPricing.service_types[0]?.route
                        ?.total_distance_km || "-"}{" "}
                      km
                    </div>
                  </div>
                </Col>
                <Col xs={24} md={6}>
                  <div>
                    <Text type="secondary">Transfer Count</Text>
                    <div style={{ fontSize: 16, fontWeight: "bold" }}>
                      {selectedPricing.service_types[0]?.route
                        ?.transfer_count || 0}
                    </div>
                  </div>
                </Col>
                <Col xs={24} md={6}>
                  <div>
                    <Text type="secondary">Transit Stops</Text>
                    <div style={{ fontSize: 16, fontWeight: "bold" }}>
                      {selectedPricing.service_types[0]?.route
                        ?.transit_count || 0}
                    </div>
                  </div>
                </Col>
                <Col xs={24} md={6}>
                  <div>
                    <Text type="secondary">Service Types</Text>
                    <div style={{ fontSize: 16, fontWeight: "bold" }}>
                      {selectedPricing.service_types.length}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* Service Type Breakdown */}
            <div>
              <Text strong>Service Type Pricing</Text>
              <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
                {selectedPricing.service_types.map((st) => (
                  <Col xs={24} md={8} key={st.service_type}>
                    <Card
                      size="small"
                      style={{
                        borderColor: getServiceTypeColor(st.service_type),
                        borderWidth: 2,
                      }}
                    >
                      <Space direction="vertical" style={{ width: "100%" }}>
                        <div>
                          <Tag color={getServiceTypeColor(st.service_type)}>
                            {getServiceTypeLabel(st.service_type)}
                          </Tag>
                        </div>
                        <Descriptions size="small" column={1}>
                          <Descriptions.Item label="Base Rate">
                            <Text strong>₨ {st.base_rate}</Text>
                          </Descriptions.Item>
                          <Descriptions.Item label="Delivery Time">
                            {st.route?.total_estimated_hours || "-"} hours
                          </Descriptions.Item>
                          <Descriptions.Item label="Route Code">
                            <Text code>{st.route?.code}</Text>
                          </Descriptions.Item>
                        </Descriptions>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>

            {/* Action Buttons */}
            <Space style={{ marginTop: 20 }}>
              <Button type="primary" onClick={() => onEdit?.(selectedPricing)}>
                Edit Pricing
              </Button>
              <Button onClick={() => setDetailsOpen(false)}>Close</Button>
            </Space>
          </>
        )}
      </Modal>
    </>
  );
}
