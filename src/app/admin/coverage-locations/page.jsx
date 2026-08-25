"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";

import {
  ApartmentOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  GlobalOutlined,
  HeatMapOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TableOutlined,
} from "@ant-design/icons";

import {
  deleteCoverageLocation,
  getCoverageLocations,
  updateCoverageLocation,
} from "@/services/branchAllocationApi";

import { useAccess } from "@/hooks/useAccess";

const CoverageRadiusMapFull = dynamic(
  () =>
    import(
      "@/components/maps/CoverageRadiusMapFull"
    ),
  {
    ssr: false,

    loading: () => (
      <div
        style={{
          height: 650,
          background: "#f5f5f5",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading Nepal map...
      </div>
    ),
  }
);

const { Text } = Typography;

/*
|--------------------------------------------------------------------------
| Permissions
|--------------------------------------------------------------------------
*/

const PERMISSIONS = {
  VIEW: "coverage_locations.view",
  CREATE: "coverage_locations.create",
  EDIT: "coverage_locations.edit",
  DELETE: "coverage_locations.delete",
  STATUS: "coverage_locations.status",
};

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function normalizeRows(response) {
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  return [];
}

function exportToCsv(data, filename) {
  const headers = [
    "ID",
    "Name",
    "Code",
    "Type",
    "Parent",
    "Radius (km)",
    "City",
    "Area",
    "Franchise",
    "Status",
  ];

  const csvRows = data.map((r) => [
    r.id,
    r.name,
    r.code,
    r.type,
    r.parent?.name || "",
    r.coverage_radius_km,
    r.city || "",
    r.area || "",
    r.branch?.name || "",
    r.status,
  ]);

  const csv = [
    headers,
    ...csvRows,
  ]
    .map((row) =>
      row
        .map((value) =>
          `"${String(value ?? "").replaceAll('"', '""')}"`
        )
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/

export default function CoverageLocationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filterForm] = Form.useForm();

  /*
   * Central access control.
   */
  const {
    can,
    loading: accessLoading,
  } = useAccess();

  /*
   * Permission flags.
   */
  const canView = can(PERMISSIONS.VIEW);
  const canCreate = can(PERMISSIONS.CREATE);
  const canEdit = can(PERMISSIONS.EDIT);
  const canDelete = can(PERMISSIONS.DELETE);
  const canChangeStatus = can(PERMISSIONS.STATUS);

  /*
   * Data state.
   */
  const [rows, setRows] = useState([]);

  const [loading, setLoading] = useState(false);

  const [viewMode, setViewMode] =
    useState("table");

  const [selectedMainKeys, setSelectedMainKeys] =
    useState([]);

  const [selectedSubKeys, setSelectedSubKeys] =
    useState([]);

  const [togglingId, setTogglingId] =
    useState(null);

  /*
  |--------------------------------------------------------------------------
  | Filters
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    filterForm.setFieldsValue({
      q: searchParams.get("q") || undefined,

      parent_id: searchParams.get("parent_id")
        ? Number(searchParams.get("parent_id"))
        : undefined,

      status:
        searchParams.get("status") ||
        undefined,
    });
  }, [filterForm, searchParams]);

  /*
  |--------------------------------------------------------------------------
  | Derived data
  |--------------------------------------------------------------------------
  */

  const mainZones = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.type === "main_branch_zone"
      ),
    [rows]
  );

  const subZones = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.type === "sub_branch_zone"
      ),
    [rows]
  );

  const subCountByParent = useMemo(() => {
    const map = {};

    subZones.forEach((record) => {
      if (record.parent_id) {
        map[record.parent_id] =
          (map[record.parent_id] || 0) + 1;
      }
    });

    return map;
  }, [subZones]);

  /*
  |--------------------------------------------------------------------------
  | URL filters
  |--------------------------------------------------------------------------
  */

  const syncUrl = useCallback(
    (values) => {
      const params =
        new URLSearchParams();

      if (values.q) {
        params.set("q", values.q);
      }

      if (values.parent_id) {
        params.set(
          "parent_id",
          values.parent_id
        );
      }

      if (values.status) {
        params.set(
          "status",
          values.status
        );
      }

      router.replace(
        `?${params.toString()}`,
        {
          scroll: false,
        }
      );
    },
    [router]
  );

  /*
  |--------------------------------------------------------------------------
  | Load
  |--------------------------------------------------------------------------
  */

  const loadRows = useCallback(
    async () => {
      if (!canView) {
        return;
      }

      try {
        setLoading(true);

        const values =
          filterForm.getFieldsValue();

        syncUrl(values);

        const params = {
          all: 1,

          q:
            values.q ||
            undefined,

          status:
            values.status ||
            undefined,

          parent_id:
            values.parent_id ||
            undefined,
        };

        const response =
          await getCoverageLocations(
            params
          );

        setRows(
          normalizeRows(response)
        );
      } catch (error) {
        message.error(
          error?.response?.data?.message ||
            "Could not load coverage allocations."
        );
      } finally {
        setLoading(false);
      }
    },
    [
      canView,
      filterForm,
      syncUrl,
    ]
  );

  useEffect(() => {
    if (!accessLoading && canView) {
      loadRows();
    }
  }, [
    accessLoading,
    canView,
    loadRows,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Delete
  |--------------------------------------------------------------------------
  */

  const removeRecord =
    useCallback(
      async (id) => {
        if (!canDelete) {
          message.warning(
            "You do not have permission to delete coverage allocations."
          );

          return;
        }

        try {
          await deleteCoverageLocation(
            id
          );

          message.success("Deleted.");

          await loadRows();
        } catch (error) {
          message.error(
            error?.response?.data?.message ||
              "Could not delete."
          );
        }
      },
      [
        canDelete,
        loadRows,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Bulk delete
  |--------------------------------------------------------------------------
  */

  const removeBulk =
    useCallback(
      async (ids) => {
        if (!canDelete) {
          message.warning(
            "You do not have permission to delete coverage allocations."
          );

          return;
        }

        try {
          await Promise.all(
            ids.map((id) =>
              deleteCoverageLocation(id)
            )
          );

          message.success(
            `${ids.length} allocation(s) deleted.`
          );

          setSelectedMainKeys([]);
          setSelectedSubKeys([]);

          await loadRows();
        } catch (error) {
          message.error(
            error?.response?.data?.message ||
              "Could not delete."
          );
        }
      },
      [
        canDelete,
        loadRows,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Status
  |--------------------------------------------------------------------------
  */

  const toggleStatus =
    useCallback(
      async (record) => {
        if (!canChangeStatus) {
          message.warning(
            "You do not have permission to change allocation status."
          );

          return;
        }

        setTogglingId(record.id);

        try {
          const newStatus =
            record.status === "active"
              ? "inactive"
              : "active";

          await updateCoverageLocation(
            record.id,
            {
              ...record,
              status: newStatus,
            }
          );

          message.success(
            `Status → ${newStatus}.`
          );

          await loadRows();
        } catch (error) {
          message.error(
            error?.response?.data?.message ||
              "Could not update status."
          );
        } finally {
          setTogglingId(null);
        }
      },
      [
        canChangeStatus,
        loadRows,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Reset filters
  |--------------------------------------------------------------------------
  */

  const resetFilters =
    useCallback(() => {
      filterForm.resetFields();

      router.replace("?", {
        scroll: false,
      });

      loadRows();
    }, [
      filterForm,
      router,
      loadRows,
    ]);

  /*
  |--------------------------------------------------------------------------
  | Actions
  |--------------------------------------------------------------------------
  */

  const actionCol =
    useCallback(
      (record) => {
        const actions = [];

        /*
         * View is available whenever
         * coverage_locations.view exists.
         */
        if (canView) {
          actions.push(
            <Link
              key="view"
              href={`/admin/coverage-locations/${record.id}`}
            >
              <Button
                size="small"
                icon={<EyeOutlined />}
              />
            </Link>
          );
        }

        /*
         * Edit requires edit permission.
         */
        if (canEdit) {
          actions.push(
            <Link
              key="edit"
              href={`/admin/coverage-locations/${record.id}/edit`}
            >
              <Button
                size="small"
                icon={<EditOutlined />}
              />
            </Link>
          );
        }

        /*
         * Delete requires delete permission.
         */
        if (canDelete) {
          actions.push(
            <Popconfirm
              key="delete"
              title="Delete this allocation?"
              description="This action cannot be undone."
              onConfirm={() =>
                removeRecord(record.id)
              }
            >
              <Button
                size="small"
                danger
                icon={
                  <DeleteOutlined />
                }
              />
            </Popconfirm>
          );
        }

        if (!actions.length) {
          return null;
        }

        return (
          <Space>
            {actions}
          </Space>
        );
      },
      [
        canView,
        canEdit,
        canDelete,
        removeRecord,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Status column
  |--------------------------------------------------------------------------
  */

  const statusCol =
    useCallback(
      (record) => {
        /*
         * User can see status,
         * but cannot change it.
         */
        if (!canChangeStatus) {
          return (
            <Tag
              color={
                record.status ===
                "active"
                  ? "blue"
                  : "default"
              }
            >
              {record.status ===
              "active"
                ? "Active"
                : "Inactive"}
            </Tag>
          );
        }

        return (
          <Switch
            size="small"
            checked={
              record.status ===
              "active"
            }
            loading={
              togglingId ===
              record.id
            }
            onChange={() =>
              toggleStatus(record)
            }
            checkedChildren="Active"
            unCheckedChildren="Inactive"
          />
        );
      },
      [
        canChangeStatus,
        togglingId,
        toggleStatus,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Main columns
  |--------------------------------------------------------------------------
  */

  const mainColumns = useMemo(
    () => {
      const columns = [
        {
          title: "ID",
          dataIndex: "id",
          width: 65,

          sorter: (a, b) =>
            Number(a.id) -
            Number(b.id),
        },

        {
          title: "Allocation",
          dataIndex: "name",

          sorter: (a, b) =>
            String(
              a.name || ""
            ).localeCompare(
              String(
                b.name || ""
              )
            ),

          render: (
            text,
            record
          ) => (
            <Space
              direction="vertical"
              size={0}
            >
              {canView ? (
                <Link
                  href={`/admin/coverage-locations/${record.id}`}
                >
                  {text}
                </Link>
              ) : (
                <Text>
                  {text}
                </Text>
              )}

              <Text
                type="secondary"
                style={{
                  fontSize: 12,
                }}
              >
                {record.code}
              </Text>
            </Space>
          ),
        },

        {
          title: "Sub-Branches",
          width: 110,
          align: "center",

          sorter: (a, b) =>
            (subCountByParent[
              a.id
            ] || 0) -
            (subCountByParent[
              b.id
            ] || 0),

          render: (_, record) => (
            <Tag
              color={
                subCountByParent[
                  record.id
                ]
                  ? "blue"
                  : "default"
              }
            >
              {subCountByParent[
                record.id
              ] || 0}
            </Tag>
          ),
        },

        {
          title: "Radius",
          dataIndex:
            "coverage_radius_km",

          width: 90,
          align: "right",

          sorter: (a, b) =>
            Number(
              a.coverage_radius_km ||
                0
            ) -
            Number(
              b.coverage_radius_km ||
                0
            ),

          render: (value) =>
            `${value} km`,
        },

        {
          title: "City / Area",

          render: (_, record) => (
            <Text>
              {record.city ||
                "-"}{" "}
              /{" "}
              {record.area ||
                "-"}
            </Text>
          ),
        },

        {
          title: "Franchise",

          render: (_, record) =>
            record.branch?.name ||
            (
              <Text type="secondary">
                —
              </Text>
            ),
        },

        {
          title: "Status",

          width: 110,
          align: "center",

          render: (_, record) =>
            statusCol(record),
        },
      ];

      /*
       * Only show actions if at least
       * one action is actually allowed.
       */
      if (
        canView ||
        canEdit ||
        canDelete
      ) {
        columns.push({
          title: "",
          fixed: "right",
          width: 120,

          render: (_, record) =>
            actionCol(record),
        });
      }

      return columns;
    },
    [
      canView,
      canEdit,
      canDelete,
      subCountByParent,
      statusCol,
      actionCol,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | Sub columns
  |--------------------------------------------------------------------------
  */

  const subColumns = useMemo(
    () => {
      const columns = [
        {
          title: "ID",
          dataIndex: "id",
          width: 65,

          sorter: (a, b) =>
            Number(a.id) -
            Number(b.id),
        },

        {
          title: "Allocation",
          dataIndex: "name",

          render: (
            text,
            record
          ) => (
            <Space
              direction="vertical"
              size={0}
            >
              {canView ? (
                <Link
                  href={`/admin/coverage-locations/${record.id}`}
                >
                  {text}
                </Link>
              ) : (
                <Text>
                  {text}
                </Text>
              )}

              <Text
                type="secondary"
                style={{
                  fontSize: 12,
                }}
              >
                {record.code}
              </Text>
            </Space>
          ),
        },

        {
          title: "Parent",

          render: (_, record) =>
            record.parent?.name ||
            (
              <Text type="secondary">
                —
              </Text>
            ),
        },

        {
          title: "Radius",

          dataIndex:
            "coverage_radius_km",

          width: 90,
          align: "right",

          render: (value) =>
            `${value} km`,
        },

        {
          title: "City / Area",

          render: (_, record) => (
            <Text>
              {record.city ||
                "-"}{" "}
              /{" "}
              {record.area ||
                "-"}
            </Text>
          ),
        },

        {
          title: "Franchise",

          render: (_, record) =>
            record.branch?.name ||
            (
              <Text type="secondary">
                —
              </Text>
            ),
        },

        {
          title: "Status",

          width: 110,
          align: "center",

          render: (_, record) =>
            statusCol(record),
        },
      ];

      if (
        canView ||
        canEdit ||
        canDelete
      ) {
        columns.push({
          title: "",
          fixed: "right",
          width: 120,

          render: (_, record) =>
            actionCol(record),
        });
      }

      return columns;
    },
    [
      canView,
      canEdit,
      canDelete,
      statusCol,
      actionCol,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | Toolbar
  |--------------------------------------------------------------------------
  */

  function TabToolbar({
    selectedKeys,
    onBulkDelete,
    data,
    csvFilename,
  }) {
    return (
      <Row
        justify="space-between"
        align="middle"
        style={{
          marginBottom: 12,
        }}
      >
        <Col>
          {canDelete &&
            selectedKeys.length >
              0 && (
              <Popconfirm
                title={`Delete ${selectedKeys.length} allocation(s)?`}
                onConfirm={() =>
                  onBulkDelete(
                    selectedKeys
                  )
                }
              >
                <Button
                  danger
                  size="small"
                  icon={
                    <DeleteOutlined />
                  }
                >
                  Delete selected (
                  {
                    selectedKeys.length
                  }
                  )
                </Button>
              </Popconfirm>
            )}
        </Col>

        <Col>
          <Button
            size="small"
            icon={
              <DownloadOutlined />
            }
            onClick={() =>
              exportToCsv(
                data,
                csvFilename
              )
            }
          >
            Export CSV
          </Button>
        </Col>
      </Row>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Header toolbar
  |--------------------------------------------------------------------------
  */

  const headerActions = (
    <Space wrap>
      {canCreate && (
        <>
          <Link
            href="/admin/coverage-locations/create?type=main_branch_zone"
          >
            <Button
              type="primary"
              icon={
                <PlusOutlined />
              }
            >
              Add Main
            </Button>
          </Link>

          <Link
            href="/admin/coverage-locations/create?type=sub_branch_zone"
          >
            <Button
              icon={
                <PlusOutlined />
              }
            >
              Add Sub-Branch
            </Button>
          </Link>
        </>
      )}
    </Space>
  );

  /*
  |--------------------------------------------------------------------------
  | Tab toolbar
  |--------------------------------------------------------------------------
  */

  const tabBarExtra = (
    <Space>
      <Segmented
        size="small"
        value={viewMode}
        onChange={setViewMode}
        options={[
          {
            label: (
              <Space size={4}>
                <TableOutlined />
                Table
              </Space>
            ),
            value: "table",
          },

          {
            label: (
              <Space size={4}>
                <GlobalOutlined />
                Map
              </Space>
            ),
            value: "map",
          },
        ]}
      />

      <Button
        size="small"
        icon={
          <ReloadOutlined />
        }
        onClick={loadRows}
      >
        Refresh
      </Button>
    </Space>
  );

  /*
  |--------------------------------------------------------------------------
  | Access loading
  |--------------------------------------------------------------------------
  */

  if (accessLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading access...
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | No view permission
  |--------------------------------------------------------------------------
  */

  if (!canView) {
    return (
      <div
        style={{
          padding: 40,
        }}
      >
        <Card>
          <Empty
            description="You do not have permission to view branch coverage allocations."
          />
        </Card>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div
      style={{
        background: "#ffffff",
        minHeight: "100vh",
        padding: 20,
      }}
    >
      <Space
        direction="vertical"
        size={16}
        style={{
          width: "100%",
        }}
      >
        {/* Header */}

        <Row
          justify="space-between"
          align="middle"
          gutter={[16, 12]}
        >
          <Col>
            <Space
              direction="vertical"
              size={2}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                }}
              >
                Branch Allocation
              </Text>

              <Text type="secondary">
                Manage main branch and
                sub-branch service
                coverage allocations.
              </Text>
            </Space>
          </Col>

          <Col>
            {headerActions}
          </Col>
        </Row>

        {/* Stats */}

        <Row gutter={[16, 16]}>
          <Col
            xs={24}
            sm={8}
          >
            <Card size="small">
              <Statistic
                title="Total Allocations"
                value={
                  rows.length
                }
                prefix={
                  <HeatMapOutlined
                    style={{
                      color:
                        "#6366f1",
                    }}
                  />
                }
                valueStyle={{
                  color:
                    "#6366f1",
                }}
              />
            </Card>
          </Col>

          <Col
            xs={24}
            sm={8}
          >
            <Card size="small">
              <Statistic
                title="Main Branch Zones"
                value={
                  mainZones.length
                }
                prefix={
                  <ApartmentOutlined
                    style={{
                      color:
                        "#3b82f6",
                    }}
                  />
                }
                valueStyle={{
                  color:
                    "#3b82f6",
                }}
              />
            </Card>
          </Col>

          <Col
            xs={24}
            sm={8}
          >
            <Card size="small">
              <Statistic
                title="Sub-Branch Zones"
                value={
                  subZones.length
                }
                prefix={
                  <ApartmentOutlined
                    style={{
                      color:
                        "#22c55e",
                    }}
                  />
                }
                valueStyle={{
                  color:
                    "#22c55e",
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* Filters */}

        <Card size="small">
          <Form
            form={filterForm}
            layout="inline"
            style={{
              width: "100%",
            }}
          >
            <Row
              gutter={[
                12,
                8,
              ]}
              style={{
                width: "100%",
              }}
              align="middle"
            >
              <Col
                xs={24}
                sm={12}
                md={7}
              >
                <Form.Item
                  name="q"
                  style={{
                    margin: 0,
                    width: "100%",
                  }}
                >
                  <Input
                    allowClear
                    placeholder="Search name, code, city, area..."
                    prefix={
                      <SearchOutlined />
                    }
                    onPressEnter={
                      loadRows
                    }
                  />
                </Form.Item>
              </Col>

              <Col
                xs={24}
                sm={12}
                md={6}
              >
                <Form.Item
                  name="parent_id"
                  style={{
                    margin: 0,
                    width: "100%",
                  }}
                >
                  <Select
                    allowClear
                    showSearch
                    placeholder="Filter by parent"
                    optionFilterProp="label"
                    style={{
                      width:
                        "100%",
                    }}
                    options={mainZones.map(
                      (
                        item
                      ) => ({
                        value:
                          item.id,
                        label: `${item.name} (${item.code})`,
                      })
                    )}
                  />
                </Form.Item>
              </Col>

              <Col
                xs={24}
                sm={8}
                md={4}
              >
                <Form.Item
                  name="status"
                  style={{
                    margin: 0,
                    width: "100%",
                  }}
                >
                  <Select
                    allowClear
                    placeholder="Status"
                    style={{
                      width:
                        "100%",
                    }}
                    options={[
                      {
                        value:
                          "active",
                        label:
                          "Active",
                      },
                      {
                        value:
                          "inactive",
                        label:
                          "Inactive",
                      },
                    ]}
                  />
                </Form.Item>
              </Col>

              <Col
                xs={24}
                sm={16}
                md={7}
              >
                <Space>
                  <Button
                    type="primary"
                    icon={
                      <SearchOutlined />
                    }
                    onClick={
                      loadRows
                    }
                  >
                    Search
                  </Button>

                  <Button
                    onClick={
                      resetFilters
                    }
                  >
                    Reset
                  </Button>
                </Space>
              </Col>
            </Row>
          </Form>
        </Card>

        {/* Main content */}

        <Card
          size="small"
          styles={{
            body: {
              padding:
                "12px 16px",
            },
          }}
        >
          {viewMode ===
          "table" ? (
            <Tabs
              defaultActiveKey="main"
              tabBarExtraContent={
                tabBarExtra
              }
              items={[
                {
                  key: "main",

                  label: `Main Zone Allocation (${mainZones.length})`,

                  children: (
                    <>
                      <TabToolbar
                        selectedKeys={
                          selectedMainKeys
                        }
                        onBulkDelete={
                          removeBulk
                        }
                        data={
                          mainZones
                        }
                        csvFilename="main-allocations.csv"
                      />

                      <Table
                        rowKey="id"
                        size="small"
                        loading={
                          loading
                        }
                        columns={
                          mainColumns
                        }
                        dataSource={
                          mainZones
                        }
                        rowSelection={
                          canDelete
                            ? {
                                selectedRowKeys:
                                  selectedMainKeys,

                                onChange:
                                  setSelectedMainKeys,
                              }
                            : undefined
                        }
                        pagination={{
                          pageSize: 10,
                          showSizeChanger:
                            false,
                        }}
                        scroll={{
                          x: 900,
                        }}
                        locale={{
                          emptyText:
                            (
                              <Empty description="No main branch allocations">
                                {canCreate && (
                                  <Link href="/admin/coverage-locations/create?type=main_branch_zone">
                                    <Button
                                      type="primary"
                                      size="small"
                                      icon={
                                        <PlusOutlined />
                                      }
                                    >
                                      Add Main
                                      Allocation
                                    </Button>
                                  </Link>
                                )}
                              </Empty>
                            ),
                        }}
                      />
                    </>
                  ),
                },

                {
                  key: "sub",

                  label: `Sub-Branch Allocation (${subZones.length})`,

                  children: (
                    <>
                      <TabToolbar
                        selectedKeys={
                          selectedSubKeys
                        }
                        onBulkDelete={
                          removeBulk
                        }
                        data={
                          subZones
                        }
                        csvFilename="sub-allocations.csv"
                      />

                      <Table
                        rowKey="id"
                        size="small"
                        loading={
                          loading
                        }
                        columns={
                          subColumns
                        }
                        dataSource={
                          subZones
                        }
                        rowSelection={
                          canDelete
                            ? {
                                selectedRowKeys:
                                  selectedSubKeys,

                                onChange:
                                  setSelectedSubKeys,
                              }
                            : undefined
                        }
                        pagination={{
                          pageSize: 10,
                          showSizeChanger:
                            false,
                        }}
                        scroll={{
                          x: 900,
                        }}
                        locale={{
                          emptyText:
                            (
                              <Empty description="No sub-branch allocations">
                                {canCreate && (
                                  <Link href="/admin/coverage-locations/create?type=sub_branch_zone">
                                    <Button
                                      size="small"
                                      icon={
                                        <PlusOutlined />
                                      }
                                    >
                                      Add
                                      Sub-Branch
                                      Allocation
                                    </Button>
                                  </Link>
                                )}
                              </Empty>
                            ),
                        }}
                      />
                    </>
                  ),
                },
              ]}
            />
          ) : (
            <>
              <Row
                justify="end"
                style={{
                  marginBottom: 12,
                }}
              >
                {tabBarExtra}
              </Row>

              <CoverageRadiusMapFull
                value={{}}
                existingLocations={
                  rows
                }
                existingBranches={
                  []
                }
                showExisting
                showBranches={
                  false
                }
                showCoverageRadius
                height={650}
                clickable={
                  false
                }
                showSearch={
                  false
                }
                viewMode="nepal"
                onChange={() => {}}
              />
            </>
          )}
        </Card>
      </Space>
    </div>
  );
}