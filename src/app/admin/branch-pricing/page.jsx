"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Empty,
  Input,
  Popconfirm,
  Row,
  Select,
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
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
  SwapOutlined,
} from "@ant-design/icons";

// import RouteMapS from "@/components/rate-admin/RouteMapS";

import {
  createBranchRouteRate,
  createReverseBranchRouteRate,
  deleteBranchRouteRate,
  getBranchRouteRates,
  getRateBranches,
  updateBranchRouteRate,
  updateBranchRouteRateStatus,
} from "@/services/adminRateManagementService";

import { getPricingSettings } from "@/services/adminPricingConfigurationService";
import BranchRouteRateModal from "./components/BranchRouteRateModal";

import {
  apiErrorMessage,
  buildBranchMap,
  extractCollection,
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
        height: 360,
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
      style={{
        marginInlineEnd: 0,
        borderRadius: 6,
      }}
    >
      {active ? "Active" : "Inactive"}
    </Tag>
  );
}

function getBranchDisplay(branch, fallbackId) {
  if (!branch) {
    return {
      name: `Branch #${fallbackId}`,
      code: String(fallbackId),
    };
  }

  return {
    name: branch.name || `Branch #${fallbackId}`,
    code: branch.code || String(fallbackId),
  };
}

export default function BranchPricingPage() {
  const [branches, setBranches] = useState([]);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activePricingSettings, setActivePricingSettings] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);

  const [editing, setEditing] = useState(null);
  const [modalDefaults, setModalDefaults] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    pickup_branch_id: undefined,
    delivery_branch_id: undefined,
    is_active: undefined,
  });

  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    pickup_branch_id: undefined,
    delivery_branch_id: undefined,
    is_active: undefined,
  });

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 100,
    total: 0,
  });

  const branchesById = useMemo(() => buildBranchMap(branches), [branches]);

  const branchOptions = useMemo(
    () =>
      branches.map((branch) => ({
        value: Number(branch.id),
        label: `${branch.name} (${branch.code})`,
      })),
    [branches],
  );

  /*
   * LOAD BRANCHES
   */
  const loadBranches = useCallback(async () => {
    try {
      const payload = await getRateBranches();
      const collection = extractCollection(payload);
      const normalizedBranches = collection.rows
        .map(normalizeBranch)
        .filter((branch) => Number.isFinite(Number(branch?.id)));
      setBranches(normalizedBranches);
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not load branch options."));
    }
  }, []);

  /*
   * LOAD RATES
   */
  const loadRows = useCallback(
    async (page = pagination.current, pageSize = pagination.pageSize) => {
      try {
        setLoading(true);

        const payload = await getBranchRouteRates({
          page,
          per_page: pageSize,

          search: appliedFilters.search?.trim() || undefined,

          pickup_branch_id: appliedFilters.pickup_branch_id || undefined,

          delivery_branch_id: appliedFilters.delivery_branch_id || undefined,

          is_active:
            appliedFilters.is_active === undefined
              ? undefined
              : appliedFilters.is_active,
        });

        const collection = extractCollection(payload);

        const normalized = collection.rows.map((row) =>
          normalizeBranchRate(row, branchesById),
        );

        setRows(normalized);

        setSelected((current) => {
          if (!normalized.length) {
            return null;
          }

          return (
            normalized.find((row) => Number(row.id) === Number(current?.id)) ||
            normalized[0]
          );
        });

        setPagination({
          current: collection.currentPage || page,

          pageSize: collection.pageSize || pageSize,

          total: collection.total ?? normalized.length,
        });
      } catch (error) {
        message.error(apiErrorMessage(error, "Could not load branch pricing."));
      } finally {
        setLoading(false);
      }
    },
    [appliedFilters, branchesById, pagination.current, pagination.pageSize],
  );

  useEffect(() => {
    loadBranches();
    getPricingSettings()
      .then((result) => setActivePricingSettings(result?.active ?? null))
      .catch(() => {});
  }, [loadBranches]);

  useEffect(() => {
    if (branches.length > 0) {
      loadRows(1, pagination.pageSize);
    }
  }, [branches.length]);

  /*
   * STATISTICS
   */
  const stats = useMemo(() => {
    const active = rows.filter((row) => row.is_active).length;

    const inactive = rows.length - active;

    const average = rows.length
      ? rows.reduce((sum, row) => sum + Number(row.base_rate || 0), 0) /
        rows.length
      : 0;

    const branchCount = new Set(rows.map((row) => Number(row.pickup_branch_id)))
      .size;

    return {
      active,
      inactive,
      average,
      branchCount,
    };
  }, [rows]);

  /*
   * GROUP BY PICKUP BRANCH
   */
  const groupedRows = useMemo(() => {
    const groups = new Map();

    rows.forEach((row) => {
      const branchId = Number(row.pickup_branch_id);

      if (!groups.has(branchId)) {
        groups.set(branchId, {
          branchId,
          branch: row.pickup_branch,
          rows: [],
        });
      }

      groups.get(branchId).rows.push(row);
    });

    return Array.from(groups.values())
      .map((group) => {
        const activeCount = group.rows.filter((row) => row.is_active).length;

        return {
          ...group,
          activeCount,
          totalCount: group.rows.length,
          branchInfo: getBranchDisplay(group.branch, group.branchId),
        };
      })
      .sort((a, b) => a.branchInfo.name.localeCompare(b.branchInfo.name));
  }, [rows]);

  /*
   * CREATE
   */
  const openCreate = (prefill = {}) => {
    setEditing(null);
    setModalDefaults(prefill);
    setModalOpen(true);
  };

  /*
   * EDIT
   */
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
      pickup_branch_id: Number(values.pickup_branch_id),
      delivery_branch_id: Number(values.delivery_branch_id),
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
            pickup_branch_id: payload.delivery_branch_id,
            delivery_branch_id: payload.pickup_branch_id,
            base_rate: Number(values.reverse_base_rate),
            is_active: payload.is_active,
            express_enabled: payload.express_enabled,
            same_day_enabled: payload.same_day_enabled,
          });
        }

        message.success("Branch rate created.");
      }

      closeModal();
      await loadRows();
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not save branch rate."));
    } finally {
      setSaving(false);
    }
  };

  /*
   * STATUS
   */
  const toggleStatus = async (row) => {
    try {
      await updateBranchRouteRateStatus(row.id, !row.is_active);

      message.success(`Branch rate ${row.is_active ? "disabled" : "enabled"}.`);

      await loadRows(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not update rate status."));
    }
  };

  /*
   * REVERSE
   */
  const createReverse = async (row) => {
    try {
      await createReverseBranchRouteRate(row);

      message.success("Reverse branch rate created.");

      await loadRows(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not create reverse rate."));
    }
  };

  /*
   * DELETE
   */
  const removeRate = async (row) => {
    try {
      await deleteBranchRouteRate(row.id);

      message.success("Branch rate deleted.");

      await loadRows(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not delete branch rate."));
    }
  };

  /*
   * APPLY FILTERS
   */
  const applyFilters = () => {
    setAppliedFilters({
      ...filters,
    });

    setPagination((current) => ({
      ...current,
      current: 1,
    }));
  };

  const resetFilters = () => {
    const emptyFilters = {
      search: "",
      pickup_branch_id: undefined,
      delivery_branch_id: undefined,
      is_active: undefined,
    };

    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);

    setPagination((current) => ({
      ...current,
      current: 1,
    }));
  };

  /*
   * RATE ROW
   */
  const RateRow = ({ row }) => {
    const pickup = getBranchDisplay(row.pickup_branch, row.pickup_branch_id);
    const delivery = getBranchDisplay(row.delivery_branch, row.delivery_branch_id);
    const isSelected = Number(selected?.id) === Number(row.id);
    const isSameBranch = Number(row.pickup_branch_id) === Number(row.delivery_branch_id);
    const base = Number(row.base_rate || 0);

    return (
      <div
        onClick={() => setSelected(row)}
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, 1.6fr) 1fr 1fr 1fr 110px 155px 175px",
          gap: 14,
          alignItems: "center",
          minHeight: 78,
          padding: "12px 16px",
          marginBottom: 8,
          borderRadius: 10,
          background: isSelected ? "#f0f7ff" : "#ffffff",
          border: isSelected ? "1px solid #91caff" : "1px solid #edf0f3",
          borderLeft: isSelected ? "3px solid #1677ff" : "1px solid #edf0f3",
          cursor: "pointer",
          transition: "all .18s ease",
          boxShadow: isSelected ? "0 2px 8px rgba(22,119,255,.08)" : "none",
        }}
      >
        {/* ROUTE */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text strong>{pickup.name}</Text>
            <span style={{ color: "#1677ff", fontSize: 18, lineHeight: 1 }}>→</span>
            <Text strong>{delivery.name}</Text>
            {isSameBranch && <Tag color="blue" style={{ margin: 0 }}>Local</Tag>}
          </div>
          <Text type="secondary" style={{ display: "block", marginTop: 5, fontSize: 11 }}>
            {pickup.code} → {delivery.code}
          </Text>
        </div>

        {/* STANDARD */}
        <div>
          <Text type="secondary" style={{ fontSize: 11 }}>Standard</Text>
          <div style={{ marginTop: 2, fontWeight: 600 }}>{formatMoney(base)}</div>
        </div>

        {/* EXPRESS */}
        <div>
          <Text type="secondary" style={{ fontSize: 11 }}>Express</Text>
          <div style={{ marginTop: 4 }}>
            <Tag color={row.express_enabled === false ? "default" : "orange"} style={{ margin: 0 }}>
              {row.express_enabled === false ? "Disabled" : "Enabled"}
            </Tag>
          </div>
        </div>

        {/* SAME DAY */}
        <div>
          <Text type="secondary" style={{ fontSize: 11 }}>Same Day</Text>
          <div style={{ marginTop: 4 }}>
            <Tag color={row.same_day_enabled === false ? "default" : "magenta"} style={{ margin: 0 }}>
              {row.same_day_enabled === false ? "Disabled" : "Enabled"}
            </Tag>
          </div>
        </div>

        {/* STATUS */}
        <div>
          <Text type="secondary" style={{ display: "block", fontSize: 11, marginBottom: 4 }}>Status</Text>
          <StatusTag active={row.is_active} />
        </div>

        {/* UPDATED */}
        <div>
          <Text type="secondary" style={{ display: "block", fontSize: 11 }}>Updated</Text>
          <Text style={{ fontSize: 12 }}>{formatDate(row.updated_at)}</Text>
        </div>

        {/* ACTIONS */}
        <Space size={4} onClick={(event) => event.stopPropagation()}>
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          </Tooltip>

          <Tooltip title={isSameBranch ? "Same branch does not need a reverse route" : "Create reverse rate"}>
            <Button size="small" disabled={isSameBranch} icon={<SwapOutlined />} onClick={() => createReverse(row)} />
          </Tooltip>

          <Button size="small" onClick={() => toggleStatus(row)}>
            {row.is_active ? "Disable" : "Enable"}
          </Button>

          <Popconfirm
            title="Delete this branch rate?"
            description="This action cannot be undone."
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            onConfirm={() => removeRate(row)}
          >
            <Button danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      </div>
    );
  };

  const selectedNodes = selected
    ? [selected.pickup_branch, selected.delivery_branch].filter(Boolean)
    : [];

  const selectedPickup = selected
    ? getBranchDisplay(selected.pickup_branch, selected.pickup_branch_id)
    : null;

  const selectedDelivery = selected
    ? getBranchDisplay(selected.delivery_branch, selected.delivery_branch_id)
    : null;

  return (
    <div
      style={{
        width: "100%",
        padding: "20px 22px 32px",
        background: "#f5f7fa",
        minHeight: "100vh",
      }}
    >
      {/* HEADER */}
      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          marginBottom: 16,
        }}
        styles={{
          body: {
            padding: "18px 20px",
          },
        }}
      >
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              Branch Pricing
            </Title>
            <Text type="secondary">
              Set the base rate for each branch-to-branch route. These base
              rates are used by the pricing engine together with global Pricing
              Settings to calculate the final delivery charge.
            </Text>
          </Col>

          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                loading={loading}
                onClick={() =>
                  loadRows(pagination.current, pagination.pageSize)
                }
              >
                Refresh
              </Button>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openCreate()}
              >
                Add Branch Rate
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* STATS */}
      <Row
        gutter={[12, 12]}
        style={{
          marginBottom: 16,
        }}
      >
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 10,
            }}
          >
            <Statistic
              title="Total Routes"
              value={pagination.total || rows.length}
              prefix={<EnvironmentOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 10,
            }}
          >
            <Statistic
              title="Active Routes"
              value={stats.active}
              suffix={`/ ${rows.length}`}
              valueStyle={{
                color: "#52c41a",
              }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 10,
            }}
          >
            <Statistic title="Branches" value={stats.branchCount} />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 10,
            }}
          >
            <Statistic
              title="Average Base Rate"
              value={stats.average}
              precision={2}
              prefix="NPR "
            />
          </Card>
        </Col>
      </Row>

      {/* FILTERS */}
      <Card
        bordered={false}
        style={{
          borderRadius: 10,
          marginBottom: 16,
        }}
      >
        <Space
          direction="vertical"
          size={12}
          style={{
            width: "100%",
          }}
        >
          <Space>
            <FilterOutlined />

            <Text strong>Route Filters</Text>

            <Text
              type="secondary"
              style={{
                fontSize: 12,
              }}
            >
              Filter routes before reviewing them.
            </Text>
          </Space>

          <Row gutter={[10, 10]}>
            <Col xs={24} lg={7}>
              <Input
                allowClear
                value={filters.search}
                placeholder="Search branch or route..."
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
                onPressEnter={applyFilters}
              />
            </Col>

            <Col xs={24} sm={12} lg={5}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                style={{
                  width: "100%",
                }}
                placeholder="Pickup branch"
                options={branchOptions}
                value={filters.pickup_branch_id}
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    pickup_branch_id: value,
                  }))
                }
              />
            </Col>

            <Col xs={24} sm={12} lg={5}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                style={{
                  width: "100%",
                }}
                placeholder="Destination"
                options={branchOptions}
                value={filters.delivery_branch_id}
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    delivery_branch_id: value,
                  }))
                }
              />
            </Col>

            <Col xs={24} sm={12} lg={3}>
              <Select
                allowClear
                style={{
                  width: "100%",
                }}
                placeholder="Status"
                value={filters.is_active}
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    is_active: value,
                  }))
                }
                options={[
                  {
                    label: "Active",
                    value: 1,
                  },
                  {
                    label: "Inactive",
                    value: 0,
                  },
                ]}
              />
            </Col>

            <Col xs={24} sm={12} lg={4}>
              <Space
                style={{
                  width: "100%",
                }}
              >
                <Button
                  type="primary"
                  icon={<FilterOutlined />}
                  onClick={applyFilters}
                >
                  Apply
                </Button>

                <Button onClick={resetFilters}>Reset</Button>
              </Space>
            </Col>
          </Row>
        </Space>
      </Card>

      {/* MAIN WORKSPACE */}
      <Row gutter={[16, 16]} align="top">
        {/* LEFT */}
        <Col xs={24} xl={17}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              overflow: "hidden",
            }}
            styles={{
              body: {
                padding: 0,
              },
            }}
            title={
              <Space>
                <EnvironmentOutlined />

                <Text strong>Branch Rates</Text>

                <Tag color="blue">{groupedRows.length} branches</Tag>
              </Space>
            }
            extra={
              <Text
                type="secondary"
                style={{
                  fontSize: 12,
                }}
              >
                Click a route to view it on map
              </Text>
            }
          >
            {loading ? (
              <div
                style={{
                  padding: 60,
                  textAlign: "center",
                }}
              >
                Loading branch rates...
              </div>
            ) : !groupedRows.length ? (
              <div
                style={{
                  padding: 60,
                }}
              >
                <Empty description="No branch rates found">
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => openCreate()}
                  >
                    Create First Rate
                  </Button>
                </Empty>
              </div>
            ) : (
              <Collapse
                bordered={false}
                expandIconPosition="start"
                defaultActiveKey={[String(groupedRows[0]?.branchId)]}
                items={groupedRows.map((group) => ({
                  key: String(group.branchId),

                  label: (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <Text strong>{group.branchInfo.name}</Text>

                      <Tag color="blue">{group.branchInfo.code}</Tag>

                      <Tag>
                        {group.totalCount}{" "}
                        {group.totalCount === 1 ? "rate" : "rates"}
                      </Tag>

                      <Tag color="success">{group.activeCount} active</Tag>
                    </div>
                  ),

                  children: (
                    <div
                      style={{
                        padding: "4px 12px 12px",
                      }}
                    >
                      <Text
                        type="secondary"
                        style={{
                          display: "block",
                          margin: "0 0 12px 4px",
                          fontSize: 12,
                        }}
                      >
                        Delivery rates originating from{" "}
                        <Text strong>{group.branchInfo.name}</Text>
                      </Text>

                      {group.rows.map((row) => (
                        <RateRow key={row.id} row={row} />
                      ))}
                    </div>
                  ),
                }))}
              />
            )}

            {!loading && rows.length > 0 && (
              <div
                style={{
                  padding: "12px 18px",
                  borderTop: "1px solid #f0f0f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  type="secondary"
                  style={{
                    fontSize: 12,
                  }}
                >
                  Showing {rows.length} loaded routes
                </Text>

                <Space>
                  <Button
                    size="small"
                    disabled={pagination.current <= 1}
                    onClick={() =>
                      loadRows(pagination.current - 1, pagination.pageSize)
                    }
                  >
                    Previous
                  </Button>

                  <Tag>Page {pagination.current}</Tag>

                  <Button
                    size="small"
                    disabled={
                      pagination.current * pagination.pageSize >=
                      pagination.total
                    }
                    onClick={() =>
                      loadRows(pagination.current + 1, pagination.pageSize)
                    }
                  >
                    Next
                  </Button>
                </Space>
              </div>
            )}
          </Card>
        </Col>

        {/* RIGHT STICKY ROUTE PANEL */}
        <Col
          xs={24}
          xl={7}
          style={{
            alignSelf: "flex-start",
          }}
        >
          <div
            style={{
              position: "sticky",
              top: 16,
              zIndex: 10,
            }}
          >
            <Card
              bordered={false}
              style={{
                borderRadius: 12,
                overflow: "hidden",
              }}
              styles={{
                body: {
                  padding: 0,
                },
              }}
              title={
                <Space>
                  <EnvironmentOutlined
                    style={{
                      color: "#1677ff",
                    }}
                  />

                  <Text strong>Selected Route</Text>
                </Space>
              }
            >
              {selected ? (
                <>
                  {/* ROUTE HEADER */}
                  <div
                    style={{
                      padding: "14px 16px",
                      background: "#f7fbff",
                      borderBottom: "1px solid #e6f4ff",
                    }}
                  >
                    <Text
                      type="secondary"
                      style={{
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: ".08em",
                      }}
                    >
                      Delivery Route
                    </Text>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        marginTop: 6,
                      }}
                    >
                      <Text strong>{selectedPickup?.name}</Text>

                      <span
                        style={{
                          color: "#1677ff",
                          fontSize: 18,
                        }}
                      >
                        →
                      </span>

                      <Text strong>{selectedDelivery?.name}</Text>

                      {Number(selected.pickup_branch_id) ===
                        Number(selected.delivery_branch_id) && (
                        <Tag color="blue">Local</Tag>
                      )}
                    </div>

                    <Text
                      type="secondary"
                      style={{
                        display: "block",
                        marginTop: 4,
                        fontSize: 11,
                      }}
                    >
                      {selectedPickup?.code} → {selectedDelivery?.code}
                    </Text>
                  </div>

                  {/* MAP */}
                  <div
                    style={{
                      padding: 12,
                    }}
                  >
                    <RouteMapS
                      nodes={selectedNodes}
                      height={360}
                      selectedLabel="Actual road route"
                    />
                  </div>

                  {/* RATE SUMMARY */}
                  <div
                    style={{
                      padding: "0 12px 12px",
                    }}
                  >
                    <Row gutter={8}>
                      <Col span={12}>
                        <div
                          style={{
                            padding: 12,
                            border: "1px solid #f0f0f0",
                            borderRadius: 8,
                          }}
                        >
                          <Text
                            type="secondary"
                            style={{
                              fontSize: 10,
                              textTransform: "uppercase",
                            }}
                          >
                            Base Rate
                          </Text>

                          <div
                            style={{
                              marginTop: 3,
                              fontSize: 17,
                              fontWeight: 700,
                            }}
                          >
                            {formatMoney(selected.base_rate)}
                          </div>
                        </div>
                      </Col>

                      <Col span={12}>
                        <div
                          style={{
                            padding: 12,
                            border: "1px solid #f0f0f0",
                            borderRadius: 8,
                          }}
                        >
                          <Text
                            type="secondary"
                            style={{
                              fontSize: 10,
                              textTransform: "uppercase",
                            }}
                          >
                            Status
                          </Text>

                          <div
                            style={{
                              marginTop: 7,
                            }}
                          >
                            <StatusTag active={selected.is_active} />
                          </div>
                        </div>
                      </Col>
                    </Row>

                    <Descriptions
                      column={1}
                      size="small"
                      style={{
                        marginTop: 10,
                      }}
                    >
                      <Descriptions.Item label="Pickup">
                        {selectedPickup?.name}
                      </Descriptions.Item>

                      <Descriptions.Item label="Destination">
                        {selectedDelivery?.name}
                      </Descriptions.Item>

                      <Descriptions.Item label="Last Updated">
                        {formatDate(selected.updated_at)}
                      </Descriptions.Item>
                    </Descriptions>

                    <Space
                      style={{
                        width: "100%",
                        marginTop: 8,
                      }}
                    >
                      <Button
                        block
                        icon={<EditOutlined />}
                        onClick={() => openEdit(selected)}
                      >
                        Edit
                      </Button>

                      <Button
                        block
                        icon={<SwapOutlined />}
                        disabled={
                          Number(selected.pickup_branch_id) ===
                          Number(selected.delivery_branch_id)
                        }
                        onClick={() => createReverse(selected)}
                      >
                        Reverse
                      </Button>

                      <Button block onClick={() => toggleStatus(selected)}>
                        {selected.is_active ? "Disable" : "Enable"}
                      </Button>
                    </Space>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    padding: 60,
                  }}
                >
                  <Empty description="Select a route to view its map" />
                </div>
              )}
            </Card>
          </div>
        </Col>
      </Row>

      <BranchRouteRateModal
        open={modalOpen}
        record={editing}
        branches={branches}
        saving={saving}
        defaults={modalDefaults}
        pricingSettings={activePricingSettings}
        onCancel={closeModal}
        onSubmit={saveRate}
      />
    </div>
  );
}
