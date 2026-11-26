"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Modal,
  Space,
  Typography,
  Tag,
  Alert,
  Select,
  Button,
  Table,
  Card,
  Input,
  Radio,
  Tooltip,
  Badge,
  message,
} from "antd";
import {
  CompassOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  InfoCircleOutlined,
  SyncOutlined,
  ThunderboltOutlined,
  CarOutlined,
} from "@ant-design/icons";
import { assignTransferRoute } from "@/services/admin/transferService";

const { Text, Title } = Typography;

function ServiceTypeTag({ value }) {
  if (!value) return null;
  const key = String(value).toLowerCase();
  const colors = {
    standard: "default",
    express: "orange",
    same_day: "magenta",
    flight: "purple",
  };
  return (
    <Tag color={colors[key] || "default"} style={{ margin: 0, fontSize: 11, textTransform: "uppercase" }}>
      {value}
    </Tag>
  );
}

export default function AssignTransferRouteModal({
  open,
  onCancel,
  onSuccess,
  shipments = [],
  availableRoutes = [],
  branchId = null,
}) {
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [search, setSearch] = useState("");
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedRouteId(null);
      setSearch("");
      setShowAllRoutes(false);
      return;
    }

    // Auto-preselect first matching route if available
    const firstShipment = shipments[0];
    if (firstShipment && availableRoutes.length > 0) {
      const destId = Number(firstShipment.destination_sub_branch_id || firstShipment.destination_branch_id || 0);
      const svc = String(firstShipment.service_type || "standard").toLowerCase();
      const match = availableRoutes.find((r) => {
        const rDest = Number(r.destination_branch_id || 0);
        const rSvc = String(r.service_type || "standard").toLowerCase();
        return destId > 0 && rDest === destId && (rSvc === svc || rSvc === "all");
      });
      if (match) {
        setSelectedRouteId(Number(match.route_id ?? match.id));
      }
    }
  }, [open, shipments, availableRoutes]);

  const targetDestinations = useMemo(() => {
    const map = new Map();
    shipments.forEach((s) => {
      const id = Number(s.destination_sub_branch_id || s.destination_branch_id || 0);
      const name = s.destination_sub_branch?.name || s.destination_branch?.name || s.destination_name || `Branch #${id}`;
      map.set(id, name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [shipments]);

  // Filter routes
  const filteredRoutes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const destIds = new Set(targetDestinations.map((d) => d.id));

    return (availableRoutes || []).filter((r) => {
      const id = Number(r.route_id ?? r.id ?? 0);
      const destId = Number(r.destination_branch_id || 0);
      const code = String(r.route_code || "").toLowerCase();
      const name = String(r.route_name || "").toLowerCase();
      const nextHop = String(r.next_hop_name || "").toLowerCase();
      const destName = String(r.destination_branch_name || "").toLowerCase();

      // Search filter
      if (q && !code.includes(q) && !name.includes(q) && !nextHop.includes(q) && !destName.includes(q)) {
        return false;
      }

      // If not showing all, only show routes matching the target destinations
      if (!showAllRoutes && destIds.size > 0 && !destIds.has(destId)) {
        return false;
      }

      return true;
    });
  }, [availableRoutes, targetDestinations, search, showAllRoutes]);

  const handleAssign = async () => {
    if (!shipments.length) return;
    const shipmentIds = shipments.map((s) => s.id);

    setSubmitting(true);
    try {
      const res = await assignTransferRoute(shipmentIds, selectedRouteId, {
        ...(branchId ? { branch_id: branchId } : {}),
      });
      message.success(
        res?.message ||
          `Successfully assigned ${shipmentIds.length} parcel(s) to route ${selectedRouteId ? `#${selectedRouteId}` : "(auto-resolved)"}`
      );
      onSuccess?.(res);
      onCancel?.();
    } catch (e) {
      const err = e?.response?.data?.message || e?.message || "Failed to assign route.";
      message.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRoute = useMemo(
    () => availableRoutes.find((r) => Number(r.route_id ?? r.id) === Number(selectedRouteId)),
    [availableRoutes, selectedRouteId]
  );

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      width={780}
      title={
        <Space size={8}>
          <CompassOutlined style={{ color: "#1677ff", fontSize: 18 }} />
          <span style={{ fontSize: 16, fontWeight: 700 }}>Assign Transfer Route</span>
          <Badge count={shipments.length} style={{ backgroundColor: "#1677ff" }} />
        </Space>
      }
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="auto"
          icon={<SyncOutlined />}
          loading={submitting}
          onClick={() => {
            setSelectedRouteId(null);
            handleAssign();
          }}
          title="Clear manual route and auto-resolve from active system routes"
        >
          Auto-Resolve Route
        </Button>,
        <Button
          key="assign"
          type="primary"
          icon={<CheckCircleOutlined />}
          loading={submitting}
          disabled={!selectedRouteId}
          onClick={handleAssign}
        >
          Assign Selected Route
        </Button>,
      ]}
      destroyOnHidden
      styles={{ body: { maxHeight: "75vh", overflowY: "auto", paddingTop: 8 } }}
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        {/* Selected Shipments Summary */}
        <Alert
          type="info"
          showIcon
          style={{ borderRadius: 8, padding: "8px 12px" }}
          message={
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text strong style={{ fontSize: 13 }}>
                Parcels to Route ({shipments.length})
              </Text>
              <Space size={4}>
                {targetDestinations.map((d) => (
                  <Tag key={d.id} color="purple" style={{ margin: 0, fontWeight: 600 }}>
                    Destination: {d.name}
                  </Tag>
                ))}
              </Space>
            </div>
          }
          description={
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Assigning a transfer route sets the intermediate transit hops, next hop branch, and line-haul path for these parcels.
              </Text>
              <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                {shipments.slice(0, 10).map((s) => (
                  <Tag key={s.id} style={{ margin: 0, fontSize: 11, fontFamily: "monospace" }}>
                    {s.tracking_number || `#${s.id}`}
                  </Tag>
                ))}
                {shipments.length > 10 && (
                  <Tag style={{ margin: 0, fontSize: 11 }}>+{shipments.length - 10} more</Tag>
                )}
              </div>
            </div>
          }
        />

        {/* Route Selector Controls */}
        <Card size="small" style={{ borderRadius: 8 }} styles={{ body: { padding: 10 } }}>
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text strong style={{ fontSize: 13 }}>
                Select Active Transfer Route
              </Text>
              <Button
                type="link"
                size="small"
                onClick={() => setShowAllRoutes((v) => !v)}
                style={{ padding: 0, height: "auto" }}
              >
                {showAllRoutes ? "Show routes for parcel destination only" : `Show all active routes (${availableRoutes.length})`}
              </Button>
            </div>

            <Input
              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
              placeholder="Search route by code, name, or transit city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="middle"
              allowClear
            />
          </Space>
        </Card>

        {/* Route Cards */}
        {filteredRoutes.length === 0 ? (
          <Alert
            type="warning"
            showIcon
            message="No matching routes found"
            description={
              <div>
                <span>No active route found matching the search criteria. </span>
                <Button type="link" size="small" onClick={() => setShowAllRoutes(true)} style={{ padding: 0 }}>
                  Show all active routes
                </Button>
                {" or configure a route under "}
                <a href="/admin/branch-transfer-routes" target="_blank" rel="noreferrer">
                  Admin → Transfer Routes
                </a>.
              </div>
            }
            style={{ borderRadius: 8 }}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
            {filteredRoutes.map((r) => {
              const rId = Number(r.route_id ?? r.id);
              const isSelected = selectedRouteId === rId;
              const path = Array.isArray(r.path) ? r.path : [];

              return (
                <div
                  key={rId}
                  onClick={() => setSelectedRouteId(rId)}
                  style={{
                    cursor: "pointer",
                    borderRadius: 8,
                    border: isSelected ? "2px solid #1677ff" : "1px solid #e2e8f0",
                    background: isSelected ? "#eff6ff" : "#ffffff",
                    padding: "10px 12px",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <Space size={8} wrap>
                      <Radio checked={isSelected} />
                      <Text strong style={{ fontSize: 13, color: isSelected ? "#1677ff" : "#1e293b" }}>
                        {r.route_code || `Route #${rId}`}
                      </Text>
                      {r.route_name && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          ({r.route_name})
                        </Text>
                      )}
                      <ServiceTypeTag value={r.service_type} />
                      {r.is_default && <Tag color="gold" style={{ margin: 0, fontSize: 10 }}>Default</Tag>}
                    </Space>
                    <Space size={6}>
                      <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
                        Next Hop: <strong>{r.next_hop_name || "Direct"}</strong>
                      </Tag>
                    </Space>
                  </div>

                  {/* Path Chips */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", paddingLeft: 24 }}>
                    {path.length > 0 ? (
                      path.map((node, i) => (
                        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Tag
                            color={i === 0 ? "default" : i === path.length - 1 ? "purple" : "orange"}
                            style={{ margin: 0, fontSize: 11 }}
                          >
                            {node.branch_name || node.name || `#${node.branch_id || node.id}`}
                          </Tag>
                          {i < path.length - 1 && <ArrowRightOutlined style={{ fontSize: 10, color: "#94a3b8" }} />}
                        </span>
                      ))
                    ) : (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {r.path_text || "Direct route"}
                      </Text>
                    )}
                    {r.total_distance_km ? (
                      <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                        · {Number(r.total_distance_km).toFixed(0)} km
                      </Text>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected Route Preview */}
        {selectedRoute && (
          <div style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: 8, border: "1px dashed #cbd5e1" }}>
            <Text strong style={{ fontSize: 12, color: "#0f766e" }}>
              ✓ Route Selection: {selectedRoute.route_code || `#${selectedRouteId}`}
            </Text>
            <div style={{ fontSize: 11.5, color: "#475569", marginTop: 2 }}>
              Parcels will travel via next hop <strong>{selectedRoute.next_hop_name || selectedRoute.destination_branch_name}</strong>
              {selectedRoute.path_text ? ` (${selectedRoute.path_text})` : ""}.
            </div>
          </div>
        )}
      </Space>
    </Modal>
  );
}
