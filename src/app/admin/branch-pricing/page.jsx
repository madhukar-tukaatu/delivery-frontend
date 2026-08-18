"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Input,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";

import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  ReloadOutlined,
  SwapOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import {
  createBranchRouteRate,
  deleteBranchRouteRate,
  getBranchRouteRateMatrix,
  updateBranchRouteRate,
  updateBranchRouteRateStatus,
} from "@/services/adminRateManagementService";

import { getPricingSettings } from "@/services/adminPricingConfigurationService";
import BranchRouteRateModal from "./components/BranchRouteRateModal";

import {
  apiErrorMessage,
  formatDate,
  formatMoney,
  normalizeBranch,
  normalizeBranchRate,
} from "@/lib/rate-management-page-utils";

const { Title, Text } = Typography;

const RouteMapS = dynamic(() => import("@/components/rate-admin/RouteMapS"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f7fa",
        borderRadius: 8,
        color: "#8c8c8c",
      }}
    >
      Loading map...
    </div>
  ),
});

function StatusTag({ active }) {
  return (
    <Tag
      icon={active ? <CheckCircleOutlined /> : null}
      color={active ? "success" : "default"}
      style={{ marginInlineEnd: 0, borderRadius: 6 }}
    >
      {active ? "Active" : "Inactive"}
    </Tag>
  );
}

