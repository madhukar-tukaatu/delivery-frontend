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
  InputNumber,
  Pagination,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";

import {
  CheckCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
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
    <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f7fa", borderRadius: 8, color: "#8c8c8c" }}>
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

// Inline form state defaults
function emptyForm() {
  return { base_rate: 0, is_active: true, express_enabled: true, same_day_enabled: true };
}

export default function BranchPricingPage() {
  const [locations, setLocations] = useState([]);
  const [rateMap, setRateMap] = useState({});
  const [selectedPickupId, setSelectedPickupId] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [activePricingSettings, setActivePricingSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [destTab, setDestTab] = useState("all");
  const [branchSearch, setBranchSearch] = useState("");
  const [branchTab, setBranchTab] = useState("all");
  const [branchPage, setBranchPage] = useState(1);
  const BRANCH_PAGE_SIZE = 10;

  // inlineAdd: locationId being added inline
  const [inlineAdd, setInlineAdd] = useState(null);
  // inlineEdit: rate id being edited inline
  const [inlineEdit, setInlineEdit] = useState(null);
  // form values for both add and edit
  const [inlineForm, setInlineForm] = useState(emptyForm());
  const [inlineSaving, setInlineSaving] = useState(false);

  /*
   * LOAD MATRIX
   */
  const loadMatrix = useCallback(async (keepSelection = false) => {
    try {
      setLoading(true);
      const payload = await getBranchRouteRateMatrix();
      const data = payload?.data ?? payload;
      const rawLocations = Array.isArray(data?.branches) ? data.branches : [];
      const rawRates = data?.rates ?? {};
      const normalized = rawLocations.map(normalizeBranch);
      setLocations(normalized);
      const normalizedMap = {};
      for (const [key, rate] of Object.entries(rawRates)) {
        normalizedMap[key] = normalizeBranchRate(rate);
      }
      setRateMap(normalizedMap);
      if (!keepSelection && normalized.length > 0 && !selectedPickupId) {
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
      .then((r) => setActivePricingSettings(r?.active ?? null))
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
    const coverage = n > 0 ? Math.round((total / (n * n)) * 100) : 0;
    return { total, active, coverage, locationCount: n };
  }, [rateMap, locations]);

  /*
   * DESTINATION ROWS
   */
  const destinationRows = useMemo(() => {
    if (!selectedPickupId) return [];
    return locations.map((loc) => ({
      location: loc,
      rate: rateMap[`${selectedPickupId}:${loc.id}`] ?? null,
    }));
  }, [selectedPickupId, locations, rateMap]);

  const filteredDestinations = useMemo(() => {
    let rows = destinationRows;
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter(({ location }) =>
      location.name?.toLowerCase().includes(q) || location.code?.toLowerCase().includes(q)
    );
    if (destTab === "active") rows = rows.filter(({ rate }) => rate?.is_active);
    if (destTab === "missing") rows = rows.filter(({ rate }) => !rate);
    return rows;
  }, [destinationRows, search, destTab]);

  const filteredBranches = useMemo(() => {
    let list = locations;
    const q = branchSearch.trim().toLowerCase();
    if (q) list = list.filter((l) =>
      l.name?.toLowerCase().includes(q) || l.code?.toLowerCase().includes(q)
    );
    if (branchTab === "complete") list = list.filter((l) => {
      const cnt = Object.keys(rateMap).filter((k) => k.startsWith(`${Number(l.id)}:`)).length;
      return cnt >= locations.length;
    });
    if (branchTab === "missing") list = list.filter((l) => {
      const cnt = Object.keys(rateMap).filter((k) => k.startsWith(`${Number(l.id)}:`)).length;
      return cnt < locations.length;
    });
    return list;
  }, [locations, rateMap, branchSearch, branchTab]);

  const pagedBranches = useMemo(() => {
    const start = (branchPage - 1) * BRANCH_PAGE_SIZE;
    return filteredBranches.slice(start, start + BRANCH_PAGE_SIZE);
  }, [filteredBranches, branchPage]);

  const selectedPickupLocation = useMemo(
    () => locations.find((l) => Number(l.id) === selectedPickupId) ?? null,
    [locations, selectedPickupId],
  );

  const missingCount = destinationRows.filter((r) => !r.rate).length;

  /*
   * INLINE ADD
   */
  const startAdd = (locationId) => {
    setInlineEdit(null);
    setInlineAdd(locationId);
    setInlineForm(emptyForm());
  };

  const cancelInline = () => {
    setInlineAdd(null);
    setInlineEdit(null);
    setInlineForm(emptyForm());
  };

  const patchRateMap = useCallback((pickupId, deliveryId, rate) => {
    const key = `${pickupId}:${deliveryId}`;
    const normalized = normalizeBranchRate(rate);
    setRateMap((prev) => ({ ...prev, [key]: normalized }));
    setSelectedRoute((prev) => prev && Number(prev.id) === Number(rate.id) ? normalized : prev);
  }, []);

  const dropFromRateMap = useCallback((pickupId, deliveryId, rateId) => {
    const key = `${pickupId}:${deliveryId}`;
    setRateMap((prev) => { const next = { ...prev }; delete next[key]; return next; });
    setSelectedRoute((prev) => prev && Number(prev.id) === Number(rateId) ? null : prev);
  }, []);

  const saveAdd = async (deliveryLocationId) => {
    if (!inlineForm.base_rate && inlineForm.base_rate !== 0) {
      message.warning("Enter a base rate.");
      return;
    }
    try {
      setInlineSaving(true);
      const result = await createBranchRouteRate({
        pickup_coverage_location_id: selectedPickupId,
        delivery_coverage_location_id: deliveryLocationId,
        base_rate: Number(inlineForm.base_rate),
        is_active: inlineForm.is_active,
        express_enabled: inlineForm.express_enabled,
        same_day_enabled: inlineForm.same_day_enabled,
      });
      // patch only this row — no full reload
      const newRate = result?.forward_id
        ? { id: result.forward_id, pickup_coverage_location_id: selectedPickupId, delivery_coverage_location_id: deliveryLocationId, ...inlineForm }
        : { pickup_coverage_location_id: selectedPickupId, delivery_coverage_location_id: deliveryLocationId, ...inlineForm, ...result };
      patchRateMap(selectedPickupId, deliveryLocationId, newRate);
      message.success("Rate added.");
      cancelInline();
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not save rate."));
    } finally {
      setInlineSaving(false);
    }
  };

  /*
   * INLINE EDIT
   */
  const startEdit = (rate) => {
    setInlineAdd(null);
    setInlineEdit(rate.id);
    setInlineForm({
      base_rate: Number(rate.base_rate),
      is_active: rate.is_active,
      express_enabled: rate.express_enabled !== false,
      same_day_enabled: rate.same_day_enabled !== false,
    });
  };

  const saveEdit = async (rate) => {
    try {
      setInlineSaving(true);
      const updated = await updateBranchRouteRate(rate.id, {
        pickup_coverage_location_id: Number(rate.pickup_coverage_location_id),
        delivery_coverage_location_id: Number(rate.delivery_coverage_location_id),
        base_rate: Number(inlineForm.base_rate),
        is_active: inlineForm.is_active,
        express_enabled: inlineForm.express_enabled,
        same_day_enabled: inlineForm.same_day_enabled,
      });
      patchRateMap(
        Number(rate.pickup_coverage_location_id),
        Number(rate.delivery_coverage_location_id),
        updated ?? { ...rate, ...inlineForm },
      );
      message.success("Rate updated.");
      cancelInline();
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not update rate."));
    } finally {
      setInlineSaving(false);
    }
  };

  /*
   * TOGGLE / REVERSE / DELETE
   */
  const toggleStatus = async (rate) => {
    try {
      await updateBranchRouteRateStatus(rate.id, !rate.is_active);
      patchRateMap(
        Number(rate.pickup_coverage_location_id),
        Number(rate.delivery_coverage_location_id),
        { ...rate, is_active: !rate.is_active },
      );
      message.success(`Rate ${rate.is_active ? "disabled" : "enabled"}.`);
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not update status."));
    }
  };

  const createReverse = async (rate) => {
    try {
      const result = await createBranchRouteRate({
        pickup_coverage_location_id: Number(rate.delivery_coverage_location_id),
        delivery_coverage_location_id: Number(rate.pickup_coverage_location_id),
        base_rate: Number(rate.base_rate),
        is_active: rate.is_active,
        express_enabled: rate.express_enabled !== false,
        same_day_enabled: rate.same_day_enabled !== false,
      });
      const reverseRate = {
        id: result?.forward_id ?? result?.id,
        pickup_coverage_location_id: Number(rate.delivery_coverage_location_id),
        delivery_coverage_location_id: Number(rate.pickup_coverage_location_id),
        base_rate: Number(rate.base_rate),
        is_active: rate.is_active,
        express_enabled: rate.express_enabled !== false,
        same_day_enabled: rate.same_day_enabled !== false,
        ...result,
      };
      patchRateMap(
        Number(rate.delivery_coverage_location_id),
        Number(rate.pickup_coverage_location_id),
        reverseRate,
      );
      message.success("Reverse rate created.");
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not create reverse rate."));
    }
  };

  const removeRate = async (rate) => {
    try {
      await deleteBranchRouteRate(rate.id);
      dropFromRateMap(
        Number(rate.pickup_coverage_location_id),
        Number(rate.delivery_coverage_location_id),
        rate.id,
      );
      message.success("Rate deleted.");
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not delete rate."));
    }
  };

  /*
   * INLINE FORM FIELDS
   */
  const InlineFormFields = ({ onSave, onCancel, saving }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <div>
        <Text type="secondary" style={{ fontSize: 10, display: "block", marginBottom: 3 }}>Base Rate (NPR)</Text>
        <InputNumber
          min={0}
          step={10}
          value={inlineForm.base_rate}
          onChange={(v) => setInlineForm((f) => ({ ...f, base_rate: v ?? 0 }))}
          style={{ width: 120 }}
          size="small"
          autoFocus
        />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 10, display: "block", marginBottom: 3 }}>Express</Text>
        <Switch
          size="small"
          checked={inlineForm.express_enabled}
          onChange={(v) => setInlineForm((f) => ({ ...f, express_enabled: v }))}
          checkedChildren="On"
          unCheckedChildren="Off"
        />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 10, display: "block", marginBottom: 3 }}>Same Day</Text>
        <Switch
          size="small"
          checked={inlineForm.same_day_enabled}
          onChange={(v) => setInlineForm((f) => ({ ...f, same_day_enabled: v }))}
          checkedChildren="On"
          unCheckedChildren="Off"
        />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 10, display: "block", marginBottom: 3 }}>Active</Text>
        <Switch
          size="small"
          checked={inlineForm.is_active}
          onChange={(v) => setInlineForm((f) => ({ ...f, is_active: v }))}
          checkedChildren="Yes"
          unCheckedChildren="No"
        />
      </div>
      <Space size={4} style={{ marginTop: 14 }}>
        <Button
          type="primary"
          size="small"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={onSave}
        >
          Save
        </Button>
        <Button size="small" icon={<CloseOutlined />} onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </Space>
    </div>
  );

  /*
   * DESTINATION ROW
   */
  const DestinationRow = ({ location, rate }) => {
    const locId = Number(location.id);
    const isSelf = locId === selectedPickupId;
    const hasRate = Boolean(rate);
    const isSelected = hasRate && selectedRoute && Number(selectedRoute.id) === Number(rate?.id);
    const isEditing = hasRate && inlineEdit === rate?.id;
    const isAdding = !hasRate && inlineAdd === locId;
    const hasReverseRate = hasRate && Boolean(rateMap[`${locId}:${selectedPickupId}`]);

    return (
      <div
        style={{
          marginBottom: 6,
          borderRadius: 8,
          border: isSelected
            ? "1px solid #91caff"
            : isAdding || isEditing
              ? "1px solid #b7eb8f"
              : hasRate
                ? "1px solid #edf0f3"
                : "1px dashed #ffd666",
          borderLeft: isSelected
            ? "3px solid #1677ff"
            : isAdding || isEditing
              ? "3px solid #52c41a"
              : hasRate
                ? "1px solid #edf0f3"
                : "3px solid #faad14",
          background: isSelected
            ? "#f0f7ff"
            : isAdding || isEditing
              ? "#f6ffed"
              : hasRate
                ? "#fff"
                : "#fffbe6",
          overflow: "hidden",
          transition: "all .15s ease",
        }}
      >
        {/* MAIN ROW */}
        <div
          onClick={() => {
            if (hasRate && !isEditing) setSelectedRoute(rate);
          }}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(140px, 1.2fr) 1fr 80px 80px 80px 170px",
            gap: 10,
            alignItems: "center",
            minHeight: 58,
            padding: "8px 14px",
            cursor: hasRate && !isEditing ? "pointer" : "default",
          }}
        >
          {/* DESTINATION NAME */}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
              <Text strong style={{ fontSize: 13 }}>{location.name}</Text>
              {isSelf && <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>Local</Tag>}
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>{location.code}</Text>
          </div>

          {/* BASE RATE */}
          <div>
            {hasRate ? (
              <>
                <Text type="secondary" style={{ fontSize: 10 }}>Standard</Text>
                <div style={{ fontWeight: 600, fontSize: 13, marginTop: 1 }}>{formatMoney(rate.base_rate)}</div>
              </>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
            )}
          </div>

          {/* EXPRESS */}
          <div>
            {hasRate && (
              <Tag color={rate.express_enabled === false ? "default" : "orange"} style={{ margin: 0, fontSize: 10 }}>
                {rate.express_enabled === false ? "Off" : "Express"}
              </Tag>
            )}
          </div>

          {/* SAME DAY */}
          <div>
            {hasRate && (
              <Tag color={rate.same_day_enabled === false ? "default" : "magenta"} style={{ margin: 0, fontSize: 10 }}>
                {rate.same_day_enabled === false ? "Off" : "Same Day"}
              </Tag>
            )}
          </div>

          {/* STATUS */}
          <div>
            {hasRate ? (
              <StatusTag active={rate.is_active} />
            ) : (
              <Tag icon={<WarningOutlined />} color="warning" style={{ margin: 0 }}>Missing</Tag>
            )}
          </div>

          {/* ACTIONS */}
          <Space size={4} onClick={(e) => e.stopPropagation()}>
            {hasRate ? (
              isEditing ? null : (
                <>
                  <Tooltip title="Edit inline">
                    <Button size="small" icon={<EditOutlined />} onClick={() => startEdit(rate)} />
                  </Tooltip>
                  <Tooltip title={isSelf ? "Local route" : hasReverseRate ? "Reverse rate already exists" : "Create reverse rate"}>
                    <Button size="small" disabled={isSelf || hasReverseRate} icon={<SwapOutlined />} onClick={() => createReverse(rate)} />
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
              )
            ) : (
              isAdding ? null : (
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => startAdd(locId)}
                >
                  Add Rate
                </Button>
              )
            )}
          </Space>
        </div>

        {/* INLINE EDIT FORM */}
        {isEditing && (
          <div style={{ padding: "10px 14px 12px", borderTop: "1px solid #d9f7be", background: "#f6ffed" }}>
            <InlineFormFields
              onSave={() => saveEdit(rate)}
              onCancel={cancelInline}
              saving={inlineSaving}
            />
          </div>
        )}

        {/* INLINE ADD FORM */}
        {isAdding && (
          <div style={{ padding: "10px 14px 12px", borderTop: "1px solid #d9f7be", background: "#f6ffed" }}>
            <InlineFormFields
              onSave={() => saveAdd(locId)}
              onCancel={cancelInline}
              saving={inlineSaving}
            />
          </div>
        )}
      </div>
    );
  };

  const selectedRouteNodes = selectedRoute
    ? [
        locations.find((l) => Number(l.id) === Number(selectedRoute.pickup_coverage_location_id)),
        locations.find((l) => Number(l.id) === Number(selectedRoute.delivery_coverage_location_id)),
      ].filter(Boolean)
    : [];

  return (
    <div style={{ width: "100%", padding: "20px 22px 32px", background: "#f5f7fa", minHeight: "100vh" }}>

      {/* HEADER */}
      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16 }} styles={{ body: { padding: "18px 20px" } }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ margin: 0 }}>Branch Pricing</Title>
            <Text type="secondary">Select a branch to view and manage its delivery rates.</Text>
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={() => loadMatrix(true)}>
              Refresh
            </Button>
          </Col>
        </Row>
      </Card>

      {/* STATS */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {[
          { title: "Branches", value: stats.locationCount, prefix: <EnvironmentOutlined /> },
          { title: "Total Routes", value: stats.total },
          { title: "Active Routes", value: stats.active, suffix: `/ ${stats.total}`, valueStyle: { color: "#52c41a" } },
          { title: "Matrix Coverage", value: stats.coverage, suffix: "%", valueStyle: { color: stats.coverage === 100 ? "#52c41a" : "#faad14" } },
        ].map((s) => (
          <Col key={s.title} xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ borderRadius: 10 }}>
              <Statistic {...s} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* MAIN */}
      <Row gutter={[16, 16]} align="top">

        {/* LEFT — BRANCH LIST */}
        <Col xs={24} xl={5}>
          <Card
            bordered={false}
            style={{ borderRadius: 12 }}
            styles={{ body: { padding: 0 } }}
            title={<Space><EnvironmentOutlined /><Text strong>Branches</Text><Tag color="blue">{locations.length}</Tag></Space>}
          >
            {/* BRANCH SEARCH */}
            <div style={{ padding: "10px 12px 0" }}>
              <Input
                allowClear
                size="small"
                placeholder="Search branch..."
                value={branchSearch}
                onChange={(e) => { setBranchSearch(e.target.value); setBranchPage(1); }}
              />
            </div>

            {/* BRANCH TABS */}
            <Tabs
              size="small"
              activeKey={branchTab}
              onChange={(k) => { setBranchTab(k); setBranchPage(1); }}
              style={{ padding: "0 12px" }}
              items={[
                { key: "all", label: `All (${locations.length})` },
                { key: "missing", label: <span style={{ color: "#faad14" }}>Missing</span> },
                { key: "complete", label: <span style={{ color: "#52c41a" }}>Complete</span> },
              ]}
            />

            {loading ? (
              <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>
            ) : !filteredBranches.length ? (
              <div style={{ padding: 40 }}><Empty description="No branches" /></div>
            ) : (
              <>
                <div style={{ padding: "0 0 6px" }}>
                  {pagedBranches.map((loc) => {
                    const locId = Number(loc.id);
                    const isActive = locId === selectedPickupId;
                    const ratesCount = Object.keys(rateMap).filter((k) => k.startsWith(`${locId}:`)).length;
                    const missing = locations.length - ratesCount;
                    return (
                      <div
                        key={loc.id}
                        onClick={() => { setSelectedPickupId(locId); setSelectedRoute(null); setSearch(""); cancelInline(); }}
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
                          <Text type="secondary" style={{ display: "block", fontSize: 11 }}>{loc.code}</Text>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 11, color: "#52c41a" }}>{ratesCount} routes</div>
                          {missing > 0 && <Badge count={missing} size="small" color="#faad14" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {filteredBranches.length > BRANCH_PAGE_SIZE && (
                  <div style={{ padding: "8px 12px 12px", textAlign: "center", borderTop: "1px solid #f0f0f0" }}>
                    <Pagination
                      simple
                      size="small"
                      current={branchPage}
                      pageSize={BRANCH_PAGE_SIZE}
                      total={filteredBranches.length}
                      onChange={(p) => setBranchPage(p)}
                    />
                  </div>
                )}
              </>
            )}
          </Card>
        </Col>

        {/* MIDDLE — DESTINATION RATES */}
        <Col xs={24} xl={12}>
          <Card
            bordered={false}
            style={{ borderRadius: 12 }}
            styles={{ body: { padding: 0 } }}
            title={
              selectedPickupLocation ? (
                <Space wrap>
                  <Text strong>From: {selectedPickupLocation.name}</Text>
                  <Tag color="blue">{selectedPickupLocation.code}</Tag>
                  {missingCount > 0 && <Tag color="warning" icon={<WarningOutlined />}>{missingCount} missing</Tag>}
                </Space>
              ) : (
                <Text type="secondary">Select a branch</Text>
              )
            }
          >
            {!selectedPickupId ? (
              <div style={{ padding: 60 }}>
                <Empty description="Select a branch on the left" />
              </div>
            ) : (
              <>
                <div style={{ padding: "10px 14px 0" }}>
                  <Input
                    allowClear
                    placeholder="Search destination..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    size="small"
                  />
                </div>
                <Tabs
                  size="small"
                  activeKey={destTab}
                  onChange={setDestTab}
                  style={{ padding: "0 14px" }}
                  items={[
                    { key: "all", label: `All (${destinationRows.length})` },
                    { key: "active", label: <span style={{ color: "#52c41a" }}>Active ({destinationRows.filter(r => r.rate?.is_active).length})</span> },
                    { key: "missing", label: <span style={{ color: "#faad14" }}>Missing ({destinationRows.filter(r => !r.rate).length})</span> },
                  ]}
                />
                <div style={{ padding: "4px 14px 14px" }}>
                  {filteredDestinations.map(({ location, rate }) => (
                    <DestinationRow key={location.id} location={location} rate={rate} />
                  ))}
                </div>
              </>
            )}
          </Card>
        </Col>

        {/* RIGHT — ROUTE DETAIL */}
        <Col xs={24} xl={7} style={{ alignSelf: "flex-start" }}>
          <div style={{ position: "sticky", top: 16 }}>
            <Card
              bordered={false}
              style={{ borderRadius: 12, overflow: "hidden" }}
              styles={{ body: { padding: 0 } }}
              title={<Space><EnvironmentOutlined style={{ color: "#1677ff" }} /><Text strong>Route Detail</Text></Space>}
            >
              {selectedRoute ? (
                <>
                  <div style={{ padding: "12px 16px", background: "#f7fbff", borderBottom: "1px solid #e6f4ff" }}>
                    <Text type="secondary" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em" }}>
                      Delivery Route
                    </Text>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                      <Text strong>{locations.find((l) => Number(l.id) === Number(selectedRoute.pickup_coverage_location_id))?.name}</Text>
                      <span style={{ color: "#1677ff", fontSize: 18 }}>→</span>
                      <Text strong>{locations.find((l) => Number(l.id) === Number(selectedRoute.delivery_coverage_location_id))?.name}</Text>
                    </div>
                  </div>

                  <div style={{ padding: 12 }}>
                    <RouteMapS nodes={selectedRouteNodes} height={260} selectedLabel="Route" />
                  </div>

                  <div style={{ padding: "0 12px 14px" }}>
                    <Row gutter={8} style={{ marginBottom: 10 }}>
                      <Col span={12}>
                        <div style={{ padding: 10, border: "1px solid #f0f0f0", borderRadius: 8 }}>
                          <Text type="secondary" style={{ fontSize: 10, textTransform: "uppercase" }}>Base Rate</Text>
                          <div style={{ marginTop: 3, fontSize: 15, fontWeight: 700 }}>{formatMoney(selectedRoute.base_rate)}</div>
                        </div>
                      </Col>
                      <Col span={12}>
                        <div style={{ padding: 10, border: "1px solid #f0f0f0", borderRadius: 8 }}>
                          <Text type="secondary" style={{ fontSize: 10, textTransform: "uppercase" }}>Status</Text>
                          <div style={{ marginTop: 6 }}><StatusTag active={selectedRoute.is_active} /></div>
                        </div>
                      </Col>
                    </Row>

                    <Descriptions column={1} size="small">
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
                      <Descriptions.Item label="Updated">{formatDate(selectedRoute.updated_at)}</Descriptions.Item>
                    </Descriptions>

                    <Space style={{ marginTop: 10 }}>
                      <Button
                        icon={<SwapOutlined />}
                        disabled={
                          Number(selectedRoute.pickup_coverage_location_id) === Number(selectedRoute.delivery_coverage_location_id) ||
                          Boolean(rateMap[`${selectedRoute.delivery_coverage_location_id}:${selectedRoute.pickup_coverage_location_id}`])
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
    </div>
  );
}
