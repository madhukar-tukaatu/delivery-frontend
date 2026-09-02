"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  InputNumber,
  Modal,
  Row,
  Space,
  Spin,
  Switch,
  Table,
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
} from "@ant-design/icons";

import {
  createBranchRouteRate,
  deleteBranchRouteRate,
  getBranchRouteRateMatrix,
  updateBranchRouteRate,
  updateBranchRouteRateStatus,
} from "@/services/adminRateManagementService";

import {
  apiErrorMessage,
  formatDate,
  formatMoney,
  normalizeBranchRate,
  toBoolean,
} from "@/lib/rate-management-page-utils";

const { Title, Text } = Typography;

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function emptyForm() {
  return {
    base_rate: 0,
    is_active: true,
    express_enabled: true,

    // IMPORTANT:
    // Same Day is OFF by default.
    same_day_enabled: false,
  };
}

function getCoverageLocationId(rate, type) {
  if (type === "pickup") {
    return Number(
      rate?.pickup_coverage_location_id ??
        rate?.pickup_branch_id ??
        rate?.pickup_branch?.id ??
        0,
    );
  }

  return Number(
    rate?.delivery_coverage_location_id ??
      rate?.delivery_branch_id ??
      rate?.delivery_branch?.id ??
      0,
  );
}

function getBranchName(rate, type) {
  if (type === "pickup") {
    return (
      rate?.pickup_branch?.name ??
      rate?.pickup_branch_name ??
      `Zone ${getCoverageLocationId(rate, "pickup")}`
    );
  }

  return (
    rate?.delivery_branch?.name ??
    rate?.delivery_branch_name ??
    `Zone ${getCoverageLocationId(rate, "delivery")}`
  );
}

function getBranchCode(rate, type) {
  if (type === "pickup") {
    return (
      rate?.pickup_branch?.code ??
      rate?.pickup_branch_code ??
      String(getCoverageLocationId(rate, "pickup"))
    );
  }

  return (
    rate?.delivery_branch?.code ??
    rate?.delivery_branch_code ??
    String(getCoverageLocationId(rate, "delivery"))
  );
}

/*
|--------------------------------------------------------------------------
| Inline Form
|--------------------------------------------------------------------------
*/

function InlineFormFields({
  inlineForm,
  setInlineForm,
  saving,
}) {
  return (
    <Space
      direction="vertical"
      size={12}
      style={{ width: "100%" }}
    >
      <div>
        <Text type="secondary">
          Base Rate
        </Text>

        <InputNumber
          min={0}
          precision={2}
          value={inlineForm.base_rate}
          disabled={saving}
          style={{ width: "100%", marginTop: 4 }}
          addonBefore="NPR"
          onChange={(value) =>
            setInlineForm((current) => ({
              ...current,
              base_rate: Number(value ?? 0),
            }))
          }
        />
      </div>

      <Space
        direction="vertical"
        size={8}
        style={{ width: "100%" }}
      >
        <Space
          align="center"
          style={{
            width: "100%",
            justifyContent: "space-between",
          }}
        >
          <div>
            <Text strong>
              Active
            </Text>

            <br />

            <Text type="secondary">
              Enable this route rate.
            </Text>
          </div>

          <Switch
            checked={toBoolean(
              inlineForm.is_active,
            )}
            disabled={saving}
            onChange={(checked) =>
              setInlineForm((current) => ({
                ...current,
                is_active: checked,
              }))
            }
          />
        </Space>

        <Space
          align="center"
          style={{
            width: "100%",
            justifyContent: "space-between",
          }}
        >
          <div>
            <Text strong>
              Express
            </Text>

            <br />

            <Text type="secondary">
              Allow Express service.
            </Text>
          </div>

          <Switch
            checked={toBoolean(
              inlineForm.express_enabled,
            )}
            disabled={saving}
            onChange={(checked) =>
              setInlineForm((current) => ({
                ...current,
                express_enabled: checked,
              }))
            }
          />
        </Space>

        <Space
          align="center"
          style={{
            width: "100%",
            justifyContent: "space-between",
          }}
        >
          <div>
            <Text strong>
              Same Day
            </Text>

            <br />

            <Text type="secondary">
              Allow Same Day service.
            </Text>
          </div>

          <Switch
            checked={toBoolean(
              inlineForm.same_day_enabled,
            )}
            disabled={saving}
            onChange={(checked) =>
              setInlineForm((current) => ({
                ...current,
                same_day_enabled: checked,
              }))
            }
          />
        </Space>
      </Space>
    </Space>
  );
}