export default function BranchPricingPage() {
  // All coverage locations (branches)
  const [locations, setLocations] = useState([]);
  // Map of "pickupId:deliveryId" -> rate object
  const [rateMap, setRateMap] = useState({});

  const [selectedPickupId, setSelectedPickupId] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [activePricingSettings, setActivePricingSettings] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [modalDefaults, setModalDefaults] = useState(null);
  const [search, setSearch] = useState("");

  /*
   * LOAD MATRIX
   */
  const loadMatrix = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await getBranchRouteRateMatrix();
      const data = payload?.data ?? payload;

      const rawLocations = Array.isArray(data?.branches) ? data.branches : [];
      const rawRates = data?.rates ?? {};

      const normalized = rawLocations.map(normalizeBranch);
      setLocations(normalized);

      // Normalize each rate value in the map
      const normalizedMap = {};
      for (const [key, rate] of Object.entries(rawRates)) {
        normalizedMap[key] = normalizeBranchRate(rate);
      }
      setRateMap(normalizedMap);

      // Auto-select first location
      if (normalized.length > 0 && !selectedPickupId) {
        setSelectedPickupId(Number(normalized[0].id));
      }
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not load branch pricing matrix."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatrix();
    getPricingSettings()
      .then((result) => setActivePricingSettings(result?.active ?? null))
      .catch(() => {});
  }, [loadMatrix]);

  /*
   * STATS
   */
  const stats = useMemo(() => {
    const rates = Object.values(rateMap);
    const total = rates.length;
    const active = rates.filter((r) => r.is_active).length;
    const n = locations.length;
    // max possible routes = n * (n-1) including self-routes (local)
    const possible = n * n;
    const coverage = possible > 0 ? Math.round((total / possible) * 100) : 0;
    return { total, active, coverage, locationCount: n };
  }, [rateMap, locations]);

  /*
   * ROUTES FOR SELECTED PICKUP BRANCH
   * Returns all locations as destinations, with rate or null
   */
  const destinationRows = useMemo(() => {
    if (!selectedPickupId) return [];
    return locations.map((loc) => {
      const key = `${selectedPickupId}:${loc.id}`;
      const rate = rateMap[key] ?? null;
      return { location: loc, rate };
    });
  }, [selectedPickupId, locations, rateMap]);

  const filteredDestinations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return destinationRows;
    return destinationRows.filter(
      ({ location }) =>
        location.name?.toLowerCase().includes(q) ||
        location.code?.toLowerCase().includes(q),
    );
  }, [destinationRows, search]);

  const selectedPickupLocation = useMemo(
    () => locations.find((l) => Number(l.id) === selectedPickupId) ?? null,
    [locations, selectedPickupId],
  );

  /*
   * MODAL HELPERS
   */
  const openCreate = (prefill = {}) => {
    setEditing(null);
    setModalDefaults(prefill);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setModalDefaults(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setModalDefaults(null);
  };

  /*
   * SAVE
   */
  const saveRate = async (values) => {
    const payload = {
      pickup_coverage_location_id: Number(values.pickup_coverage_location_id),
      delivery_coverage_location_id: Number(values.delivery_coverage_location_id),
      base_rate: Number(values.base_rate),
      is_active: Boolean(values.is_active),
      express_enabled: values.express_enabled !== false,
      same_day_enabled: values.same_day_enabled !== false,
    };

    try {
      setSaving(true);
      if (editing) {
        await updateBranchRouteRate(editing.id, payload);
        message.success("Branch rate updated.");
      } else {
        await createBranchRouteRate(payload);
        if (values.create_reverse_route && values.reverse_base_rate != null) {
          await createBranchRouteRate({
            pickup_coverage_location_id: payload.delivery_coverage_location_id,
            delivery_coverage_location_id: payload.pickup_coverage_location_id,
            base_rate: Number(values.reverse_base_rate),
            is_active: payload.is_active,
            express_enabled: payload.express_enabled,
            same_day_enabled: payload.same_day_enabled,
          });
        }
        message.success("Branch rate created.");
      }
      closeModal();
      await loadMatrix();
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not save branch rate."));
    } finally {
      setSaving(false);
    }
  };

  /*
   * TOGGLE STATUS
   */
  const toggleStatus = async (rate) => {
    try {
      await updateBranchRouteRateStatus(rate.id, !rate.is_active);
      message.success(`Rate ${rate.is_active ? "disabled" : "enabled"}.`);
      await loadMatrix();
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not update rate status."));
    }
  };

  /*
   * CREATE REVERSE
   */
  const createReverse = async (rate) => {
    try {
      await createBranchRouteRate({
        pickup_coverage_location_id: Number(rate.delivery_coverage_location_id),
        delivery_coverage_location_id: Number(rate.pickup_coverage_location_id),
        base_rate: Number(rate.base_rate),
        is_active: rate.is_active,
        express_enabled: rate.express_enabled !== false,
        same_day_enabled: rate.same_day_enabled !== false,
      });
      message.success("Reverse rate created.");
      await loadMatrix();
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not create reverse rate."));
    }
  };

  /*
   * DELETE
   */
  const removeRate = async (rate) => {
    try {
      await deleteBranchRouteRate(rate.id);
      message.success("Branch rate deleted.");
      if (selectedRoute?.id === rate.id) setSelectedRoute(null);
      await loadMatrix();
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not delete branch rate."));
    }
  };

  /*
   * DESTINATION ROW
   */
  const DestinationRow = ({ location, rate }) => {
    const isSelf = Number(location.id) === selectedPickupId;
    const hasRate = Boolean(rate);
    const isSelected = selectedRoute && hasRate && Number(selectedRoute.id) === Number(rate?.id);

    return (
      <div
        onClick={() => hasRate && setSelectedRoute(rate)}
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(160px, 1.4fr) 1fr 1fr 1fr 90px 160px",
          gap: 12,
          alignItems: "center",
          minHeight: 64,
          padding: "10px 14px",
          marginBottom: 6,
          borderRadius: 8,
          background: isSelected ? "#f0f7ff" : hasRate ? "#ffffff" : "#fffbe6",
          border: isSelected
            ? "1px solid #91caff"
            : hasRate
              ? "1px solid #edf0f3"
              : "1px dashed #ffd666",
          borderLeft: isSelected
            ? "3px solid #1677ff"
            : hasRate
              ? "1px solid #edf0f3"
              : "3px solid #faad14",
          cursor: hasRate ? "pointer" : "default",
          transition: "all .15s ease",
        }}
      >
        {/* DESTINATION */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Text strong style={{ fontSize: 13 }}>{location.name}</Text>
            {isSelf && <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>Local</Tag>}
          </div>
          <Text type="secondary" style={{ fontSize: 11 }}>{location.code}</Text>
        </div>

        {/* BASE RATE */}
        <div>
          {hasRate ? (
            <>
              <Text type="secondary" style={{ fontSize: 11 }}>Standard</Text>
              <div style={{ fontWeight: 600, marginTop: 2 }}>{formatMoney(rate.base_rate)}</div>
            </>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
          )}
        </div>

        {/* EXPRESS */}
        <div>
          {hasRate ? (
            <>
              <Text type="secondary" style={{ fontSize: 11 }}>Express</Text>
              <div style={{ marginTop: 3 }}>
                <Tag color={rate.express_enabled === false ? "default" : "orange"} style={{ margin: 0 }}>
                  {rate.express_enabled === false ? "Off" : "On"}
                </Tag>
              </div>
            </>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
          )}
        </div>

        {/* SAME DAY */}
        <div>
          {hasRate ? (
            <>
              <Text type="secondary" style={{ fontSize: 11 }}>Same Day</Text>
              <div style={{ marginTop: 3 }}>
                <Tag color={rate.same_day_enabled === false ? "default" : "magenta"} style={{ margin: 0 }}>
                  {rate.same_day_enabled === false ? "Off" : "On"}
                </Tag>
              </div>
            </>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
          )}
        </div>

        {/* STATUS */}
        <div>
          {hasRate ? (
            <StatusTag active={rate.is_active} />
          ) : (
            <Tag icon={<WarningOutlined />} color="warning" style={{ margin: 0 }}>
              Missing
            </Tag>
          )}
        </div>

        {/* ACTIONS */}
        <Space size={4} onClick={(e) => e.stopPropagation()}>
          {hasRate ? (
            <>
              <Tooltip title="Edit">
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(rate)} />
              </Tooltip>
              <Tooltip title={isSelf ? "Same branch — no reverse needed" : "Create reverse rate"}>
                <Button
                  size="small"
                  disabled={isSelf}
                  icon={<SwapOutlined />}
                  onClick={() => createReverse(rate)}
                />
              </Tooltip>
              <Button size="small" onClick={() => toggleStatus(rate)}>
                {rate.is_active ? "Disable" : "Enable"}
              </Button>
              <Popconfirm
                title="Delete this rate?"
                description="This cannot be undone."
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
                onConfirm={() => removeRate(rate)}
              >
                <Button danger size="small" icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          ) : (
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() =>
                openCreate({
                  pickup_coverage_location_id: selectedPickupId,
                  delivery_coverage_location_id: Number(location.id),
                })
              }
            >
              Add Rate
            </Button>
          )}
        </Space>
      </div>
    );
  };

  const missingCount = destinationRows.filter((r) => !r.rate).length;
  const selectedRouteNodes = selectedRoute
    ? [
        locations.find((l) => Number(l.id) === Number(selectedRoute.pickup_coverage_location_id)),
        locations.find((l) => Number(l.id) === Number(selectedRoute.delivery_coverage_location_id)),
      ].filter(Boolean)
    : [];

  return (
    <div style={{ width: "100%", padding: "20px 22px 32px", background: "#f5f7fa", minHeight: "100vh" }}>
      {/* HEADER */}
      <Card
        bordered={false}
        style={{ borderRadius: 12, marginBottom: 16 }}
        styles={{ body: { padding: "18px 20px" } }}
      >
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Title level={3} style={{ margin: 0 }}>Branch Pricing</Title>
            <Text type="secondary">
              Select a branch to view and manage its delivery rates to all other branches.
            </Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} loading={loading} onClick={loadMatrix}>
                Refresh
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate()}>
                Add Rate
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* STATS */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 10 }}>
            <Statistic title="Branches" value={stats.locationCount} prefix={<EnvironmentOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 10 }}>
            <Statistic title="Total Routes" value={stats.total} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 10 }}>
            <Statistic
              title="Active Routes"
              value={stats.active}
              suffix={`/ ${stats.total}`}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 10 }}>
            <Statistic
              title="Matrix Coverage"
              value={stats.coverage}
              suffix="%"
              valueStyle={{ color: stats.coverage === 100 ? "#52c41a" : "#faad14" }}
            />
          </Card>
        </Col>
      </Row>

      {/* MAIN WORKSPACE */}
      <Row gutter={[16, 16]} align="top">
        {/* LEFT — BRANCH SELECTOR */}
        <Col xs={24} xl={6}>
          <Card
            bordered={false}
            style={{ borderRadius: 12 }}
            styles={{ body: { padding: 0 } }}
            title={
              <Space>
                <EnvironmentOutlined />
                <Text strong>Branches</Text>
                <Tag color="blue">{locations.length}</Tag>
              </Space>
            }
          >
            {loading ? (
              <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>
            ) : !locations.length ? (
              <div style={{ padding: 40 }}>
                <Empty description="No branches found" />
              </div>
            ) : (
              <div style={{ padding: "8px 0" }}>
                {locations.map((loc) => {
                  const locId = Number(loc.id);
                  const isActive = locId === selectedPickupId;
                  const ratesFromThis = Object.keys(rateMap).filter(
                    (k) => k.startsWith(`${locId}:`),
                  ).length;
                  const missing = locations.length - ratesFromThis;

                  return (
                    <div
                      key={loc.id}
                      onClick={() => {
                        setSelectedPickupId(locId);
                        setSelectedRoute(null);
                        setSearch("");
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 16px",
                        cursor: "pointer",
                        background: isActive ? "#e6f4ff" : "transparent",
                        borderLeft: isActive ? "3px solid #1677ff" : "3px solid transparent",
                        transition: "all .15s",
                      }}
                    >
                      <div>
                        <Text strong style={{ fontSize: 13 }}>{loc.name}</Text>
                        <Text type="secondary" style={{ display: "block", fontSize: 11 }}>
                          {loc.code}
                        </Text>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "#52c41a" }}>{ratesFromThis} routes</div>
                        {missing > 0 && (
                          <Badge
                            count={missing}
                            size="small"
                            color="#faad14"
                            title={`${missing} missing`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>

        {/* MIDDLE — DESTINATION RATES */}
        <Col xs={24} xl={11}>
          <Card
            bordered={false}
            style={{ borderRadius: 12 }}
            styles={{ body: { padding: 0 } }}
            title={
              selectedPickupLocation ? (
                <Space wrap>
                  <Text strong>
                    From: {selectedPickupLocation.name}
                  </Text>
                  <Tag color="blue">{selectedPickupLocation.code}</Tag>
                  {missingCount > 0 && (
                    <Tag color="warning" icon={<WarningOutlined />}>
                      {missingCount} missing
                    </Tag>
                  )}
                </Space>
              ) : (
                <Text type="secondary">Select a branch</Text>
              )
            }
            extra={
              selectedPickupLocation && (
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => openCreate({ pickup_coverage_location_id: selectedPickupId })}
                >
                  Add Rate
                </Button>
              )
            }
          >
            {!selectedPickupId ? (
              <div style={{ padding: 60 }}>
                <Empty description="Select a branch on the left to manage its rates" />
              </div>
            ) : (
              <>
                <div style={{ padding: "10px 14px 6px" }}>
                  <Input
                    allowClear
                    placeholder="Search destination..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    size="small"
                  />
                </div>
                <div style={{ padding: "4px 14px 14px" }}>
                  {filteredDestinations.length === 0 ? (
                    <Empty description="No destinations match" style={{ padding: 40 }} />
                  ) : (
                    filteredDestinations.map(({ location, rate }) => (
                      <DestinationRow key={location.id} location={location} rate={rate} />
                    ))
                  )}
                </div>
              </>
            )}
          </Card>
        </Col>

        {/* RIGHT — SELECTED ROUTE DETAIL */}
        <Col xs={24} xl={7} style={{ alignSelf: "flex-start" }}>
          <div style={{ position: "sticky", top: 16, zIndex: 10 }}>
            <Card
              bordered={false}
              style={{ borderRadius: 12, overflow: "hidden" }}
              styles={{ body: { padding: 0 } }}
              title={
                <Space>
                  <EnvironmentOutlined style={{ color: "#1677ff" }} />
                  <Text strong>Route Detail</Text>
                </Space>
              }
            >
              {selectedRoute ? (
                <>
                  <div
                    style={{
                      padding: "12px 16px",
                      background: "#f7fbff",
                      borderBottom: "1px solid #e6f4ff",
                    }}
                  >
                    <Text type="secondary" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em" }}>
                      Delivery Route
                    </Text>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                      <Text strong>
                        {locations.find((l) => Number(l.id) === Number(selectedRoute.pickup_coverage_location_id))?.name}
                      </Text>
                      <span style={{ color: "#1677ff", fontSize: 18 }}>→</span>
                      <Text strong>
                        {locations.find((l) => Number(l.id) === Number(selectedRoute.delivery_coverage_location_id))?.name}
                      </Text>
                    </div>
                  </div>

                  <div style={{ padding: 12 }}>
                    <RouteMapS nodes={selectedRouteNodes} height={280} selectedLabel="Route" />
                  </div>

                  <div style={{ padding: "0 12px 12px" }}>
                    <Row gutter={8}>
                      <Col span={12}>
                        <div style={{ padding: 10, border: "1px solid #f0f0f0", borderRadius: 8 }}>
                          <Text type="secondary" style={{ fontSize: 10, textTransform: "uppercase" }}>Base Rate</Text>
                          <div style={{ marginTop: 3, fontSize: 16, fontWeight: 700 }}>
                            {formatMoney(selectedRoute.base_rate)}
                          </div>
                        </div>
                      </Col>
                      <Col span={12}>
                        <div style={{ padding: 10, border: "1px solid #f0f0f0", borderRadius: 8 }}>
                          <Text type="secondary" style={{ fontSize: 10, textTransform: "uppercase" }}>Status</Text>
                          <div style={{ marginTop: 6 }}>
                            <StatusTag active={selectedRoute.is_active} />
                          </div>
                        </div>
                      </Col>
                    </Row>

                    <Descriptions column={1} size="small" style={{ marginTop: 10 }}>
                      <Descriptions.Item label="Express">
                        <Tag color={selectedRoute.express_enabled === false ? "default" : "orange"}>
                          {selectedRoute.express_enabled === false ? "Disabled" : "Enabled"}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Same Day">
                        <Tag color={selectedRoute.same_day_enabled === false ? "default" : "magenta"}>
                          {selectedRoute.same_day_enabled === false ? "Disabled" : "Enabled"}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Updated">
                        {formatDate(selectedRoute.updated_at)}
                      </Descriptions.Item>
                    </Descriptions>

                    <Space style={{ width: "100%", marginTop: 8 }}>
                      <Button icon={<EditOutlined />} onClick={() => openEdit(selectedRoute)}>
                        Edit
                      </Button>
                      <Button
                        icon={<SwapOutlined />}
                        disabled={
                          Number(selectedRoute.pickup_coverage_location_id) ===
                          Number(selectedRoute.delivery_coverage_location_id)
                        }
                        onClick={() => createReverse(selectedRoute)}
                      >
                        Reverse
                      </Button>
                      <Button onClick={() => toggleStatus(selectedRoute)}>
                        {selectedRoute.is_active ? "Disable" : "Enable"}
                      </Button>
                    </Space>
                  </div>
                </>
              ) : (
                <div style={{ padding: 60 }}>
                  <Empty description="Click a route to view details" />
                </div>
              )}
            </Card>
          </div>
        </Col>
      </Row>

      <BranchRouteRateModal
        open={modalOpen}
        record={editing}
        branches={locations}
        saving={saving}
        defaults={modalDefaults}
        pricingSettings={activePricingSettings}
        onCancel={closeModal}
        onSubmit={saveRate}
      />
    </div>
  );
}
