"use client";

import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Modal, Space, Tag, message, Segmented, Empty, Spin } from "antd";
import { PhoneOutlined, EnvironmentOutlined, FileTextOutlined, DollarOutlined, CheckCircleOutlined } from "@ant-design/icons";
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
  const [form] = Form.useForm();
  const [filterStatus, setFilterStatus] = useState("all");

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

  const filteredRows = filterStatus === "all" 
    ? rows 
    : rows.filter(r => r.status === filterStatus);

  const statusTabs = [
    { label: `All (${rows.length})`, value: "all" },
    { label: `Assigned (${rows.filter(r => r.status === "assigned").length})`, value: "assigned" },
    { label: `Accepted (${rows.filter(r => r.status === "accepted").length})`, value: "accepted" },
    { label: `Out (${rows.filter(r => r.status === "out_for_delivery").length})`, value: "out_for_delivery" },
    { label: `Delivered (${rows.filter(r => r.status === "delivered").length})`, value: "delivered" },
    { label: `Failed (${rows.filter(r => r.status === "failed").length})`, value: "failed" },
  ];

  const renderDeliveryCard = (delivery) => {
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
            onClick={() => {
              // Could open a modal with full shipment details
            }}
          >
            Details
          </Button>
        }
      >
        <div className={styles.cardContent}>
          {/* Customer Section */}
          <div className={styles.section}>
            <h4 style={{ marginBottom: "12px", color: "#333", fontWeight: "600" }}>Customer Information</h4>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <div className={styles.label}>Name</div>
                <div className={styles.value}>{shipment.receiver_name || "N/A"}</div>
              </div>
              <div className={styles.infoItem}>
                <PhoneOutlined style={{ marginRight: "6px", color: "#0066cc" }} />
                <div className={styles.label}>Phone</div>
                <div className={styles.value}>
                  <a href={`tel:${shipment.receiver_phone}`}>
                    {shipment.receiver_phone || "N/A"}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Address Section */}
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
            {(shipment.delivery_lat || shipment.delivery_lng) && (
              <div style={{ marginTop: "8px", fontSize: "12px", color: "#999" }}>
                Coordinates: {shipment.delivery_lat}, {shipment.delivery_lng}
              </div>
            )}
          </div>

          {/* Shipment Details Section */}
          <div className={styles.section}>
            <h4 style={{ marginBottom: "12px", color: "#333", fontWeight: "600" }}>Shipment Details</h4>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <div className={styles.label}>Items</div>
                <div className={styles.value}>{shipment.packet_products?.length || 0} item(s)</div>
              </div>
              <div className={styles.infoItem}>
                <div className={styles.label}>Delivery Type</div>
                <div className={styles.value}>{delivery.delivery_type || "Standard"}</div>
              </div>
              {shipment.route_distance_km && (
                <div className={styles.infoItem}>
                  <div className={styles.label}>Distance</div>
                  <div className={styles.value}>{shipment.route_distance_km} km</div>
                </div>
              )}
            </div>

            {shipment.packet_products && shipment.packet_products.length > 0 && (
              <div style={{ marginTop: "12px" }}>
                <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "8px", color: "#666" }}>
                  Items in Package:
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
            <div className={styles.section} style={{ backgroundColor: "#fffacd", padding: "12px", borderRadius: "4px" }}>
              <h4 style={{ marginBottom: "8px", color: "#333", fontWeight: "600" }}>
                <DollarOutlined style={{ marginRight: "6px", color: "#faad14" }} />
                Cash Collection Required
              </h4>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#faad14" }}>
                Rs. {delivery.total_collectable?.toFixed(2) || "0.00"}
              </div>
              <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                Amount to collect from customer
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className={styles.actionSection}>
            <Space wrap style={{ width: "100%" }}>
              <Button 
                size="large"
                type="primary" 
                disabled={delivery.status !== "assigned"} 
                onClick={() => run(() => staffAcceptDelivery(delivery.id))}
              >
                Accept Delivery
              </Button>
              <Button 
                size="large"
                disabled={!['accepted','assigned'].includes(delivery.status)} 
                onClick={() => run(() => staffOutForDelivery(delivery.id))}
              >
                Out For Delivery
              </Button>
              <Button 
                size="large"
                type="primary" 
                icon={<CheckCircleOutlined />}
                disabled={delivery.status !== "out_for_delivery"} 
                onClick={() => run(() => staffMarkDelivered(delivery.id, { otp_verified: true, proof_type: "signature", proof_value: "received" }))}
              >
                Mark Delivered
              </Button>
              <Button 
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
      </Card>
    );
  };

  return (
    <>
      <Card 
        style={{ marginBottom: "24px" }}
        title={
          <div>
            <h2 style={{ margin: 0 }}>Delivery Jobs</h2>
            <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: "12px" }}>
              Manage your assigned deliveries
            </p>
          </div>
        }
      >
        <Segmented 
          options={statusTabs}
          value={filterStatus}
          onChange={setFilterStatus}
          block
          style={{ width: "100%" }}
        />
      </Card>

      <Spin spinning={loading}>
        {filteredRows.length === 0 ? (
          <Empty 
            description={filterStatus === "all" ? "No deliveries assigned" : "No deliveries with this status"}
            style={{ marginTop: "50px" }}
          />
        ) : (
          <div>
            {filteredRows.map(renderDeliveryCard)}
          </div>
        )}
      </Spin>

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
