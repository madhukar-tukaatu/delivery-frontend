"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";

import {
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  ReloadOutlined,
  SwapOutlined,
} from "@ant-design/icons";

import RouteMap from "@/components/rate-admin/RouteMap";

import {
  createBranchRouteRate,
  createReverseBranchRouteRate,
  deleteBranchRouteRate,
  getBranchRouteRates,
  getRateBranches,
  updateBranchRouteRate,
  updateBranchRouteRateStatus,
} from "@/services/adminRateManagementService";

import {
  apiErrorMessage,
  branchLabel,
  buildBranchMap,
  extractCollection,
  formatDate,
  formatMoney,
  normalizeBranch,
  normalizeBranchRate,
} from "@/lib/rate-management-page-utils";

const { Title, Text } = Typography;

function statusTag(active) {
  return (
    <Tag color={active ? "green" : "default"}>
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
  const [form] = Form.useForm();

  const [branches, setBranches] = useState([]);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [filters, setFilters] = useState({
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

  const branchesById = useMemo(
    () => buildBranchMap(branches),
    [branches],
  );

  const branchOptions = useMemo(
    () =>
      branches.map((branch) => ({
        value: Number(branch.id),
        label: branchLabel(branch),
      })),
    [branches],
  );

  const loadBranches = useCallback(async () => {
    try {
      const payload = await getRateBranches({
        status: "active",
        per_page: 500,
      });

      const collection = extractCollection(payload);

      const normalizedBranches = collection.rows
        .map(normalizeBranch)
        .filter((branch) => Number.isFinite(Number(branch?.id)));

      setBranches(normalizedBranches);
    } catch (error) {
      message.error(
        apiErrorMessage(error, "Could not load branch options."),
      );
    }
  }, []);

  const loadRows = useCallback(
    async (
      page = pagination.current,
      pageSize = pagination.pageSize,
    ) => {
      try {
        setLoading(true);

        const payload = await getBranchRouteRates({
          page,
          per_page: pageSize,

          search: filters.search?.trim() || undefined,

          pickup_branch_id:
            filters.pickup_branch_id || undefined,

          delivery_branch_id:
            filters.delivery_branch_id || undefined,

          is_active:
            filters.is_active === undefined
              ? undefined
              : filters.is_active,
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
            normalized.find(
              (row) =>
                Number(row.id) === Number(current?.id),
            ) || normalized[0]
          );
        });

        setPagination({
          current: collection.currentPage || page,
          pageSize: collection.pageSize || pageSize,
          total: collection.total ?? normalized.length,
        });
      } catch (error) {
        message.error(
          apiErrorMessage(error, "Could not load branch pricing."),
        );
      } finally {
        setLoading(false);
      }
    },
    [
      branchesById,
      filters,
      pagination.current,
      pagination.pageSize,
    ],
  );

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    if (branches.length > 0) {
      loadRows(1, pagination.pageSize);
    }
  }, [branches.length]);

  const stats = useMemo(() => {
    const active = rows.filter(
      (row) => row.is_active,
    ).length;

    const average = rows.length
      ? rows.reduce(
          (sum, row) =>
            sum + Number(row.base_rate || 0),
          0,
        ) / rows.length
      : 0;

    return {
      active,
      inactive: rows.length - active,
      average,
    };
  }, [rows]);

  /*
   * Group all rates by Pickup/Main Branch.
   *
   * Example:
   *
   * Kathmandu Main Branch
   *   → Chitwan
   *   → Pokhara
   *   → Kathmandu Main Branch
   *
   * Pokhara Branch
   *   → Kathmandu
   *   → Chitwan
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
        const activeCount = group.rows.filter(
          (row) => row.is_active,
        ).length;

        return {
          ...group,
          activeCount,
          totalCount: group.rows.length,
          branchInfo: getBranchDisplay(
            group.branch,
            group.branchId,
          ),
        };
      })
      .sort((a, b) =>
        a.branchInfo.name.localeCompare(
          b.branchInfo.name,
        ),
      );
  }, [rows]);

  const openCreate = (prefill = {}) => {
    setEditing(null);

    form.setFieldsValue({
      pickup_branch_id: undefined,
      delivery_branch_id: undefined,
      base_rate: undefined,
      is_active: true,
      ...prefill,
    });

    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);

    form.setFieldsValue({
      pickup_branch_id: Number(row.pickup_branch_id),

      delivery_branch_id: Number(
        row.delivery_branch_id,
      ),

      base_rate: Number(row.base_rate),

      is_active: Boolean(row.is_active),
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const saveRate = async () => {
    try {
      const values = await form.validateFields();

      const payload = {
        pickup_branch_id: Number(
          values.pickup_branch_id,
        ),

        delivery_branch_id: Number(
          values.delivery_branch_id,
        ),

        base_rate: Number(values.base_rate),

        is_active: Boolean(values.is_active),
      };

      setSaving(true);

      if (editing) {
        await updateBranchRouteRate(
          editing.id,
          payload,
        );

        message.success("Branch rate updated.");
      } else {
        await createBranchRouteRate(payload);

        message.success("Branch rate created.");
      }

      closeModal();

      await loadRows();
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      message.error(
        apiErrorMessage(
          error,
          "Could not save branch rate.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (row) => {
    try {
      await updateBranchRouteRateStatus(
        row.id,
        !row.is_active,
      );

      message.success(
        `Branch rate ${
          row.is_active ? "disabled" : "enabled"
        }.`,
      );

      await loadRows(
        pagination.current,
        pagination.pageSize,
      );
    } catch (error) {
      message.error(
        apiErrorMessage(
          error,
          "Could not update rate status.",
        ),
      );
    }
  };

  const createReverse = async (row) => {
    try {
      await createReverseBranchRouteRate(row);

      message.success(
        "Reverse branch rate created.",
      );

      await loadRows(
        pagination.current,
        pagination.pageSize,
      );
    } catch (error) {
      message.error(
        apiErrorMessage(
          error,
          "Could not create reverse rate.",
        ),
      );
    }
  };

  const removeRate = async (row) => {
    try {
      await deleteBranchRouteRate(row.id);

      message.success("Branch rate deleted.");

      await loadRows(
        pagination.current,
        pagination.pageSize,
      );
    } catch (error) {
      message.error(
        apiErrorMessage(
          error,
          "Could not delete branch rate.",
        ),
      );
    }
  };

  const RateRow = ({ row }) => {
    const pickup = getBranchDisplay(
      row.pickup_branch,
      row.pickup_branch_id,
    );

    const delivery = getBranchDisplay(
      row.delivery_branch,
      row.delivery_branch_id,
    );

    const isSelected =
      Number(selected?.id) === Number(row.id);

    const isSameBranch =
      Number(row.pickup_branch_id) ===
      Number(row.delivery_branch_id);

    return (
      <div
        onClick={() => setSelected(row)}
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(260px, 1.8fr) minmax(130px, 0.7fr) minmax(110px, 0.6fr) minmax(160px, 0.8fr) auto",
          gap: 16,
          alignItems: "center",
          padding: "14px 16px",
          borderRadius: 10,
          cursor: "pointer",
          background: isSelected
            ? "rgba(22, 119, 255, 0.08)"
            : "#fff",
          border: isSelected
            ? "1px solid rgba(22, 119, 255, 0.35)"
            : "1px solid #f0f0f0",
          marginBottom: 10,
          transition: "all 0.2s ease",
        }}
      >
        {/* ROUTE */}
        <div>
          <Space size={8} wrap>
            <Text strong>{pickup.name}</Text>

            <Text
              style={{
                color: "#8c8c8c",
                fontSize: 18,
              }}
            >
              →
            </Text>

            <Text strong>{delivery.name}</Text>

            {isSameBranch && (
              <Tag color="blue">Local / Same Branch</Tag>
            )}
          </Space>

          <div
            style={{
              marginTop: 5,
            }}
          >
            <Text
              type="secondary"
              style={{
                fontSize: 12,
              }}
            >
              {pickup.code} → {delivery.code}
            </Text>
          </div>
        </div>

        {/* RATE */}
        <div>
          <Text type="secondary">Base Rate</Text>

          <div>
            <Text strong>
              {formatMoney(row.base_rate)}
            </Text>
          </div>
        </div>

        {/* STATUS */}
        <div>
          <Text type="secondary">Status</Text>

          <div
            style={{
              marginTop: 4,
            }}
          >
            {statusTag(row.is_active)}
          </div>
        </div>

        {/* UPDATED */}
        <div>
          <Text type="secondary">Updated</Text>

          <div
            style={{
              marginTop: 4,
              fontSize: 12,
            }}
          >
            {formatDate(row.updated_at)}
          </div>
        </div>

        {/* ACTIONS */}
        <Space
          size={4}
          onClick={(event) =>
            event.stopPropagation()
          }
        >
          <Tooltip title="Edit rate">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(row)}
            />
          </Tooltip>

          <Tooltip
            title={
              isSameBranch
                ? "Same-branch rate does not require a reverse rate"
                : "Create reverse rate"
            }
          >
            <Button
              size="small"
              disabled={isSameBranch}
              icon={<SwapOutlined />}
              onClick={() =>
                createReverse(row)
              }
            />
          </Tooltip>

          <Button
            size="small"
            onClick={() =>
              toggleStatus(row)
            }
          >
            {row.is_active
              ? "Disable"
              : "Enable"}
          </Button>

          <Popconfirm
            title="Delete this branch rate?"
            description="This action cannot be undone."
            okText="Delete"
            okButtonProps={{
              danger: true,
            }}
            onConfirm={() =>
              removeRate(row)
            }
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      </div>
    );
  };

  const selectedNodes = selected
    ? [
        selected.pickup_branch,
        selected.delivery_branch,
      ].filter(Boolean)
    : [];

  return (
    <Space
      direction="vertical"
      size={20}
      style={{
        width: "100%",
      }}
    >
      {/* PAGE HEADER */}
      <Card bordered={false}>
        <Row
          justify="space-between"
          align="middle"
          gutter={[16, 16]}
        >
          <Col>
            <Space
              direction="vertical"
              size={2}
            >
              <Space>
                <Title
                  level={3}
                  style={{
                    margin: 0,
                  }}
                >
                  Branch Pricing
                </Title>

                <Tag color="blue">
                  Grouped by Pickup Branch
                </Tag>
              </Space>

              <Text type="secondary">
                Manage branch-to-branch delivery
                rates. Each section shows all
                destinations from a main branch.
              </Text>
            </Space>
          </Col>

          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                loading={loading}
                onClick={() =>
                  loadRows(
                    pagination.current,
                    pagination.pageSize,
                  )
                }
              >
                Refresh
              </Button>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() =>
                  openCreate()
                }
              >
                Add Branch Rate
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* STATISTICS */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card bordered={false}>
            <Statistic
              title="Total Rates"
              value={rows.length}
            />
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card bordered={false}>
            <Statistic
              title="Active Rates"
              value={stats.active}
              suffix={`/ ${rows.length}`}
            />
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card bordered={false}>
            <Statistic
              title="Average Base Rate"
              value={stats.average}
              precision={2}
              prefix="NPR"
            />
          </Card>
        </Col>
      </Row>

      {/* FILTERS */}
      <Card
        bordered={false}
        size="small"
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} lg={6}>
            <Input
              allowClear
              placeholder="Search branch or rate"
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search:
                    event.target.value,
                }))
              }
              onPressEnter={() =>
                loadRows(1)
              }
            />
          </Col>

          <Col xs={24} sm={12} lg={5}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Pickup / Main Branch"
              style={{
                width: "100%",
              }}
              options={branchOptions}
              value={
                filters.pickup_branch_id
              }
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
              placeholder="Destination Branch"
              style={{
                width: "100%",
              }}
              options={branchOptions}
              value={
                filters.delivery_branch_id
              }
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  delivery_branch_id: value,
                }))
              }
            />
          </Col>

          <Col xs={24} sm={12} lg={4}>
            <Select
              allowClear
              placeholder="Status"
              style={{
                width: "100%",
              }}
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
            <Button
              block
              type="primary"
              onClick={() =>
                loadRows(1)
              }
            >
              Apply Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {/* MAIN CONTENT */}
      <Row
        gutter={[20, 20]}
        align="top"
      >
        {/* GROUPED RATES */}
        <Col xs={24} xl={16}>
          <Card
            bordered={false}
            loading={loading}
            title={
              <Space>
                <EnvironmentOutlined />
                <span>Branch Rates</span>
                <Tag color="blue">
                  {groupedRows.length} Branches
                </Tag>
              </Space>
            }
          >
            {!groupedRows.length ? (
              <Empty
                description="No branch rates found"
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() =>
                    openCreate()
                  }
                >
                  Create First Rate
                </Button>
              </Empty>
            ) : (
              <Collapse
                bordered={false}
                defaultActiveKey={
                  groupedRows[0]
                    ? [
                        String(
                          groupedRows[0]
                            .branchId,
                        ),
                      ]
                    : []
                }
                items={groupedRows.map(
                  (group) => ({
                    key: String(
                      group.branchId,
                    ),

                    label: (
                      <Row
                        align="middle"
                        gutter={12}
                        wrap={false}
                      >
                        <Col flex="auto">
                          <Space
                            size={10}
                            wrap
                          >
                            <Text strong>
                              {
                                group
                                  .branchInfo
                                  .name
                              }
                            </Text>

                            <Tag color="blue">
                              {
                                group
                                  .branchInfo
                                  .code
                              }
                            </Tag>

                            <Tag>
                              {
                                group.totalCount
                              }{" "}
                              {group.totalCount ===
                              1
                                ? "rate"
                                : "rates"}
                            </Tag>

                            <Tag color="green">
                              {
                                group.activeCount
                              }{" "}
                              active
                            </Tag>
                          </Space>
                        </Col>
                      </Row>
                    ),

                    children: (
                      <div
                        style={{
                          paddingTop: 8,
                        }}
                      >
                        <Text
                          type="secondary"
                          style={{
                            display: "block",
                            marginBottom: 12,
                            fontSize: 12,
                          }}
                        >
                          Rates originating from{" "}
                          <Text strong>
                            {
                              group
                                .branchInfo
                                .name
                            }
                          </Text>
                        </Text>

                        {group.rows.map(
                          (row) => (
                            <RateRow
                              key={row.id}
                              row={row}
                            />
                          ),
                        )}
                      </div>
                    ),
                  }),
                )}
              />
            )}
          </Card>
        </Col>

        {/* SELECTED RATE */}
        <Col xs={24} xl={8}>
          <div
            style={{
              position: "sticky",
              top: 20,
            }}
          >
            <Card
              bordered={false}
              title={
                <Space>
                  <EnvironmentOutlined />
                  Selected Rate
                </Space>
              }
            >
              {selected ? (
                <>
                  <RouteMap
                    nodes={selectedNodes}
                    height={340}
                    selectedLabel="Selected branch rate"
                  />

                  <div
                    style={{
                      marginTop: 18,
                    }}
                  >
                    <Descriptions
                      column={1}
                      size="small"
                    >
                      <Descriptions.Item label="Pickup / Main Branch">
                        {
                          getBranchDisplay(
                            selected.pickup_branch,
                            selected.pickup_branch_id,
                          ).name
                        }
                      </Descriptions.Item>

                      <Descriptions.Item label="Destination">
                        {
                          getBranchDisplay(
                            selected.delivery_branch,
                            selected.delivery_branch_id,
                          ).name
                        }
                      </Descriptions.Item>

                      <Descriptions.Item label="Base Rate">
                        <Text strong>
                          {formatMoney(
                            selected.base_rate,
                          )}
                        </Text>
                      </Descriptions.Item>

                      <Descriptions.Item label="Status">
                        {statusTag(
                          selected.is_active,
                        )}
                      </Descriptions.Item>

                      <Descriptions.Item label="Last Updated">
                        {formatDate(
                          selected.updated_at,
                        )}
                      </Descriptions.Item>
                    </Descriptions>

                    <Space
                      style={{
                        marginTop: 18,
                      }}
                    >
                      <Button
                        icon={<EditOutlined />}
                        onClick={() =>
                          openEdit(selected)
                        }
                      >
                        Edit Rate
                      </Button>

                      <Button
                        icon={<SwapOutlined />}
                        disabled={
                          Number(
                            selected.pickup_branch_id,
                          ) ===
                          Number(
                            selected.delivery_branch_id,
                          )
                        }
                        onClick={() =>
                          createReverse(
                            selected,
                          )
                        }
                      >
                        Reverse
                      </Button>
                    </Space>
                  </div>
                </>
              ) : (
                <Empty
                  description="Select a rate to view its route"
                />
              )}
            </Card>
          </div>
        </Col>
      </Row>

      {/* CREATE / EDIT MODAL */}
      <Modal
        open={modalOpen}
        title={
          editing
            ? "Edit Branch Rate"
            : "Create Branch Rate"
        }
        width={680}
        confirmLoading={saving}
        okText={
          editing
            ? "Update Rate"
            : "Create Rate"
        }
        onOk={saveRate}
        onCancel={closeModal}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            is_active: true,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="pickup_branch_id"
                label="Pickup / Main Branch"
                rules={[
                  {
                    required: true,
                    message:
                      "Please select pickup branch.",
                  },
                ]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={branchOptions}
                  placeholder="Select main branch"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="delivery_branch_id"
                label="Delivery / Destination Branch"
                rules={[
                  {
                    required: true,
                    message:
                      "Please select delivery branch.",
                  },
                ]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={branchOptions}
                  placeholder="Select destination branch"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="base_rate"
            label="Base Rate"
            rules={[
              {
                required: true,
                message:
                  "Please enter base rate.",
              },
              {
                type: "number",
                min: 0,
                message:
                  "Base rate must be zero or greater.",
              },
            ]}
          >
            <InputNumber
              min={0}
              precision={2}
              addonBefore="NPR"
              style={{
                width: "100%",
              }}
              placeholder="Enter base delivery rate"
            />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Active for Pricing"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Text
            type="secondary"
            style={{
              fontSize: 12,
            }}
          >
            Same-branch pricing is allowed. For example,
            Kathmandu Main Branch → Kathmandu Main Branch
            can have its own local delivery rate.
          </Text>
        </Form>
      </Modal>
    </Space>
  );
}