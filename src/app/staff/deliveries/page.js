"use client";

import { useEffect, useState, useMemo } from "react";
import { Button, Card, Form, Input, Modal, Space, Tag, message, Segmented, Empty, Spin, Drawer, List, Avatar, Row, Col, Statistic, Badge, Tooltip, Pagination } from "antd";
import { PhoneOutlined, EnvironmentOutlined, FileTextOutlined, DollarOutlined, CheckCircleOutlined, SearchOutlined, FilterOutlined, UnorderedListOutlined, MenuOutlined } from "@ant-design/icons";
import { staffAcceptDelivery, staffGetDeliveries, staffMarkDelivered, staffMarkFailed, staffOutForDelivery } from "@/services/deliveryOperationsApi";
import styles from "./deliveries.module.css";

const STATUS_COLORS = {
  assigned: "gold",
  accepted: "blue",
  out_for_delivery: "cyan",
  delivered: "green",
  failed: "red",
  pending: "default",
};

const STATUS_DISPLAY = {
  assigned: "Assigned",
  accepted: "Accepted",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  failed: "Failed",
  pending: "Pending",
};

export default function StaffDeliveriesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [failedRow, setFailedRow] = useState(null);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [form] = Form.useForm();
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState("list"); // "list" or "detailed"
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function load() {
    setLoading(true);
    try { 
      setRows(await staffGetDeliveries()); 
    } catch { 
      message.error("Could not load deliveries."); 
    } finally { 
      setLoading(false); 
    }
  }

  useEffect(() => { load(); }, []);

  async function run(action) {
    try { 
      await action(); 
      message.success("Updated."); 
      setFailedRow(null); 
      form.resetFields(); 
      load(); 
    } catch (e) { 
      message.error(e?.response?.data?.message || "Action failed."); 
    }
  }

  const filteredRows = useMemo(() => {
    let result = filterStatus === "all" 
      ? rows 
      : rows.filter(r => r.status === filterStatus);

    if (searchText) {
      const search = searchText.toLowerCase();
      result = result.filter(r => 
        r.shipment?.tracking_number?.toLowerCase().includes(search) ||
        r.shipment?.receiver_name?.toLowerCase().includes(search) ||
        r.shipment?.receiver_phone?.includes(search) ||
        r.shipment?.delivery_address?.toLowerCase().includes(search)
      );
    }

    return result;
  }, [rows, filterStatus, searchText]);

  const paginatedRows = viewMode === "list" 
    ? filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filteredRows;

  const statusTabs = [
    { label: `All (${rows.length})`, value: "all" },
    { label: `Assigned (${rows.filter(r => r.status === "assigned").length})`, value: "assigned" },
    { label: `Accepted (${rows.filter(r => r.status === "accepted").length})`, value: "accepted" },
    { label: `Out (${rows.filter(r => r.status === "out_for_delivery").length})`, value: "out_for_delivery" },
    { label: `Delivered (${rows.filter(r => r.status === "delivered").length})`, value: "delivered" },
    { label: `Failed (${rows.filter(r => r.status === "failed").length})`, value: "failed" },
  ];

  const getStatusBadge = (status) => {
    const badges = {
      assigned: { status: "processing", text: "Assigned" },
      accepted: { status: "processing", text: "Accepted" },
      out_for_delivery: { status: "warning", text: "Out" },
      delivered: { status: "success", text: "Delivered" },
      failed: { status: "error", text: "Failed" },
    };
    return badges[status] || { status: "default", text: status };
  };

  const renderListItem = (delivery) => {
    const shipment = delivery.shipment || {};
    const isCollectable = delivery.total_collectable > 0;
    const badge = getStatusBadge(delivery.status);

    return (
      <List.Item 
        key={delivery.id}
        className={styles.listItem}
        onClick={() => setSelectedDelivery(delivery)}
        style={{ cursor: "pointer" }}
        extra={
          <Tag color={STATUS_COLORS[delivery.status]}>
            {STATUS_DISPLAY[delivery.status]}
          </Tag>
        }
      >
        <List.Item.Meta
          avatar={
            <Badge 
              count={isCollectable ? `Rs.${delivery.total_collectable}` : null}
              style={{ backgroundColor: "#faad14" }}
            >
              <Avatar style={{ backgroundColor: "#1890ff" }} size={48}>
                {shipment.receiver_name?.charAt(0) || "?"}
              </Avatar>
            </Badge>
          }
          title={
            <div>
              <div style={{ fontWeight: 600, fontSize: "14px" }}>
                {shipment.tracking_number || "N/A"}
              </div>
              <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
                {shipment.receiver_name || "N/A"}
              </div>
            </div>
          }
          description={
            <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
              <div>{shipment.delivery_address?.substring(0, 60)}...</div>
              <div style={{ marginTop: "4px" }}>
                <PhoneOutlined style={{ marginRight: "4px" }} />
                {shipment.receiver_phone || "N/A"}
              </div>
            </div>
          }
        />
      </List.Item>
    );
  };

  const renderDetailedCard = (delivery) => {
    const shipment = delivery.shipment || {};
    const isCollectable = delivery.total_collectable > 0;

    return (
      <Card 
        key={delivery.id}
        className={styles.deliveryCard}
        style={{ marginBottom: "16px" }}
        title={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "14px", color: "#666" }}>Tracking: </span>
              <span style={{ fontSize: "16px", fontWeight: "bold" }}>
                {shipment.tracking_number || "N/A"}
              </span>
            </div>
            <Tag color={STATUS_COLORS[delivery.status]}>
              {STATUS_DISPLAY[delivery.status]}
            </Tag>
          </div>
        }
        extra={
          <Button 
            size="small" 
            type="text" 
            icon={<FileTextOutlined />}
            onClick={() => setSelectedDelivery(delivery)}
          >
            Details
          </Button>
        }
      >
        <div className={styles.cardContent}>
          {/* Quick Info Row */}
          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Statistic 
                title="Customer" 
                value={shipment.receiver_name || "N/A"} 
                valueStyle={{ fontSize: "12px" }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic 
                title="Phone" 
                value={
                  <a href={`tel:${shipment.receiver_phone}`} style={{ color: "#0066cc" }}>
                    {shipment.receiver_phone || "N/A"}
                  </a>
                } 
                valueStyle={{ fontSize: "12px" }}
              />
            </Col>
            {isCollectable && (
              <Col xs={24} sm={12} md={6}>
                <Statistic 
                  title="Collect" 
                  value={delivery.total_collectable} 
                  prefix="Rs."
                  valueStyle={{ fontSize: "14px", color: "#faad14", fontWeight: "bold" }}
                />
              </Col>
            )}
            <Col xs={24} sm={12} md={6}>
              <Statistic 
                title="Items" 
                value={shipment.packet_products?.length || 0}
                valueStyle={{ fontSize: "12px" }}
              />
            </Col>
          </Row>

          {/* Address */}
          <div style={{ 
            marginTop: "16px",
            backgroundColor: "#f5f5f5", 
            padding: "12px", 
            borderRadius: "4px",
            lineHeight: "1.6",
            fontSize: "12px"
          }}>
            <EnvironmentOutlined style={{ marginRight: "6px", color: "#ff6b35" }} />
            {shipment.delivery_address || "N/A"}
          </div>

          {/* Action Buttons */}
          <div className={styles.actionSection} style={{ marginTop: "16px" }}>
            <Space wrap size="small">
              <Button 
                size="small"
                type="primary" 
                disabled={delivery.status !== "assigned"} 
                onClick={() => run(() => staffAcceptDelivery(delivery.id))}
              >
                Accept
              </Button>
              <Button 
                size="small"
                disabled={!['accepted','assigned'].includes(delivery.status)} 
                onClick={() => run(() => staffOutForDelivery(delivery.id))}
              >
                Out For Delivery
              </Button>
              <Button 
                size="small"
                type="primary" 
                icon={<CheckCircleOutlined />}
                disabled={delivery.status !== "out_for_delivery"} 
                onClick={() => run(() => staffMarkDelivered(delivery.id, { otp_verified: true, proof_type: "signature", proof_value: "received" }))}
              >
                Delivered
              </Button>
              <Button 
                size="small"
                danger 
                disabled={delivery.status !== "out_for_delivery"} 
                onClick={() => setFailedRow(delivery)}
              >
                Failed
              </Button>
            </Space>
          </div>
        </div>
      </Card>
    );
  };

  const renderDetailedDrawer = (delivery) => {
    if (!delivery) return null;

    const shipment = delivery.shipment || {};
    const isCollectable = delivery.total_collectable > 0;

    return (
      <Drawer
        title={`Delivery Details - ${shipment.tracking_number || "N/A"}`}
        placement="right"
        width={500}
        onClose={() => setSelectedDelivery(null)}
        open={!!selectedDelivery}
      >
        <div className={styles.drawerContent}>
          {/* Customer Section */}
          <div className={styles.section}>
            <h4 style={{ marginBottom: "12px", color: "#333", fontWeight: "600" }}>Customer Information</h4>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <div className={styles.label}>Name</div>
                <div className={styles.value}>{shipment.receiver_name || "N/A"}</div>
              </div>
              <div className={styles.infoItem}>
                <div className={styles.label}>Phone</div>
                <div className={styles.value}>
                  <a href={`tel:${shipment.receiver_phone}`}>
                    {shipment.receiver_phone || "N/A"}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className={styles.section}>
            <h4 style={{ marginBottom: "12px", color: "#333", fontWeight: "600" }}>
              <EnvironmentOutlined style={{ marginRight: "6px", color: "#ff6b35" }} />
              Delivery Address
            </h4>
            <div style={{ 
              backgroundColor: "#f5f5f5", 
              padding: "12px", 
              borderRadius: "4px",
              lineHeight: "1.6"
            }}>
              {shipment.delivery_address || "N/A"}
            </div>
          </div>

          {/* Shipment Details */}
          <div className={styles.section}>
            <h4 style={{ marginBottom: "12px", color: "#333", fontWeight: "600" }}>Shipment Details</h4>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <div className={styles.label}>Items</div>
                <div className={styles.value}>{shipment.packet_products?.length || 0}</div>
              </div>
              <div className={styles.infoItem}>
                <div className={styles.label}>Type</div>
                <div className={styles.value}>{delivery.delivery_type || "Standard"}</div>
              </div>
            </div>

            {shipment.packet_products && shipment.packet_products.length > 0 && (
              <div style={{ marginTop: "12px" }}>
                <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "8px", color: "#666" }}>
                  Items:
                </div>
                <ul style={{ margin: "0", paddingLeft: "20px" }}>
                  {shipment.packet_products.map((product, idx) => (
                    <li key={idx} style={{ fontSize: "12px", marginBottom: "4px" }}>
                      {product.name || "Item"} {product.quantity ? `x${product.quantity}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Collection Section */}
          {isCollectable && (
            <div style={{ backgroundColor: "#fffacd", padding: "12px", borderRadius: "4px", marginBottom: "16px" }}>
              <h4 style={{ marginBottom: "8px", color: "#333", fontWeight: "600" }}>
                <DollarOutlined style={{ marginRight: "6px", color: "#faad14" }} />
                Cash Collection
              </h4>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#faad14" }}>
                Rs. {delivery.total_collectable?.toFixed(2) || "0.00"}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ marginTop: "24px" }}>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Button 
                block
                size="large"
                type="primary" 
                disabled={delivery.status !== "assigned"} 
                onClick={() => run(() => staffAcceptDelivery(delivery.id))}
              >
                Accept Delivery
              </Button>
              <Button 
                block
                size="large"
                disabled={!['accepted','assigned'].includes(delivery.status)} 
                onClick={() => run(() => staffOutForDelivery(delivery.id))}
              >
                Out For Delivery
              </Button>
              <Button 
                block
                size="large"
                type="primary" 
                icon={<CheckCircleOutlined />}
                disabled={delivery.status !== "out_for_delivery"} 
                onClick={() => run(() => staffMarkDelivered(delivery.id, { otp_verified: true, proof_type: "signature", proof_value: "received" }))}
              >
                Mark Delivered
              </Button>
              <Button 
                block
                size="large"
                danger 
                disabled={delivery.status !== "out_for_delivery"} 
                onClick={() => setFailedRow(delivery)}
              >
                Mark Failed
              </Button>
            </Space>
          </div>
        </div>
      </Drawer>
    );
  };

  return (
    <>
      {/* Header */}
      <Card 
        style={{ marginBottom: "24px" }}
        title={
          <div>
            <h2 style={{ margin: 0 }}>📦 Delivery Jobs</h2>
            <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: "12px" }}>
              {filteredRows.length} delivery{filteredRows.length !== 1 ? 's' : ''} to manage
            </p>
          </div>
        }
      >
        <div style={{ marginBottom: "16px" }}>
          <Segmented 
            options={statusTabs}
            value={filterStatus}
            onChange={(val) => { setFilterStatus(val); setCurrentPage(1); }}
            block
            style={{ width: "100%" }}
          />
        </div>

        {/* Search and View Mode */}
        <Row gutter={16} style={{ marginBottom: "16px" }}>
          <Col xs={24} sm={16}>
            <Input
              placeholder="Search by tracking #, name, phone, or address..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8}>
            <Segmented 
              value={viewMode}
              onChange={setViewMode}
              options={[
                { label: <UnorderedListOutlined title="List View" />, value: "list" },
                { label: <MenuOutlined title="Detailed View" />, value: "detailed" },
              ]}
              block
            />
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading}>
        {filteredRows.length === 0 ? (
          <Empty 
            description={filterStatus === "all" ? "No deliveries assigned" : "No deliveries with this status"}
            style={{ marginTop: "50px" }}
          />
        ) : viewMode === "list" ? (
          <>
            <List
              dataSource={paginatedRows}
              renderItem={renderListItem}
              split
              bordered
            />
            {filteredRows.length > pageSize && (
              <div style={{ textAlign: "center", marginTop: "24px" }}>
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={filteredRows.length}
                  onChange={setCurrentPage}
                  pageSizeOptions={[5, 10, 20, 50]}
                  onShowSizeChange={(_, size) => { setPageSize(size); setCurrentPage(1); }}
                  showSizeChanger
                  showTotal={(total) => `Total ${total} deliveries`}
                />
              </div>
            )}
          </>
        ) : (
          <div>
            {paginatedRows.map(renderDetailedCard)}
          </div>
        )}
      </Spin>

      {/* Detailed View Drawer */}
      {renderDetailedDrawer(selectedDelivery)}

      {/* Failed Delivery Modal */}
      <Modal 
        title="Report Failed Delivery" 
        open={!!failedRow} 
        onCancel={() => setFailedRow(null)} 
        onOk={() => form.validateFields().then((v) => run(() => staffMarkFailed(failedRow.id, v.reason)))}
        width={600}
      >
        <div style={{ marginBottom: "16px" }}>
          <strong>Tracking:</strong> {failedRow?.shipment?.tracking_number}
          <br />
          <strong>Customer:</strong> {failedRow?.shipment?.receiver_name}
          <br />
          <strong>Address:</strong> {failedRow?.shipment?.delivery_address}
        </div>
        <Form form={form} layout="vertical">
          <Form.Item 
            name="reason" 
            label="Reason for Failure" 
            rules={[
              { required: true, message: "Please provide a reason" },
              { min: 10, message: "Please provide a detailed reason (minimum 10 characters)" }
            ]}
          >
            <Input.TextArea rows={4} placeholder="e.g., Customer not available, address not found, etc." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
