"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SwapOutlined,
} from "@ant-design/icons";

import PermissionGate from "@/components/rate-admin/PermissionGate";
import RouteMap from "@/components/rate-admin/RouteMap";

import {
  createBranchTransferRoute,
  createReverseBranchTransferRoute,
  deleteBranchTransferRoute,
  getBranchTransferRoutes,
  getRateBranches,
  previewBranchTransferRoute,
  updateBranchTransferRoute,
  updateBranchTransferRouteStatus,
} from "@/services/adminRateManagementService";

import {
  apiErrorMessage,
  branchLabel,
  buildBranchMap,
  extractCollection,
  formatMoney,
  normalizeBranch,
  normalizeTransferRoute,
} from "@/lib/rate-management-page-utils";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const SERVICE_TYPES = [
  {
    label: "Standard",
    value: "standard",
  },
  {
    label: "Express",
    value: "express",
  },
  {
    label: "Same Day",
    value: "same_day",
  },
];

function statusTag(active) {
  return (
    <Tag color={active ? "green" : "default"}>
      {active ? "Active" : "Inactive"}
    </Tag>
  );
}

function moveItem(items, index, direction) {
  const nextIndex = index + direction;

  if (nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(index, 1);

  next.splice(nextIndex, 0, item);

  return next;
}

export default function BranchTransferRoutesPage() {
  const [form] = Form.useForm();
  const [rateForm] = Form.useForm();

  const [branches, setBranches] = useState([]);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null);

  /*
   * Separate quick rate editor.
   */
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [rateEditing, setRateEditing] = useState(null);
  const [rateSaving, setRateSaving] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    origin_branch_id: undefined,
    destination_branch_id: undefined,
    service_type: undefined,
    is_active: undefined,
  });

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 25,
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

      setBranches(
        collection.rows
          .map(normalizeBranch)
          .filter((branch) =>
            Number.isFinite(Number(branch?.id)),
          ),
      );
    } catch (error) {
      message.error(
        apiErrorMessage(
          error,
          "Could not load branch options.",
        ),
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

        const payload = await getBranchTransferRoutes({
          page,
          per_page: pageSize,

          search:
            filters.search || undefined,

          origin_branch_id:
            filters.origin_branch_id || undefined,

          destination_branch_id:
            filters.destination_branch_id || undefined,

          service_type:
            filters.service_type || undefined,

          is_active:
            filters.is_active === undefined
              ? undefined
              : filters.is_active,
        });

        const collection = extractCollection(payload);

        const normalized = collection.rows.map((row) =>
          normalizeTransferRoute(row, branchesById),
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
          current:
            collection.currentPage || page,

          pageSize:
            collection.pageSize || pageSize,

          total:
            collection.total,
        });
      } catch (error) {
        message.error(
          apiErrorMessage(
            error,
            "Could not load transfer routes.",
          ),
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
    if (branches.length) {
      loadRows(1, pagination.pageSize);
    }
  }, [branches.length]);

  const stats = useMemo(() => {
    const active = rows.filter(
      (row) => row.is_active,
    ).length;

    const averageRate = rows.length
      ? rows.reduce(
          (sum, row) =>
            sum + Number(row.base_rate || 0),
          0,
        ) / rows.length
      : 0;

    const averageTransfers = rows.length
      ? rows.reduce(
          (sum, row) =>
            sum + Number(row.transfer_count || 0),
          0,
        ) / rows.length
      : 0;

    return {
      active,
      averageRate,
      averageTransfers,
    };
  }, [rows]);

  const openCreate = (prefill = {}) => {
    setEditing(null);
    setPreview(null);

    form.setFieldsValue({
      route_code: "",
      name: "",

      origin_branch_id:
        undefined,

      transit_branch_ids:
        [],

      destination_branch_id:
        undefined,

      service_type:
        "standard",

      base_rate:
        undefined,

      currency:
        "NPR",

      priority:
        100,

      is_default:
        true,

      is_active:
        true,

      notes:
        "",

      ...prefill,
    });

    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);

    form.setFieldsValue({
      route_code:
        row.route_code,

      name:
        row.name,

      origin_branch_id:
        row.origin_branch_id,

      transit_branch_ids:
        row.transit_branch_ids || [],

      destination_branch_id:
        row.destination_branch_id,

      service_type:
        row.service_type || "standard",

      base_rate:
        Number(row.base_rate),

      currency:
        row.currency || "NPR",

      priority:
        Number(row.priority || 100),

      is_default:
        Boolean(row.is_default),

      is_active:
        Boolean(row.is_active),

      notes:
        row.notes || "",
    });

    setPreview({
      path:
        row.path,

      path_text:
        row.path_text,

      transfer_count:
        row.transfer_count,

      transit_count:
        row.transit_count,

      total_distance_km:
        row.total_distance_km,

      total_estimated_hours:
        row.total_estimated_hours,
    });

    setModalOpen(true);
  };

  /*
   * Opens only the route-rate editor.
   */
  const openRateEditor = (row) => {
    setRateEditing(row);

    rateForm.setFieldsValue({
      base_rate:
        Number(row.base_rate),

      currency:
        row.currency || "NPR",

      priority:
        Number(row.priority || 100),

      is_default:
        Boolean(row.is_default),

      is_active:
        Boolean(row.is_active),
    });

    setRateModalOpen(true);
  };

  /*
   * Updates the complete route while preserving its
   * existing path and service configuration.
   */
  const saveRateOnly = async () => {
    try {
      if (!rateEditing) {
        return;
      }

      const values =
        await rateForm.validateFields();

      const payload = {
        route_code:
          rateEditing.route_code,

        name:
          rateEditing.name,

        origin_branch_id:
          Number(
            rateEditing.origin_branch_id,
          ),

        transit_branch_ids:
          Array.isArray(
            rateEditing.transit_branch_ids,
          )
            ? rateEditing.transit_branch_ids.map(Number)
            : [],

        destination_branch_id:
          Number(
            rateEditing.destination_branch_id,
          ),

        service_type:
          rateEditing.service_type || "standard",

        base_rate:
          Number(values.base_rate),

        currency:
          values.currency || "NPR",

        priority:
          Number(values.priority || 100),

        is_default:
          Boolean(values.is_default),

        is_active:
          Boolean(values.is_active),

        notes:
          rateEditing.notes || null,
      };

      setRateSaving(true);

      await updateBranchTransferRoute(
        rateEditing.id,
        payload,
      );

      message.success(
        "Route base rate updated.",
      );

      setRateModalOpen(false);
      setRateEditing(null);

      rateForm.resetFields();

      await loadRows();
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      message.error(
        apiErrorMessage(
          error,
          "Could not update the route base rate.",
        ),
      );
    } finally {
      setRateSaving(false);
    }
  };

  const buildRouteDefinition = async () => {
    const values = await form.validateFields([
      "origin_branch_id",
      "transit_branch_ids",
      "destination_branch_id",
      "service_type",
    ]);

    const ids = [
      Number(values.origin_branch_id),

      ...(values.transit_branch_ids || []).map(
        Number,
      ),

      Number(values.destination_branch_id),
    ];

    const uniqueIds = new Set(ids);

    if (uniqueIds.size !== ids.length) {
      throw new Error(
        "Origin, transit, and destination branches must not repeat.",
      );
    }

    return {
      origin_branch_id:
        Number(values.origin_branch_id),

      transit_branch_ids:
        values.transit_branch_ids?.map(Number) || [],

      destination_branch_id:
        Number(values.destination_branch_id),

      service_type:
        values.service_type,
    };
  };

  const previewRoute = async () => {
    try {
      setPreviewing(true);

      const definition =
        await buildRouteDefinition();

      const result =
        await previewBranchTransferRoute(
          definition,
        );

      setPreview(result);

      message.success(
        "Route preview generated.",
      );
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      message.error(
        apiErrorMessage(
          error,
          "Could not preview transfer route.",
        ),
      );
    } finally {
      setPreviewing(false);
    }
  };

  const saveRoute = async () => {
    try {
      const values =
        await form.validateFields();

      const definition =
        await buildRouteDefinition();

      const payload = {
        route_code:
          values.route_code.trim(),

        name:
          values.name.trim(),

        ...definition,

        base_rate:
          Number(values.base_rate),

        currency:
          values.currency || "NPR",

        priority:
          Number(values.priority || 100),

        is_default:
          Boolean(values.is_default),

        is_active:
          Boolean(values.is_active),

        notes:
          values.notes?.trim() || null,
      };

      setSaving(true);

      if (editing) {
        await updateBranchTransferRoute(
          editing.id,
          payload,
        );

        message.success(
          "Transfer route updated.",
        );
      } else {
        await createBranchTransferRoute(
          payload,
        );

        message.success(
          "Transfer route created.",
        );
      }

      setModalOpen(false);
      setEditing(null);
      setPreview(null);

      form.resetFields();

      await loadRows();
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      message.error(
        apiErrorMessage(
          error,
          "Could not save transfer route.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (row) => {
    try {
      await updateBranchTransferRouteStatus(
        row.id,
        !row.is_active,
      );

      message.success(
        `Transfer route ${
          row.is_active
            ? "disabled"
            : "enabled"
        }.`,
      );

      await loadRows();
    } catch (error) {
      message.error(
        apiErrorMessage(
          error,
          "Could not update route status.",
        ),
      );
    }
  };

  const createReverse = async (row) => {
    try {
      await createReverseBranchTransferRoute(
        row,
      );

      message.success(
        "Reverse transfer route created.",
      );

      await loadRows();
    } catch (error) {
      message.error(
        apiErrorMessage(
          error,
          "Could not create reverse route. Confirm that every reverse direct lane exists.",
        ),
      );
    }
  };

  const removeRoute = async (row) => {
    try {
      await deleteBranchTransferRoute(
        row.id,
      );

      message.success(
        "Transfer route deleted.",
      );

      await loadRows();
    } catch (error) {
      message.error(
        apiErrorMessage(
          error,
          "Could not delete transfer route.",
        ),
      );
    }
  };

  const moveTransit = (
    index,
    direction,
  ) => {
    const current =
      form.getFieldValue(
        "transit_branch_ids",
      ) || [];

    const next = moveItem(
      current,
      index,
      direction,
    );

    form.setFieldValue(
      "transit_branch_ids",
      next,
    );
  };

  const columns = [
    {
      title: "Route",
      key: "route",
      width: 320,

      render: (_, row) => (
        <Space
          direction="vertical"
          size={2}
        >
          <Text strong>
            {row.name}
          </Text>

          <Text
            type="secondary"
            style={{
              fontSize: 12,
            }}
          >
            {row.route_code}
          </Text>

          <Text
            style={{
              fontSize: 12,
            }}
          >
            {row.path_text || "No path"}
          </Text>
        </Space>
      ),
    },

    {
      title: "Service",
      dataIndex: "service_type",
      width: 110,

      render: (value) => (
        <Tag color="blue">
          {value}
        </Tag>
      ),
    },

    {
      title: "Route Base Rate",
      key: "base_rate",
      width: 190,

      render: (_, row) => (
        <Space
          direction="vertical"
          size={2}
        >
          <Text strong>
            {formatMoney(
              row.base_rate,
              row.currency,
            )}
          </Text>

          {/* <PermissionGate
            permission="pricing.transfer_routes.update"
          > */}
            <Button
              type="link"
              size="small"
              icon={<DollarOutlined />}
              style={{
                padding: 0,
                height: "auto",
              }}
              onClick={(event) => {
                event.stopPropagation();
                openRateEditor(row);
              }}
            >
              Edit Rate
            </Button>
          {/* </PermissionGate> */}
        </Space>
      ),
    },

    {
      title: "Transfers",
      dataIndex: "transfer_count",
      width: 95,
      align: "center",

      render: (value) => (
        <Tag color="purple">
          {value}
        </Tag>
      ),
    },

    {
      title: "Transits",
      dataIndex: "transit_count",
      width: 85,
      align: "center",
    },

    {
      title: "Distance",
      dataIndex: "total_distance_km",
      width: 110,

      render: (value) =>
        `${Number(value || 0).toFixed(2)} km`,
    },

    {
      title: "ETA",
      dataIndex: "total_estimated_hours",
      width: 90,

      render: (value) =>
        `${Number(value || 0)} hrs`,
    },

    {
      title: "Default",
      dataIndex: "is_default",
      width: 90,

      render: (value) =>
        value
          ? (
              <Tag color="gold">
                Default
              </Tag>
            )
          : "—",
    },

    {
      title: "Status",
      dataIndex: "is_active",
      width: 100,
      render: statusTag,
    },

    {
      title: "Actions",
      key: "actions",
      width: 300,
      fixed: "right",

      render: (_, row) => (
        <Space wrap>
          {/* <PermissionGate
            permission="pricing.transfer_routes.update"
          > */}
            <Tooltip title="Edit complete route">
              <Button
                size="small"
                type="primary"
                ghost
                icon={<EditOutlined />}
                onClick={(event) => {
                  event.stopPropagation();
                  openEdit(row);
                }}
              >
                Edit
              </Button>
            </Tooltip>
          {/* </PermissionGate> */}

          {/* <PermissionGate
            permission="pricing.transfer_routes.create"
          > */}
            <Tooltip title="Create reverse route">
              <Button
                size="small"
                icon={<SwapOutlined />}
                onClick={(event) => {
                  event.stopPropagation();
                  createReverse(row);
                }}
              />
            </Tooltip>
          {/* </PermissionGate> */}

          {/* <PermissionGate
            permission="pricing.transfer_routes.status"
          > */}
            <Button
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                toggleStatus(row);
              }}
            >
              {row.is_active
                ? "Disable"
                : "Enable"}
            </Button>
          {/* </PermissionGate> */}

          {/* <PermissionGate
            permission="pricing.transfer_routes.delete"
          > */}
            <Popconfirm
              title="Delete this transfer route?"
              description="Saved pricing quotes should retain their route snapshot."
              okText="Delete"
              okButtonProps={{
                danger: true,
              }}
              onConfirm={() =>
                removeRoute(row)
              }
            >
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={(event) =>
                  event.stopPropagation()
                }
              />
            </Popconfirm>
          {/* </PermissionGate> */}
        </Space>
      ),
    },
  ];

  const selectedNodes =
    Array.isArray(selected?.path)
      ? selected.path.filter(
          (branch) =>
            Number.isFinite(
              Number(branch?.latitude),
            ) &&
            Number.isFinite(
              Number(branch?.longitude),
            ),
        )
      : [];

  const watchedTransits =
    Form.useWatch(
      "transit_branch_ids",
      form,
    ) || [];

  return (
    <Space
      direction="vertical"
      size={20}
      style={{
        width: "100%",
      }}
    >
      <Card bordered={false}>
        <Row
          justify="space-between"
          align="middle"
          gutter={[16, 16]}
        >
          <Col>
            <Title
              level={3}
              style={{
                margin: 0,
              }}
            >
              Transfer Routes & Base Rates
            </Title>

            <Text type="secondary">
              Manage all direct and multi-stop routes and
              their complete route base rates.
            </Text>
          </Col>

          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() =>
                  loadRows()
                }
              >
                Refresh
              </Button>

              {/* <PermissionGate
                permission="pricing.transfer_routes.create"
              > */}
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() =>
                    openCreate()
                  }
                >
                  Add Transfer Route
                </Button>
              {/* </PermissionGate> */}
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card bordered={false}>
            <Statistic
              title="Loaded Routes"
              value={rows.length}
            />
          </Card>
        </Col>

        <Col xs={24} md={6}>
          <Card bordered={false}>
            <Statistic
              title="Active Routes"
              value={stats.active}
            />
          </Card>
        </Col>

        <Col xs={24} md={6}>
          <Card bordered={false}>
            <Statistic
              title="Average Route Rate"
              value={stats.averageRate}
              precision={2}
              prefix="NPR"
            />
          </Card>
        </Col>

        <Col xs={24} md={6}>
          <Card bordered={false}>
            <Statistic
              title="Average Transfers"
              value={stats.averageTransfers}
              precision={1}
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={6}>
            <Input
              allowClear
              placeholder="Search route code, name or branch"
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search:
                    event.target.value,
                }))
              }
            />
          </Col>

          <Col xs={24} sm={12} lg={4}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Origin branch"
              style={{
                width: "100%",
              }}
              options={branchOptions}
              value={
                filters.origin_branch_id
              }
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  origin_branch_id:
                    value,
                }))
              }
            />
          </Col>

          <Col xs={24} sm={12} lg={4}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Destination branch"
              style={{
                width: "100%",
              }}
              options={branchOptions}
              value={
                filters.destination_branch_id
              }
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  destination_branch_id:
                    value,
                }))
              }
            />
          </Col>

          <Col xs={24} sm={12} lg={4}>
            <Select
              allowClear
              placeholder="Service"
              style={{
                width: "100%",
              }}
              options={SERVICE_TYPES}
              value={
                filters.service_type
              }
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  service_type:
                    value,
                }))
              }
            />
          </Col>

          <Col xs={24} sm={12} lg={3}>
            <Select
              allowClear
              placeholder="Status"
              style={{
                width: "100%",
              }}
              value={
                filters.is_active
              }
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  is_active:
                    value,
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

          <Col xs={24} lg={3}>
            <Button
              block
              type="primary"
              onClick={() =>
                loadRows(1)
              }
            >
              Apply
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card bordered={false}>
            <Table
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={rows}
              scroll={{
                x: 1600,
              }}
              rowClassName={(row) =>
                Number(row.id) ===
                Number(selected?.id)
                  ? "ant-table-row-selected"
                  : ""
              }
              onRow={(row) => ({
                onClick: () =>
                  setSelected(row),

                style: {
                  cursor: "pointer",
                },
              })}
              pagination={{
                current:
                  pagination.current,

                pageSize:
                  pagination.pageSize,

                total:
                  pagination.total,

                showSizeChanger:
                  true,
              }}
              onChange={(next) =>
                loadRows(
                  next.current,
                  next.pageSize,
                )
              }
            />
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card
            bordered={false}
            title="Selected Route Map"
          >
            <RouteMap
              nodes={selectedNodes}
              height={390}
              selectedLabel="Complete transfer route"
            />

            <Descriptions
              column={1}
              size="small"
              style={{
                marginTop: 18,
              }}
            >
              <Descriptions.Item label="Route">
                {selected?.path_text || "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Route Base Rate">
                <Space>
                  <Text strong>
                    {selected
                      ? formatMoney(
                          selected.base_rate,
                          selected.currency,
                        )
                      : "—"}
                  </Text>

                  {selected ? (
                    // <PermissionGate
                    //   permission="pricing.transfer_routes.update"
                    // >
                      <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() =>
                          openRateEditor(
                            selected,
                          )
                        }
                      >
                        Edit Rate
                      </Button>
                    // </PermissionGate>
                  ) : null}
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Transfers">
                {selected?.transfer_count ?? "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Transit Branches">
                {selected?.transit_count ?? "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Distance">
                {selected
                  ? `${Number(
                      selected.total_distance_km ||
                        0,
                    ).toFixed(2)} km`
                  : "—"}
              </Descriptions.Item>

              <Descriptions.Item label="ETA">
                {selected
                  ? `${Number(
                      selected.total_estimated_hours ||
                        0,
                    )} hrs`
                  : "—"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {/* Complete route create/edit modal */}
      <Modal
        open={modalOpen}
        title={
          editing
            ? "Edit Transfer Route & Base Rate"
            : "Create Transfer Route & Base Rate"
        }
        width={920}
        confirmLoading={saving}
        okText={
          editing
            ? "Update Route"
            : "Create Route"
        }
        onOk={saveRoute}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
          setPreview(null);
          form.resetFields();
        }}
        destroyOnClose
      >
        <Alert
          type="info"
          showIcon
          message="The backend validates that every direct lane in the selected sequence exists and is active."
          style={{
            marginBottom: 18,
          }}
        />

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            service_type:
              "standard",

            currency:
              "NPR",

            transit_branch_ids:
              [],

            priority:
              100,

            is_default:
              true,

            is_active:
              true,
          }}
        >
          <Row gutter={16}>
            <Col span={9}>
              <Form.Item
                name="route_code"
                label="Route Code"
                rules={[
                  {
                    required: true,
                    message:
                      "Route code is required.",
                  },
                  {
                    max: 100,
                  },
                ]}
              >
                <Input placeholder="KTM-MUS-STANDARD" />
              </Form.Item>
            </Col>

            <Col span={15}>
              <Form.Item
                name="name"
                label="Route Name"
                rules={[
                  {
                    required: true,
                    message:
                      "Route name is required.",
                  },
                  {
                    max: 255,
                  },
                ]}
              >
                <Input placeholder="Kathmandu to Mustang via Pokhara" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="origin_branch_id"
                label="Origin Branch"
                rules={[
                  {
                    required: true,
                    message:
                      "Origin branch is required.",
                  },
                ]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={branchOptions}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="destination_branch_id"
                label="Destination Branch"
                rules={[
                  {
                    required: true,
                    message:
                      "Destination branch is required.",
                  },
                ]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={branchOptions}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="transit_branch_ids"
            label="Transit Branches in Route Order"
            help="Selection order is used as the route order. Use the arrows below to correct it."
          >
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="label"
              options={branchOptions}
              placeholder="Example: Pokhara"
            />
          </Form.Item>

          {watchedTransits.length > 0 ? (
            <Card
              size="small"
              style={{
                marginBottom: 18,
              }}
            >
              <List
                size="small"
                dataSource={watchedTransits}
                renderItem={(
                  branchId,
                  index,
                ) => {
                  const branch =
                    branchesById.get(
                      Number(branchId),
                    );

                  return (
                    <List.Item
                      actions={[
                        <Button
                          key="up"
                          size="small"
                          icon={
                            <ArrowUpOutlined />
                          }
                          disabled={
                            index === 0
                          }
                          onClick={() =>
                            moveTransit(
                              index,
                              -1,
                            )
                          }
                        />,

                        <Button
                          key="down"
                          size="small"
                          icon={
                            <ArrowDownOutlined />
                          }
                          disabled={
                            index ===
                            watchedTransits.length -
                              1
                          }
                          onClick={() =>
                            moveTransit(
                              index,
                              1,
                            )
                          }
                        />,
                      ]}
                    >
                      <Space>
                        <Tag color="purple">
                          {index + 1}
                        </Tag>

                        <Text>
                          {branch?.name ||
                            `Branch ${branchId}`}
                        </Text>
                      </Space>
                    </List.Item>
                  );
                }}
              />
            </Card>
          ) : null}

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                name="service_type"
                label="Service Type"
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <Select
                  options={SERVICE_TYPES}
                />
              </Form.Item>
            </Col>

            <Col span={7}>
              <Form.Item
                name="base_rate"
                label="Complete Route Base Rate"
                rules={[
                  {
                    required: true,
                    message:
                      "Route base rate is required.",
                  },
                  {
                    type: "number",
                    min: 0,
                    message:
                      "Route base rate cannot be negative.",
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
                />
              </Form.Item>
            </Col>

            <Col span={5}>
              <Form.Item
                name="currency"
                label="Currency"
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <Select
                  options={[
                    {
                      label: "NPR",
                      value: "NPR",
                    },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item
                name="priority"
                label="Priority"
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <InputNumber
                  min={1}
                  style={{
                    width: "100%",
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                name="is_default"
                label="Default Route"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item
                name="is_active"
                label="Active"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Space
                style={{
                  marginTop: 30,
                }}
              >
                <Button
                  icon={<EyeOutlined />}
                  loading={previewing}
                  onClick={previewRoute}
                >
                  Preview and Validate Route
                </Button>
              </Space>
            </Col>
          </Row>

          <Form.Item
            name="notes"
            label="Notes"
          >
            <TextArea
              rows={3}
              maxLength={1000}
              showCount
              placeholder="Optional operations or pricing note"
            />
          </Form.Item>
        </Form>

        {preview ? (
          <>
            <Divider />

            <Card
              size="small"
              title="Validated Route Preview"
            >
              <Descriptions
                column={2}
                size="small"
              >
                <Descriptions.Item
                  label="Path"
                  span={2}
                >
                  {preview.path_text ||
                    preview.route_text ||
                    preview.path
                      ?.map(
                        (branch) =>
                          branch.name,
                      )
                      .join(" → ") ||
                    "—"}
                </Descriptions.Item>

                <Descriptions.Item label="Transfer Count">
                  {preview.transfer_count ??
                    "—"}
                </Descriptions.Item>

                <Descriptions.Item label="Transit Count">
                  {preview.transit_count ??
                    "—"}
                </Descriptions.Item>

                <Descriptions.Item label="Distance">
                  {preview.total_distance_km !==
                  undefined
                    ? `${Number(
                        preview.total_distance_km,
                      ).toFixed(2)} km`
                    : "—"}
                </Descriptions.Item>

                <Descriptions.Item label="Estimated Hours">
                  {preview.total_estimated_hours ??
                    "—"}
                </Descriptions.Item>
              </Descriptions>

              <Paragraph
                type="secondary"
                style={{
                  marginTop: 12,
                  marginBottom: 0,
                }}
              >
                The base rate is stored on the complete
                transfer route, not on its individual
                transfer lanes.
              </Paragraph>
            </Card>
          </>
        ) : null}
      </Modal>

      {/* Quick route-rate editor */}
      <Modal
        open={rateModalOpen}
        title={
          rateEditing
            ? `Edit Route Base Rate — ${rateEditing.route_code}`
            : "Edit Route Base Rate"
        }
        width={560}
        confirmLoading={rateSaving}
        okText="Update Rate"
        onOk={saveRateOnly}
        onCancel={() => {
          setRateModalOpen(false);
          setRateEditing(null);
          rateForm.resetFields();
        }}
        destroyOnClose
      >
        <Alert
          type="info"
          showIcon
          message="This updates the complete route base rate used by configured transfer-route pricing."
          description={
            rateEditing?.path_text
              ? `Route: ${rateEditing.path_text}`
              : undefined
          }
          style={{
            marginBottom: 18,
          }}
        />

        <Form
          form={rateForm}
          layout="vertical"
          initialValues={{
            currency:
              "NPR",

            priority:
              100,

            is_default:
              true,

            is_active:
              true,
          }}
        >
          <Form.Item
            name="base_rate"
            label="Complete Route Base Rate"
            rules={[
              {
                required: true,
                message:
                  "Route base rate is required.",
              },
              {
                type: "number",
                min: 0,
                message:
                  "Route base rate cannot be negative.",
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
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="currency"
                label="Currency"
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <Select
                  options={[
                    {
                      label: "NPR",
                      value: "NPR",
                    },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="priority"
                label="Priority"
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <InputNumber
                  min={1}
                  style={{
                    width: "100%",
                  }}
                />
              </Form.Item>
            </Col>

            <Col span={4}>
              <Form.Item
                name="is_default"
                label="Default"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>

            <Col span={4}>
              <Form.Item
                name="is_active"
                label="Active"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Space>
  );
}