/*
|--------------------------------------------------------------------------
| Main Page
|--------------------------------------------------------------------------
*/

export default function BranchPricingPage() {
  const [rates, setRates] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [inlineAdd, setInlineAdd] =
    useState(null);

  const [inlineEdit, setInlineEdit] =
    useState(null);

  const [inlineForm, setInlineForm] =
    useState(emptyForm());

  const [selectedRoute, setSelectedRoute] =
    useState(null);

  const [detailOpen, setDetailOpen] =
    useState(false);

  const [error, setError] =
    useState(null);

  /*
  |--------------------------------------------------------------------------
  | Load Rates
  |--------------------------------------------------------------------------
  */

  const loadRates = useCallback(
    async () => {
      try {
        setLoading(true);
        setError(null);

        const response =
          await getBranchRouteRateMatrix();

        const payload =
          response?.data ??
          response;

        let collection = [];

        if (Array.isArray(payload)) {
          collection = payload;
        } else if (
          Array.isArray(payload?.data)
        ) {
          collection = payload.data;
        } else if (
          Array.isArray(payload?.rates)
        ) {
          collection = payload.rates;
        } else if (
          Array.isArray(payload?.data?.rates)
        ) {
          collection = payload.data.rates;
        } else if (
          Array.isArray(response?.rates)
        ) {
          collection = response.rates;
        }

        const normalized =
          collection.map(
            normalizeBranchRate,
          );

        setRates(normalized);
      } catch (err) {
        console.error(
          "Failed to load branch route rates:",
          err,
        );

        const errorMessage =
          apiErrorMessage(
            err,
            "Failed to load branch route rates.",
          );

        setError(errorMessage);
        message.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  /*
  |--------------------------------------------------------------------------
  | Reset Form
  |--------------------------------------------------------------------------
  */

  const resetInlineState =
    useCallback(() => {
      setInlineAdd(null);
      setInlineEdit(null);
      setInlineForm(emptyForm());
    }, []);

  /*
  |--------------------------------------------------------------------------
  | Patch Rate Map
  |--------------------------------------------------------------------------
  */

  const patchRateMap = useCallback(
    (rate) => {
      if (!rate?.id) {
        return;
      }

      const normalized =
        normalizeBranchRate(rate);

      setRates((current) =>
        current.map((item) =>
          Number(item.id) ===
          Number(rate.id)
            ? normalized
            : item,
        ),
      );

      setSelectedRoute((current) =>
        current &&
        Number(current.id) ===
          Number(rate.id)
          ? normalized
          : current,
      );
    },
    [],
  );

  /*
  |--------------------------------------------------------------------------
  | Start Edit
  |--------------------------------------------------------------------------
  */

  const startEdit = useCallback(
    (rate) => {
      setInlineAdd(null);
      setInlineEdit(rate.id);

      setInlineForm({
        base_rate: Number(
          rate.base_rate ?? 0,
        ),

        is_active: toBoolean(
          rate.is_active,
        ),

        express_enabled: toBoolean(
          rate.express_enabled,
        ),

        same_day_enabled: toBoolean(
          rate.same_day_enabled,
        ),
      });
    },
    [],
  );

  /*
  |--------------------------------------------------------------------------
  | Start Add
  |--------------------------------------------------------------------------
  */

  const startAdd = useCallback(
    (rate) => {
      setInlineEdit(null);

      setInlineAdd({
        pickup_coverage_location_id:
          getCoverageLocationId(
            rate,
            "pickup",
          ),

        delivery_coverage_location_id:
          getCoverageLocationId(
            rate,
            "delivery",
          ),
      });

      setInlineForm({
        ...emptyForm(),
        base_rate: Number(
          rate?.base_rate ?? 0,
        ),
      });
    },
    [],
  );

  /*
  |--------------------------------------------------------------------------
  | Cancel Inline Form
  |--------------------------------------------------------------------------
  */

  const cancelInline = useCallback(() => {
    resetInlineState();
  }, [resetInlineState]);

  /*
  |--------------------------------------------------------------------------
  | Save Edit
  |--------------------------------------------------------------------------
  */

  const saveEdit = useCallback(
    async (rate) => {
      try {
        setSaving(true);

        const payload = {
          pickup_coverage_location_id:
            getCoverageLocationId(
              rate,
              "pickup",
            ),

          delivery_coverage_location_id:
            getCoverageLocationId(
              rate,
              "delivery",
            ),

          base_rate: Number(
            inlineForm.base_rate ?? 0,
          ),

          is_active: toBoolean(
            inlineForm.is_active,
          ),

          express_enabled: toBoolean(
            inlineForm.express_enabled,
          ),

          same_day_enabled: toBoolean(
            inlineForm.same_day_enabled,
          ),
        };

        console.log(
          "Updating branch route rate:",
          {
            id: rate.id,
            payload,
          },
        );

        const updated =
          await updateBranchRouteRate(
            rate.id,
            payload,
          );

        /*
         * Merge the submitted values with the
         * server response.
         *
         * This prevents the UI from reverting
         * if the backend returns a partial object.
         */
        const updatedRate = {
          ...rate,
          ...(updated ?? {}),

          pickup_coverage_location_id:
            payload.pickup_coverage_location_id,

          delivery_coverage_location_id:
            payload.delivery_coverage_location_id,

          base_rate:
            payload.base_rate,

          is_active:
            payload.is_active,

          express_enabled:
            payload.express_enabled,

          same_day_enabled:
            payload.same_day_enabled,
        };

        patchRateMap(
          updatedRate,
        );

        resetInlineState();

        message.success(
          "Branch route rate updated successfully.",
        );
      } catch (err) {
        console.error(
          "Failed to update branch route rate:",
          err,
        );

        message.error(
          apiErrorMessage(
            err,
            "Failed to update branch route rate.",
          ),
        );
      } finally {
        setSaving(false);
      }
    },
    [
      inlineForm,
      patchRateMap,
      resetInlineState,
    ],
  );

  /*
  |--------------------------------------------------------------------------
  | Create Route
  |--------------------------------------------------------------------------
  */

  const saveAdd = useCallback(
    async () => {
      if (!inlineAdd) {
        return;
      }

      try {
        setSaving(true);

        const payload = {
          pickup_coverage_location_id:
            Number(
              inlineAdd.pickup_coverage_location_id,
            ),

          delivery_coverage_location_id:
            Number(
              inlineAdd.delivery_coverage_location_id,
            ),

          base_rate: Number(
            inlineForm.base_rate ?? 0,
          ),

          is_active: toBoolean(
            inlineForm.is_active,
          ),

          express_enabled: toBoolean(
            inlineForm.express_enabled,
          ),

          same_day_enabled: toBoolean(
            inlineForm.same_day_enabled,
          ),
        };

        console.log(
          "Creating branch route rate:",
          payload,
        );

        const created =
          await createBranchRouteRate(
            payload,
          );

        if (created) {
          const newRate =
            normalizeBranchRate({
              ...inlineAdd,
              ...inlineForm,
              ...created,

              pickup_coverage_location_id:
                payload.pickup_coverage_location_id,

              delivery_coverage_location_id:
                payload.delivery_coverage_location_id,

              base_rate:
                payload.base_rate,

              is_active:
                payload.is_active,

              express_enabled:
                payload.express_enabled,

              same_day_enabled:
                payload.same_day_enabled,
            });

          setRates((current) => [
            newRate,
            ...current,
          ]);
        } else {
          await loadRates();
        }

        resetInlineState();

        message.success(
          "Branch route rate created successfully.",
        );
      } catch (err) {
        console.error(
          "Failed to create branch route rate:",
          err,
        );

        message.error(
          apiErrorMessage(
            err,
            "Failed to create branch route rate.",
          ),
        );
      } finally {
        setSaving(false);
      }
    },
    [
      inlineAdd,
      inlineForm,
      loadRates,
      resetInlineState,
    ],
  );

  /*
  |--------------------------------------------------------------------------
  | Create Reverse Route
  |--------------------------------------------------------------------------
  */

  const createReverse = useCallback(
    async (rate) => {
      const pickupCoverageLocationId =
        getCoverageLocationId(
          rate,
          "delivery",
        );

      const deliveryCoverageLocationId =
        getCoverageLocationId(
          rate,
          "pickup",
        );

      if (
        !pickupCoverageLocationId ||
        !deliveryCoverageLocationId
      ) {
        message.error(
          "Unable to determine reverse route.",
        );

        return;
      }

      try {
        setSaving(true);

        const payload = {
          pickup_coverage_location_id:
            pickupCoverageLocationId,

          delivery_coverage_location_id:
            deliveryCoverageLocationId,

          base_rate: Number(
            rate.base_rate ?? 0,
          ),

          is_active: toBoolean(
            rate.is_active,
          ),

          express_enabled: toBoolean(
            rate.express_enabled,
          ),

          same_day_enabled: toBoolean(
            rate.same_day_enabled,
          ),
        };

        console.log(
          "Creating reverse branch route rate:",
          payload,
        );

        const created =
          await createBranchRouteRate(
            payload,
          );

        if (created) {
          setRates((current) => [
            normalizeBranchRate(
              created,
            ),
            ...current,
          ]);
        } else {
          await loadRates();
        }

        message.success(
          "Reverse branch route created successfully.",
        );
      } catch (err) {
        console.error(
          "Failed to create reverse branch route:",
          err,
        );

        message.error(
          apiErrorMessage(
            err,
            "Failed to create reverse branch route.",
          ),
        );
      } finally {
        setSaving(false);
      }
    },
    [loadRates],
  );

  /*
  |--------------------------------------------------------------------------
  | Toggle Active Status
  |--------------------------------------------------------------------------
  */

  const toggleStatus = useCallback(
    async (rate, checked) => {
      try {
        setSaving(true);

        await updateBranchRouteRateStatus(
          rate.id,
          checked,
        );

        patchRateMap({
          ...rate,
          is_active: checked,
        });

        message.success(
          checked
            ? "Route rate activated."
            : "Route rate deactivated.",
        );
      } catch (err) {
        console.error(
          "Failed to update route status:",
          err,
        );

        message.error(
          apiErrorMessage(
            err,
            "Failed to update route status.",
          ),
        );
      } finally {
        setSaving(false);
      }
    },
    [patchRateMap],
  );

  /*
  |--------------------------------------------------------------------------
  | Delete Route
  |--------------------------------------------------------------------------
  */

  const handleDelete = useCallback(
    (rate) => {
      Modal.confirm({
        title:
          "Delete branch route rate?",
        content: (
          <div>
            <p>
              This will delete the route
              pricing configuration.
            </p>

            <Text strong>
              {getBranchName(
                rate,
                "pickup",
              )}{" "}
              →{" "}
              {getBranchName(
                rate,
                "delivery",
              )}
            </Text>
          </div>
        ),
        okText: "Delete",
        okType: "danger",
        cancelText: "Cancel",

        onOk: async () => {
          try {
            setSaving(true);

            await deleteBranchRouteRate(
              rate.id,
            );

            setRates((current) =>
              current.filter(
                (item) =>
                  Number(item.id) !==
                  Number(rate.id),
              ),
            );

            if (
              selectedRoute &&
              Number(selectedRoute.id) ===
                Number(rate.id)
            ) {
              setSelectedRoute(null);
              setDetailOpen(false);
            }

            message.success(
              "Branch route rate deleted successfully.",
            );
          } catch (err) {
            console.error(
              "Failed to delete route rate:",
              err,
            );

            message.error(
              apiErrorMessage(
                err,
                "Failed to delete route rate.",
              ),
            );
          } finally {
            setSaving(false);
          }
        },
      });
    },
    [selectedRoute],
  );

  /*
  |--------------------------------------------------------------------------
  | Open Details
  |--------------------------------------------------------------------------
  */

  const openDetails = useCallback(
    (rate) => {
      setSelectedRoute(
        normalizeBranchRate(rate),
      );

      setDetailOpen(true);
    },
    [],
  );

  /*
  |--------------------------------------------------------------------------
  | Sorted Rates
  |--------------------------------------------------------------------------
  */

  const sortedRates = useMemo(() => {
    return [...rates].sort((a, b) => {
      const pickupA =
        getBranchName(a, "pickup");

      const pickupB =
        getBranchName(b, "pickup");

      const deliveryA =
        getBranchName(a, "delivery");

      const deliveryB =
        getBranchName(b, "delivery");

      return `${pickupA}-${deliveryA}`.localeCompare(
        `${pickupB}-${deliveryB}`,
      );
    });
  }, [rates]);

  /*
  |--------------------------------------------------------------------------
  | Table Columns
  |--------------------------------------------------------------------------
  */

  const columns = useMemo(
    () => [
      {
        title: "#",
        key: "index",
        width: 60,

        render: (_, __, index) =>
          index + 1,
      },

      {
        title: "Pickup",
        key: "pickup",
        width: 220,

        render: (_, rate) => (
          <Space>
            <EnvironmentOutlined />

            <div>
              <Text strong>
                {getBranchName(
                  rate,
                  "pickup",
                )}
              </Text>

              <br />

              <Text
                type="secondary"
                style={{
                  fontSize: 12,
                }}
              >
                {getBranchCode(
                  rate,
                  "pickup",
                )}{" "}
                · ID{" "}
                {getCoverageLocationId(
                  rate,
                  "pickup",
                )}
              </Text>
            </div>
          </Space>
        ),
      },

      {
        title: "Delivery",
        key: "delivery",
        width: 220,

        render: (_, rate) => (
          <Space>
            <EnvironmentOutlined />

            <div>
              <Text strong>
                {getBranchName(
                  rate,
                  "delivery",
                )}
              </Text>

              <br />

              <Text
                type="secondary"
                style={{
                  fontSize: 12,
                }}
              >
                {getBranchCode(
                  rate,
                  "delivery",
                )}{" "}
                · ID{" "}
                {getCoverageLocationId(
                  rate,
                  "delivery",
                )}
              </Text>
            </div>
          </Space>
        ),
      },

      {
        title: "Base Rate",
        key: "base_rate",
        width: 150,

        render: (_, rate) => {
          if (
            Number(inlineEdit) ===
            Number(rate.id)
          ) {
            return (
              <InputNumber
                min={0}
                precision={2}
                value={
                  inlineForm.base_rate
                }
                disabled={saving}
                style={{
                  width: 130,
                }}
                addonBefore="NPR"
                onChange={(value) =>
                  setInlineForm(
                    (current) => ({
                      ...current,
                      base_rate:
                        Number(
                          value ?? 0,
                        ),
                    }),
                  )
                }
              />
            );
          }

          return (
            <Text strong>
              {formatMoney(
                rate.base_rate,
              )}
            </Text>
          );
        },
      },

      {
        title: "Services",
        key: "services",
        width: 220,

        render: (_, rate) => {
          const isEditing =
            Number(inlineEdit) ===
            Number(rate.id);

          if (isEditing) {
            return (
              <Space
                direction="vertical"
                size={6}
              >
                <Space>
                  <Text
                    type="secondary"
                    style={{
                      fontSize: 12,
                    }}
                  >
                    Express
                  </Text>

                  <Switch
                    size="small"
                    checked={toBoolean(
                      inlineForm.express_enabled,
                    )}
                    disabled={saving}
                    onChange={(checked) =>
                      setInlineForm(
                        (current) => ({
                          ...current,
                          express_enabled:
                            checked,
                        }),
                      )
                    }
                  />
                </Space>

                <Space>
                  <Text
                    type="secondary"
                    style={{
                      fontSize: 12,
                    }}
                  >
                    Same Day
                  </Text>

                  <Switch
                    size="small"
                    checked={toBoolean(
                      inlineForm.same_day_enabled,
                    )}
                    disabled={saving}
                    onChange={(checked) =>
                      setInlineForm(
                        (current) => ({
                          ...current,
                          same_day_enabled:
                            checked,
                        }),
                      )
                    }
                  />
                </Space>
              </Space>
            );
          }

          return (
            <Space wrap>
              <Tag
                color={
                  toBoolean(
                    rate.express_enabled,
                  )
                    ? "blue"
                    : "default"
                }
              >
                {toBoolean(
                  rate.express_enabled,
                )
                  ? "Express"
                  : "Express Off"}
              </Tag>

              <Tag
                color={
                  toBoolean(
                    rate.same_day_enabled,
                  )
                    ? "magenta"
                    : "default"
                }
              >
                {toBoolean(
                  rate.same_day_enabled,
                )
                  ? "Same Day"
                  : "Same Day Off"}
              </Tag>
            </Space>
          );
        },
      },

      {
        title: "Status",
        key: "status",
        width: 130,

        render: (_, rate) => {
          const isEditing =
            Number(inlineEdit) ===
            Number(rate.id);

          if (isEditing) {
            return (
              <Switch
                checked={toBoolean(
                  inlineForm.is_active,
                )}
                disabled={saving}
                checkedChildren="Active"
                unCheckedChildren="Off"
                onChange={(checked) =>
                  setInlineForm(
                    (current) => ({
                      ...current,
                      is_active:
                        checked,
                    }),
                  )
                }
              />
            );
          }

          return (
            <Tag
              color={
                toBoolean(rate.is_active)
                  ? "success"
                  : "default"
              }
              icon={
                toBoolean(rate.is_active)
                  ? <CheckCircleOutlined />
                  : null
              }
            >
              {toBoolean(
                rate.is_active,
              )
                ? "Active"
                : "Inactive"}
            </Tag>
          );
        },
      },

      {
        title: "Updated",
        key: "updated_at",
        width: 180,

        render: (_, rate) => (
          <Text type="secondary">
            {formatDate(
              rate.updated_at ??
                rate.created_at,
            )}
          </Text>
        ),
      },

      {
        title: "Actions",
        key: "actions",
        fixed: "right",
        width: 230,

        render: (_, rate) => {
          const isEditing =
            Number(inlineEdit) ===
            Number(rate.id);

          if (isEditing) {
            return (
              <Space>
                <Button
                  type="primary"
                  size="small"
                  loading={saving}
                  onClick={() =>
                    saveEdit(rate)
                  }
                >
                  Save
                </Button>

                <Button
                  size="small"
                  disabled={saving}
                  onClick={
                    cancelInline
                  }
                >
                  Cancel
                </Button>
              </Space>
            );
          }

          return (
            <Space size={4}>
              <Tooltip title="View details">
                <Button
                  type="text"
                  icon={
                    <EnvironmentOutlined />
                  }
                  onClick={() =>
                    openDetails(rate)
                  }
                />
              </Tooltip>

              <Tooltip title="Edit">
                <Button
                  type="text"
                  icon={
                    <EditOutlined />
                  }
                  onClick={() =>
                    startEdit(rate)
                  }
                />
              </Tooltip>

              <Tooltip title="Create reverse route">
                <Button
                  type="text"
                  icon={
                    <SwapOutlined />
                  }
                  loading={saving}
                  onClick={() =>
                    createReverse(rate)
                  }
                />
              </Tooltip>

              <Tooltip title="Delete">
                <Button
                  danger
                  type="text"
                  icon={
                    <DeleteOutlined />
                  }
                  onClick={() =>
                    handleDelete(rate)
                  }
                />
              </Tooltip>
            </Space>
          );
        },
      },
    ],
    [
      inlineEdit,
      inlineForm,
      saving,
      saveEdit,
      cancelInline,
      openDetails,
      startEdit,
      createReverse,
      handleDelete,
    ],
  );

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div
        style={{
          minHeight: 400,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" />
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
        padding: 24,
      }}
    >
      <Space
        direction="vertical"
        size={20}
        style={{
          width: "100%",
        }}
      >
        {/* Header */}
        <Card>
          <Row
            gutter={[16, 16]}
            align="middle"
            justify="space-between"
          >
            <Col>
              <Space
                direction="vertical"
                size={2}
              >
                <Title
                  level={3}
                  style={{
                    margin: 0,
                  }}
                >
                  Branch Pricing
                </Title>

                <Text type="secondary">
                  Manage pricing between
                  pickup and delivery
                  coverage locations.
                </Text>
              </Space>
            </Col>

            <Col>
              <Space>
                <Button
                  icon={
                    <ReloadOutlined />
                  }
                  onClick={loadRates}
                  loading={loading}
                >
                  Refresh
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Error */}
        {error && (
          <Alert
            type="error"
            showIcon
            message="Unable to load branch pricing"
            description={error}
            action={
              <Button
                size="small"
                onClick={loadRates}
              >
                Retry
              </Button>
            }
          />
        )}

        {/* Summary */}
        <Row gutter={[16, 16]}>
          <Col
            xs={24}
            sm={12}
            lg={6}
          >
            <Card>
              <Text type="secondary">
                Total Routes
              </Text>

              <Title
                level={3}
                style={{
                  margin: "4px 0 0",
                }}
              >
                {rates.length}
              </Title>
            </Card>
          </Col>

          <Col
            xs={24}
            sm={12}
            lg={6}
          >
            <Card>
              <Text type="secondary">
                Active Routes
              </Text>

              <Title
                level={3}
                style={{
                  margin: "4px 0 0",
                }}
              >
                {
                  rates.filter((rate) =>
                    toBoolean(
                      rate.is_active,
                    ),
                  ).length
                }
              </Title>
            </Card>
          </Col>

          <Col
            xs={24}
            sm={12}
            lg={6}
          >
            <Card>
              <Text type="secondary">
                Express Routes
              </Text>

              <Title
                level={3}
                style={{
                  margin: "4px 0 0",
                }}
              >
                {
                  rates.filter((rate) =>
                    toBoolean(
                      rate.express_enabled,
                    ),
                  ).length
                }
              </Title>
            </Card>
          </Col>

          <Col
            xs={24}
            sm={12}
            lg={6}
          >
            <Card>
              <Text type="secondary">
                Same Day Routes
              </Text>

              <Title
                level={3}
                style={{
                  margin: "4px 0 0",
                }}
              >
                {
                  rates.filter((rate) =>
                    toBoolean(
                      rate.same_day_enabled,
                    ),
                  ).length
                }
              </Title>
            </Card>
          </Col>
        </Row>

        {/* Rates */}
        <Card
          title={
            <Space>
              <EnvironmentOutlined />

              <span>
                Branch Route Rates
              </span>

              <Tag>
                {rates.length}
              </Tag>
            </Space>
          }
          extra={
            <Button
              type="primary"
              icon={
                <PlusOutlined />
              }
              onClick={() => {
                setInlineEdit(null);
                setInlineAdd({
                  pickup_coverage_location_id:
                    null,

                  delivery_coverage_location_id:
                    null,
                });

                setInlineForm(
                  emptyForm(),
                );
              }}
            >
              Add Route Rate
            </Button>
          }
        >
          {/* Add Form */}
          {inlineAdd && (
            <Card
              size="small"
              style={{
                marginBottom: 16,
              }}
              title="New Branch Route Rate"
            >
              <Row gutter={[16, 16]}>
                <Col
                  xs={24}
                  md={8}
                >
                  <Text strong>
                    Pickup Coverage Location
                  </Text>

                  <InputNumber
                    min={1}
                    value={
                      inlineAdd.pickup_coverage_location_id
                    }
                    disabled={saving}
                    style={{
                      width: "100%",
                      marginTop: 6,
                    }}
                    placeholder="Coverage location ID"
                    onChange={(value) =>
                      setInlineAdd(
                        (current) => ({
                          ...current,
                          pickup_coverage_location_id:
                            value,
                        }),
                      )
                    }
                  />
                </Col>

                <Col
                  xs={24}
                  md={8}
                >
                  <Text strong>
                    Delivery Coverage Location
                  </Text>

                  <InputNumber
                    min={1}
                    value={
                      inlineAdd.delivery_coverage_location_id
                    }
                    disabled={saving}
                    style={{
                      width: "100%",
                      marginTop: 6,
                    }}
                    placeholder="Coverage location ID"
                    onChange={(value) =>
                      setInlineAdd(
                        (current) => ({
                          ...current,
                          delivery_coverage_location_id:
                            value,
                        }),
                      )
                    }
                  />
                </Col>

                <Col
                  xs={24}
                  md={8}
                >
                  <InlineFormFields
                    inlineForm={
                      inlineForm
                    }
                    setInlineForm={
                      setInlineForm
                    }
                    saving={saving}
                  />
                </Col>
              </Row>

              <Divider />

              <Space>
                <Button
                  type="primary"
                  loading={saving}
                  disabled={
                    !inlineAdd
                      .pickup_coverage_location_id ||
                    !inlineAdd
                      .delivery_coverage_location_id
                  }
                  onClick={saveAdd}
                >
                  Create Route
                </Button>

                <Button
                  disabled={saving}
                  onClick={
                    cancelInline
                  }
                >
                  Cancel
                </Button>
              </Space>
            </Card>
          )}

          {rates.length === 0 ? (
            <Empty
              description="No branch route rates found."
            />
          ) : (
            <Table
              rowKey={(record) =>
                record.id
              }
              columns={columns}
              dataSource={
                sortedRates
              }
              scroll={{
                x: 1400,
              }}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (total) =>
                  `${total} route${
                    total === 1
                      ? ""
                      : "s"
                  }`,
              }}
            />
          )}
        </Card>
      </Space>

      {/* Details Modal */}
      <Modal
        open={detailOpen}
        onCancel={() => {
          setDetailOpen(false);
          setSelectedRoute(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setDetailOpen(false);
              setSelectedRoute(null);
            }}
          >
            Close
          </Button>,

          selectedRoute && (
            <Button
              key="edit"
              type="primary"
              icon={
                <EditOutlined />
              }
              onClick={() => {
                setDetailOpen(false);

                startEdit(
                  selectedRoute,
                );
              }}
            >
              Edit
            </Button>
          ),
        ]}
        title={
          selectedRoute
            ? "Branch Route Details"
            : "Route Details"
        }
        width={720}
      >
        {selectedRoute ? (
          <Space
            direction="vertical"
            size={20}
            style={{
              width: "100%",
            }}
          >
            <Card size="small">
              <Row
                gutter={[16, 16]}
                align="middle"
              >
                <Col span={10}>
                  <Space>
                    <EnvironmentOutlined />

                    <div>
                      <Text
                        type="secondary"
                      >
                        Pickup
                      </Text>

                      <br />

                      <Text strong>
                        {getBranchName(
                          selectedRoute,
                          "pickup",
                        )}
                      </Text>

                      <br />

                      <Text type="secondary">
                        {
                          getBranchCode(
                            selectedRoute,
                            "pickup",
                          )
                        }
                      </Text>
                    </div>
                  </Space>
                </Col>

                <Col
                  span={4}
                  style={{
                    textAlign:
                      "center",
                  }}
                >
                  <SwapOutlined
                    style={{
                      fontSize: 22,
                    }}
                  />
                </Col>

                <Col span={10}>
                  <Space>
                    <EnvironmentOutlined />

                    <div>
                      <Text
                        type="secondary"
                      >
                        Delivery
                      </Text>

                      <br />

                      <Text strong>
                        {getBranchName(
                          selectedRoute,
                          "delivery",
                        )}
                      </Text>

                      <br />

                      <Text type="secondary">
                        {
                          getBranchCode(
                            selectedRoute,
                            "delivery",
                          )
                        }
                      </Text>
                    </div>
                  </Space>
                </Col>
              </Row>
            </Card>

            <Descriptions
              bordered
              column={1}
              size="small"
            >
              <Descriptions.Item label="Route ID">
                {selectedRoute.id}
              </Descriptions.Item>

              <Descriptions.Item label="Pickup Coverage Location">
                {
                  selectedRoute.pickup_coverage_location_id
                }
              </Descriptions.Item>

              <Descriptions.Item label="Delivery Coverage Location">
                {
                  selectedRoute.delivery_coverage_location_id
                }
              </Descriptions.Item>

              <Descriptions.Item label="Base Rate">
                <Text strong>
                  {formatMoney(
                    selectedRoute.base_rate,
                  )}
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Active">
                <Tag
                  color={
                    toBoolean(
                      selectedRoute.is_active,
                    )
                      ? "success"
                      : "default"
                  }
                >
                  {toBoolean(
                    selectedRoute.is_active,
                  )
                    ? "Active"
                    : "Inactive"}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Express">
                <Tag
                  color={
                    toBoolean(
                      selectedRoute.express_enabled,
                    )
                      ? "blue"
                      : "default"
                  }
                >
                  {toBoolean(
                    selectedRoute.express_enabled,
                  )
                    ? "Enabled"
                    : "Disabled"}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Same Day">
                <Tag
                  color={
                    toBoolean(
                      selectedRoute.same_day_enabled,
                    )
                      ? "magenta"
                      : "default"
                  }
                >
                  {toBoolean(
                    selectedRoute.same_day_enabled,
                  )
                    ? "Enabled"
                    : "Disabled"}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Created">
                {formatDate(
                  selectedRoute.created_at,
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Last Updated">
                {formatDate(
                  selectedRoute.updated_at,
                )}
              </Descriptions.Item>
            </Descriptions>

            <Card
              size="small"
              title="Service Configuration"
            >
              <Space
                direction="vertical"
                size={12}
                style={{
                  width: "100%",
                }}
              >
                <Space
                  align="center"
                  style={{
                    width: "100%",
                    justifyContent:
                      "space-between",
                  }}
                >
                  <div>
                    <Text strong>
                      Express Service
                    </Text>

                    <br />

                    <Text type="secondary">
                      Whether this route
                      supports Express
                      delivery.
                    </Text>
                  </div>

                  <Tag
                    color={
                      toBoolean(
                        selectedRoute.express_enabled,
                      )
                        ? "blue"
                        : "default"
                    }
                  >
                    {toBoolean(
                      selectedRoute.express_enabled,
                    )
                      ? "Enabled"
                      : "Disabled"}
                  </Tag>
                </Space>

                <Divider
                  style={{
                    margin: 0,
                  }}
                />

                <Space
                  align="center"
                  style={{
                    width: "100%",
                    justifyContent:
                      "space-between",
                  }}
                >
                  <div>
                    <Text strong>
                      Same Day Service
                    </Text>

                    <br />

                    <Text type="secondary">
                      Whether this route
                      supports Same Day
                      delivery.
                    </Text>
                  </div>

                  <Tag
                    color={
                      toBoolean(
                        selectedRoute.same_day_enabled,
                      )
                        ? "magenta"
                        : "default"
                    }
                  >
                    {toBoolean(
                      selectedRoute.same_day_enabled,
                    )
                      ? "Enabled"
                      : "Disabled"}
                  </Tag>
                </Space>
              </Space>
            </Card>

            <Card size="small">
              <Space
                align="center"
                style={{
                  width: "100%",
                  justifyContent:
                    "space-between",
                }}
              >
                <div>
                  <Text strong>
                    Active Status
                  </Text>

                  <br />

                  <Text type="secondary">
                    Enable or disable this
                    route without deleting
                    its pricing.
                  </Text>
                </div>

                <Switch
                  checked={toBoolean(
                    selectedRoute.is_active,
                  )}
                  loading={saving}
                  onChange={(checked) =>
                    toggleStatus(
                      selectedRoute,
                      checked,
                    )
                  }
                />
              </Space>
            </Card>
          </Space>
        ) : (
          <Empty />
        )}
      </Modal>
    </div>
  );
}