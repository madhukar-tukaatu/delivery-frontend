"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Col,
  Divider,
  Input,
  InputNumber,
  Row,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";

import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
  SaveOutlined,
  UndoOutlined,
  SwapOutlined,
  AimOutlined,
} from "@ant-design/icons";

import {
  getCoverageLocation,
  getCoverageLocations,
  updateCoverageLocation,
} from "@/services/branchAllocationApi";

const CoverageRadiusMap = dynamic(
  () => import("@/components/maps/CoverageRadiusMap"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: "100%",
          minHeight: 420,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f7fa",
          borderRadius: 10,
        }}
      >
        <Space direction="vertical" align="center">
          <Spin size="large" />
          <Typography.Text type="secondary">
            Loading map...
          </Typography.Text>
        </Space>
      </div>
    ),
  },
);

const { Text, Title } = Typography;
const { TextArea } = Input;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function unwrap(response) {
  if (response?.data?.data) {
    return response.data.data;
  }

  if (response?.data) {
    return response.data;
  }

  return response;
}

function normalizeLocations(response) {
  const data = unwrap(response);

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.locations)) {
    return data.locations;
  }

  return [];
}

function numberOrNull(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function getLocationId(location) {
  const id = Number(location?.id);

  return Number.isFinite(id) ? id : null;
}

/**
 * Get parent main branch zone ID.
 *
 * Supports both:
 *
 * parent_id
 *
 * and:
 *
 * parent: {
 *   id: ...
 * }
 */
function getParentId(location) {
  const directParentId = Number(
    location?.parent_id,
  );

  if (
    Number.isFinite(directParentId) &&
    directParentId > 0
  ) {
    return directParentId;
  }

  const nestedParentId = Number(
    location?.parent?.id,
  );

  if (
    Number.isFinite(nestedParentId) &&
    nestedParentId > 0
  ) {
    return nestedParentId;
  }

  return null;
}

/**
 * Normalize different type names returned by API.
 */
function normalizeType(location) {
  const raw = String(
    location?.type ??
      location?.zone_type ??
      location?.coverage_type ??
      location?.allocation_type ??
      "",
  )
    .trim()
    .toLowerCase();

  if (
    [
      "main_branch_zone",
      "main_branch",
      "main",
      "main zone",
      "main_branch_allocation",
    ].includes(raw)
  ) {
    return "main_branch_zone";
  }

  if (
    [
      "sub_branch_zone",
      "sub_branch",
      "sub",
      "sub branch",
      "sub_branch_allocation",
    ].includes(raw)
  ) {
    return "sub_branch_zone";
  }

  return raw;
}

function isMainZone(location) {
  return (
    normalizeType(location) ===
    "main_branch_zone"
  );
}

function isSubBranchZone(location) {
  return (
    normalizeType(location) ===
    "sub_branch_zone"
  );
}

function getAddress(location) {
  return (
    location?.address ||
    location?.full_address ||
    [
      location?.area,
      location?.city,
      location?.district,
      location?.province,
      location?.postal_code,
      location?.country,
    ]
      .filter(Boolean)
      .join(", ")
  );
}

function normalizeMapLocation(
  location,
  parent = null,
) {
  const latitude = numberOrNull(
    location?.latitude,
  );

  const longitude = numberOrNull(
    location?.longitude,
  );

  if (
    latitude === null ||
    longitude === null
  ) {
    return null;
  }

  const type = normalizeType(location);

  return {
    ...location,

    id: getLocationId(location),

    type,

    latitude,
    longitude,

    coverage_radius_km:
      numberOrNull(
        location?.coverage_radius_km,
      ) ?? 0,

    parent_id:
      location?.parent_id ??
      parent?.id ??
      null,

    parent,

    is_main_zone:
      type === "main_branch_zone",

    is_sub_branch:
      type === "sub_branch_zone",
  };
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function EditCoverageLocationPage() {
  const params = useParams();
  const router = useRouter();

  const id = params?.id;

  const [record, setRecord] =
    useState(null);

  const [allLocations, setAllLocations] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [loadingLocations, setLoadingLocations] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [form, setForm] = useState({
    name: "",
    latitude: null,
    longitude: null,
    coverage_radius_km: 20,
    notes: "",
    status: "active",

    /**
     * Type is read-only.
     */
    type: "main_branch_zone",

    /**
     * Important for sub-branch zones.
     */
    parent_id: null,
  });

  const [originalForm, setOriginalForm] =
    useState(null);

  /* ---------------------------------------------------------------------- */
  /* Load current record                                                     */
  /* ---------------------------------------------------------------------- */

  const loadData = useCallback(async () => {
    if (!id) {
      return;
    }

    try {
      setLoading(true);

      const response =
        await getCoverageLocation(id);

      const location = unwrap(response);

      if (!location) {
        throw new Error(
          "Coverage location not found.",
        );
      }

      const normalizedType =
        normalizeType(location) ||
        "main_branch_zone";

      const parentId =
        getParentId(location);

      const initialForm = {
        name: location.name || "",

        latitude: numberOrNull(
          location.latitude,
        ),

        longitude: numberOrNull(
          location.longitude,
        ),

        coverage_radius_km:
          numberOrNull(
            location.coverage_radius_km,
          ) ?? 20,

        notes: location.notes || "",

        status:
          location.status || "active",

        type: normalizedType,

        /**
         * Preserve parent.
         */
        parent_id: parentId,
      };

      setRecord({
        ...location,

        type: normalizedType,

        parent_id: parentId,

        parent:
          location.parent ?? null,
      });

      setForm(initialForm);

      setOriginalForm(initialForm);
    } catch (error) {
      console.error(
        "Coverage location loading error:",
        error,
      );

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Could not load coverage location.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  /* ---------------------------------------------------------------------- */
  /* Load all locations                                                      */
  /* ---------------------------------------------------------------------- */

  const loadAllLocations =
    useCallback(async () => {
      try {
        setLoadingLocations(true);

        const response =
          await getCoverageLocations();

        const locations =
          normalizeLocations(response);

        setAllLocations(locations);
      } catch (error) {
        console.error(
          "Coverage locations loading error:",
          error,
        );

        message.warning(
          error?.response?.data?.message ||
            "Could not load other coverage locations for the map.",
        );

        setAllLocations([]);
      } finally {
        setLoadingLocations(false);
      }
    }, []);

  useEffect(() => {
    loadData();
    loadAllLocations();
  }, [
    loadData,
    loadAllLocations,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Form helpers                                                            */
  /* ---------------------------------------------------------------------- */

  const updateField = useCallback(
    (field, value) => {
      setForm((previous) => ({
        ...previous,
        [field]: value,
      }));
    },
    [],
  );

  const handleMapChange =
    useCallback((value) => {
      if (!value) {
        return;
      }

      const latitude =
        numberOrNull(value.latitude);

      const longitude =
        numberOrNull(value.longitude);

      if (
        latitude === null ||
        longitude === null
      ) {
        return;
      }

      setForm((previous) => ({
        ...previous,
        latitude,
        longitude,
      }));
    }, []);

  /* ---------------------------------------------------------------------- */
  /* Map locations                                                           */
  /* ---------------------------------------------------------------------- */

  const mapLocations = useMemo(() => {
    const result = [];
    const seen = new Set();

    const addLocation = (
      location,
      parent = null,
    ) => {
      if (!location) {
        return;
      }

      const locationId =
        getLocationId(location);

      const key =
        locationId !== null
          ? `id-${locationId}`
          : `coord-${location.latitude}-${location.longitude}`;

      if (seen.has(key)) {
        return;
      }

      const normalized =
        normalizeMapLocation(
          location,
          parent,
        );

      if (!normalized) {
        return;
      }

      seen.add(key);

      result.push(normalized);

      if (
        Array.isArray(
          location.children,
        )
      ) {
        location.children.forEach(
          (child) => {
            addLocation(
              child,
              normalized,
            );
          },
        );
      }
    };

    allLocations.forEach(
      (location) => {
        addLocation(location);
      },
    );

    if (record) {
      addLocation(record);

      if (
        Array.isArray(record.children)
      ) {
        record.children.forEach(
          (child) => {
            addLocation(
              child,
              record,
            );
          },
        );
      }
    }

    /**
     * Always guarantee current record
     * is visible.
     */
    if (record) {
      const currentId =
        getLocationId(record);

      const exists = result.some(
        (item) =>
          item.id === currentId,
      );

      if (!exists) {
        const current =
          normalizeMapLocation({
            ...record,

            type:
              normalizeType(record) ||
              form.type,

            latitude:
              form.latitude,

            longitude:
              form.longitude,

            coverage_radius_km:
              form.coverage_radius_km,

            parent_id:
              form.parent_id,
          });

        if (current) {
          result.push(current);
        }
      }
    }

    return result;
  }, [
    allLocations,
    record,
    form.type,
    form.parent_id,
    form.latitude,
    form.longitude,
    form.coverage_radius_km,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Current location                                                        */
  /* ---------------------------------------------------------------------- */

  const currentLocation = useMemo(() => {
    if (!record) {
      return null;
    }

    return {
      ...record,

      id: record.id,

      name: form.name,

      latitude: form.latitude,

      longitude: form.longitude,

      coverage_radius_km:
        form.coverage_radius_km,

      type:
        normalizeType(record) ||
        form.type,

      parent_id:
        getParentId(record) ??
        form.parent_id,
    };
  }, [
    record,
    form,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Changes                                                                 */
  /* ---------------------------------------------------------------------- */

  const hasChanges = useMemo(() => {
    if (!originalForm) {
      return false;
    }

    return (
      form.name !==
        originalForm.name ||
      Number(form.latitude) !==
        Number(
          originalForm.latitude,
        ) ||
      Number(form.longitude) !==
        Number(
          originalForm.longitude,
        ) ||
      Number(
        form.coverage_radius_km,
      ) !==
        Number(
          originalForm.coverage_radius_km,
        ) ||
      form.notes !==
        originalForm.notes ||
      form.status !==
        originalForm.status ||
      Number(form.parent_id) !==
        Number(
          originalForm.parent_id,
        )
    );
  }, [
    form,
    originalForm,
  ]);

  const resetChanges = () => {
    if (!originalForm) {
      return;
    }

    setForm({
      ...originalForm,
    });

    message.info(
      "Changes have been reset.",
    );
  };

  /* ---------------------------------------------------------------------- */
  /* Validation                                                              */
  /* ---------------------------------------------------------------------- */

  const validate = () => {
    if (!form.name?.trim()) {
      message.error(
        "Coverage name is required.",
      );

      return false;
    }

    if (
      form.latitude === null ||
      form.latitude < -90 ||
      form.latitude > 90
    ) {
      message.error(
        "Please enter a valid latitude.",
      );

      return false;
    }

    if (
      form.longitude === null ||
      form.longitude < -180 ||
      form.longitude > 180
    ) {
      message.error(
        "Please enter a valid longitude.",
      );

      return false;
    }

    if (
      form.coverage_radius_km ===
        null ||
      Number(
        form.coverage_radius_km,
      ) <= 0
    ) {
      message.error(
        "Coverage radius must be greater than 0.",
      );

      return false;
    }

    const currentType =
      normalizeType(record) ||
      form.type;

    if (
      currentType ===
        "sub_branch_zone" &&
      !getParentId(record) &&
      !form.parent_id
    ) {
      message.error(
        "Parent main branch zone is required for a sub-branch zone.",
      );

      return false;
    }

    return true;
  };

  /* ---------------------------------------------------------------------- */
  /* Save                                                                    */
  /* ---------------------------------------------------------------------- */

  const saveChanges = async () => {
    if (
      !record ||
      !validate()
    ) {
      return;
    }

    try {
      setSaving(true);

      /**
       * Never allow the user to change
       * the allocation type from this page.
       */
      const existingType =
        normalizeType(record) ||
        form.type ||
        "main_branch_zone";

      /**
       * IMPORTANT:
       *
       * First use record.parent_id / record.parent.id.
       * Then fall back to form.parent_id.
       */
      const existingParentId =
        getParentId(record) ??
        numberOrNull(form.parent_id);

      /**
       * Backend requires parent_id for
       * sub_branch_zone.
       */
      if (
        existingType ===
          "sub_branch_zone" &&
        !existingParentId
      ) {
        message.error(
          "Parent main branch zone is required for this sub-branch.",
        );

        return;
      }

      const payload = {
        name: form.name.trim(),

        latitude:
          Number(form.latitude),

        longitude:
          Number(form.longitude),

        coverage_radius_km:
          Number(
            form.coverage_radius_km,
          ),

        notes:
          form.notes?.trim() || null,

        status:
          form.status || "active",

        /**
         * Preserve existing type.
         */
        type: existingType,

        /**
         * Main zones must have no parent.
         * Sub zones must preserve their parent.
         */
        parent_id:
          existingType ===
          "sub_branch_zone"
            ? existingParentId
            : null,
      };

      console.log(
        "Updating coverage location:",
        {
          id: record.id,
          payload,
        },
      );

      await updateCoverageLocation(
        record.id,
        payload,
      );

      message.success(
        "Coverage location updated successfully.",
      );

      await Promise.all([
        loadData(),
        loadAllLocations(),
      ]);
    } catch (error) {
      console.error(
        "Coverage location update error:",
        error,
      );

      const validationErrors =
        error?.response?.data?.errors;

      if (validationErrors) {
        const firstError =
          Object.values(
            validationErrors,
          )?.[0]?.[0];

        message.error(
          firstError ||
            error?.response?.data
              ?.message ||
            "Could not update coverage location.",
        );
      } else {
        message.error(
          error?.response?.data
            ?.message ||
            error?.message ||
            "Could not update coverage location.",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Loading                                                                 */
  /* ---------------------------------------------------------------------- */

  if (loading) {
    return (
      <div
        style={{
          height:
            "calc(100vh - 72px)",
          minHeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Space
          direction="vertical"
          align="center"
        >
          <Spin size="large" />

          <Text type="secondary">
            Loading coverage location...
          </Text>
        </Space>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Error                                                                   */
  /* ---------------------------------------------------------------------- */

  if (!record) {
    return (
      <div
        style={{
          padding: 24,
        }}
      >
        <Alert
          type="error"
          showIcon
          message="Coverage location could not be loaded."
          description="Please return to the coverage locations list and try again."
          action={
            <Button
              onClick={() =>
                router.push(
                  "/admin/coverage-locations",
                )
              }
            >
              Back
            </Button>
          }
        />
      </div>
    );
  }

  const isMain =
    isMainZone(record);

  const isSub =
    isSubBranchZone(record);

  const childCount =
    Array.isArray(record.children)
      ? record.children.length
      : Number(
          record.child_zones_count ??
            record.children_count ??
            0,
        );

  const branchCount = Number(
    record.assigned_branches_count ??
      record.branches_count ??
      record.assignedBranches
        ?.length ??
      0,
  );

  const parentId =
    getParentId(record) ??
    form.parent_id;

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <div
      style={{
        height:
          "calc(100vh - 72px)",
        minHeight: 650,
        padding: "14px 18px",
        overflow: "hidden",
        background: "#f5f7fa",
      }}
    >
      <div
        style={{
          height: "100%",
          maxWidth: 1800,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* HEADER */}

        <Card
          bordered={false}
          style={{
            borderRadius: 10,
            flexShrink: 0,
          }}
          styles={{
            body: {
              padding: "10px 16px",
            },
          }}
        >
          <Breadcrumb
            items={[
              {
                title: (
                  <Link href="/admin/coverage-locations">
                    Coverage Locations
                  </Link>
                ),
              },
              {
                title: "Edit",
              },
            ]}
            style={{
              marginBottom: 4,
              fontSize: 12,
            }}
          />

          <Row
            justify="space-between"
            align="middle"
            gutter={[12, 8]}
          >
            <Col xs={24} lg={17}>
              <Space
                align="center"
                wrap
                size={8}
              >
                <Button
                  type="text"
                  size="small"
                  icon={
                    <ArrowLeftOutlined />
                  }
                  onClick={() =>
                    router.push(
                      "/admin/coverage-locations",
                    )
                  }
                />

                <Title
                  level={3}
                  style={{
                    margin: 0,
                    fontSize: 21,
                  }}
                >
                  {record.name}
                </Title>

                <Tag color="blue">
                  {isMain
                    ? "Main Branch Zone"
                    : "Sub-Branch Zone"}
                </Tag>

                <Tag
                  color={
                    form.status ===
                    "active"
                      ? "success"
                      : "default"
                  }
                >
                  {form.status}
                </Tag>
              </Space>

              <div
                style={{
                  marginLeft: 36,
                  marginTop: 2,
                }}
              >
                <Text
                  type="secondary"
                  style={{
                    fontSize: 12,
                  }}
                >
                  Code:{" "}
                  <Text code>
                    {record.code ||
                      "—"}
                  </Text>

                  {" · "}

                  ID: {record.id}

                  {" · "}

                  Type:{" "}
                  <Text strong>
                    {isMain
                      ? "Main"
                      : "Sub-Branch"}
                  </Text>

                  {isSub &&
                    parentId && (
                      <>
                        {" · "}
                        Parent ID:{" "}
                        <Text strong>
                          {parentId}
                        </Text>
                      </>
                    )}
                </Text>
              </div>
            </Col>

            <Col>
              <Space
                size={8}
                wrap
              >
                <Text
                  type="secondary"
                  style={{
                    fontSize: 12,
                  }}
                >
                  {form.status ===
                  "active"
                    ? "Active"
                    : "Inactive"}
                </Text>

                <Switch
                  size="small"
                  checked={
                    form.status ===
                    "active"
                  }
                  onChange={(
                    checked,
                  ) =>
                    updateField(
                      "status",
                      checked
                        ? "active"
                        : "inactive",
                    )
                  }
                />

                {isMain && (
                  <Button
                    size="small"
                    icon={
                      <SwapOutlined />
                    }
                    onClick={() =>
                      router.push(
                        `/admin/coverage-locations/${record.id}/convert-to-sub-branch`,
                      )
                    }
                  >
                    Convert to Sub-Branch
                  </Button>
                )}

                <Button
                  size="small"
                  onClick={() =>
                    router.push(
                      `/admin/coverage-locations/${record.id}`,
                    )
                  }
                >
                  View
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* MAIN AREA */}

        <div
          style={{
            flex: 1,
            minHeight: 0,
          }}
        >
          <Row
            gutter={[10, 10]}
            style={{
              height: "100%",
            }}
          >
            {/* LEFT */}

            <Col
              xs={24}
              xl={9}
              style={{
                height: "100%",
              }}
            >
              <Card
                bordered={false}
                title={
                  <Space size={7}>
                    <InfoCircleOutlined />
                    <span>
                      Coverage Configuration
                    </span>
                  </Space>
                }
                style={{
                  height: "100%",
                  borderRadius: 10,
                }}
                styles={{
                  header: {
                    minHeight: 46,
                    padding: "0 14px",
                  },

                  body: {
                    height:
                      "calc(100% - 46px)",
                    overflowY: "auto",
                    padding: 14,
                  },
                }}
              >
                <Space
                  direction="vertical"
                  size={10}
                  style={{
                    width: "100%",
                  }}
                >
                  {/* NAME */}

                  <div>
                    <Text strong>
                      <span
                        style={{
                          color:
                            "#ff4d4f",
                        }}
                      >
                        *
                      </span>{" "}
                      Coverage Name
                    </Text>

                    <Input
                      value={form.name}
                      maxLength={150}
                      onChange={(e) =>
                        updateField(
                          "name",
                          e.target.value,
                        )
                      }
                      suffix={
                        <Text
                          type="secondary"
                          style={{
                            fontSize: 11,
                          }}
                        >
                          {
                            form.name
                              .length
                          }
                          /150
                        </Text>
                      }
                      style={{
                        marginTop: 5,
                      }}
                    />
                  </div>

                  {/* TYPE */}

                  <div
                    style={{
                      border:
                        "1px solid #e6f4ff",
                      background:
                        "#f0f8ff",
                      borderRadius: 8,
                      padding:
                        "8px 10px",
                    }}
                  >
                    <Row
                      justify="space-between"
                      align="middle"
                    >
                      <Col>
                        <Text
                          type="secondary"
                          style={{
                            fontSize: 11,
                            display:
                              "block",
                          }}
                        >
                          ALLOCATION TYPE
                        </Text>

                        <Text strong>
                          {isMain
                            ? "Main Branch Zone"
                            : "Sub-Branch Zone"}
                        </Text>
                      </Col>

                      <Col>
                        <Tag
                          color={
                            isMain
                              ? "blue"
                              : "green"
                          }
                        >
                          {isMain
                            ? "MAIN"
                            : "SUB"}
                        </Tag>
                      </Col>
                    </Row>
                  </div>

                  {/* PARENT */}

                  {isSub && (
                    <div
                      style={{
                        border:
                          "1px solid #d9f7be",
                        background:
                          "#f6ffed",
                        borderRadius: 8,
                        padding:
                          "8px 10px",
                      }}
                    >
                      <Text
                        type="secondary"
                        style={{
                          fontSize: 10,
                          display:
                            "block",
                          textTransform:
                            "uppercase",
                        }}
                      >
                        PARENT MAIN BRANCH
                        ZONE
                      </Text>

                      <Text strong>
                        {record.parent
                          ?.name ||
                          record.parent_name ||
                          (parentId
                            ? `Parent #${parentId}`
                            : "Not assigned")}
                      </Text>

                      {record.parent
                        ?.code && (
                        <Text
                          type="secondary"
                          style={{
                            marginLeft: 6,
                            fontSize: 11,
                          }}
                        >
                          ({record.parent.code})
                        </Text>
                      )}
                    </div>
                  )}

                  {/* COORDINATES */}

                  <Row gutter={8}>
                    <Col span={12}>
                      <Text strong>
                        <span
                          style={{
                            color:
                              "#ff4d4f",
                          }}
                        >
                          *
                        </span>{" "}
                        Latitude
                      </Text>

                      <InputNumber
                        value={
                          form.latitude
                        }
                        precision={7}
                        step={0.000001}
                        controls={false}
                        style={{
                          width:
                            "100%",
                          marginTop: 5,
                        }}
                        onChange={(
                          value,
                        ) =>
                          updateField(
                            "latitude",
                            value,
                          )
                        }
                      />
                    </Col>

                    <Col span={12}>
                      <Text strong>
                        <span
                          style={{
                            color:
                              "#ff4d4f",
                          }}
                        >
                          *
                        </span>{" "}
                        Longitude
                      </Text>

                      <InputNumber
                        value={
                          form.longitude
                        }
                        precision={7}
                        step={0.000001}
                        controls={false}
                        style={{
                          width:
                            "100%",
                          marginTop: 5,
                        }}
                        onChange={(
                          value,
                        ) =>
                          updateField(
                            "longitude",
                            value,
                          )
                        }
                      />
                    </Col>
                  </Row>

                  {/* RADIUS */}

                  <div>
                    <Text strong>
                      <span
                        style={{
                          color:
                            "#ff4d4f",
                        }}
                      >
                        *
                      </span>{" "}
                      Coverage Radius
                    </Text>

                    <InputNumber
                      value={
                        form.coverage_radius_km
                      }
                      min={0.1}
                      max={500}
                      precision={2}
                      controls={false}
                      addonAfter="km"
                      style={{
                        width:
                          "100%",
                        marginTop: 5,
                      }}
                      onChange={(
                        value,
                      ) =>
                        updateField(
                          "coverage_radius_km",
                          value,
                        )
                      }
                    />
                  </div>

                  <Divider
                    style={{
                      margin: "3px 0",
                    }}
                  />

                  {/* LOCATION */}

                  <div>
                    <Space
                      size={6}
                      style={{
                        marginBottom: 6,
                      }}
                    >
                      <EnvironmentOutlined />

                      <Text strong>
                        Location Details
                      </Text>

                      <Tag>
                        Read only
                      </Tag>
                    </Space>

                    <div
                      style={{
                        border:
                          "1px solid #e5e7eb",
                        borderRadius: 8,
                        background:
                          "#fafafa",
                        padding: 10,
                      }}
                    >
                      <Text
                        type="secondary"
                        style={{
                          display:
                            "block",
                          fontSize: 10,
                          textTransform:
                            "uppercase",
                          letterSpacing:
                            0.5,
                        }}
                      >
                        Full Address
                      </Text>

                      <Text
                        strong
                        style={{
                          display:
                            "block",
                          marginTop: 3,
                          lineHeight:
                            1.4,
                          fontSize: 13,
                        }}
                      >
                        {getAddress(
                          record,
                        ) || "—"}
                      </Text>

                      <Space
                        wrap
                        size={[5, 5]}
                        style={{
                          marginTop: 7,
                        }}
                      >
                        {record.country && (
                          <Tag>
                            Country:{" "}
                            {
                              record.country
                            }
                          </Tag>
                        )}

                        {record.province && (
                          <Tag>
                            Province:{" "}
                            {
                              record.province
                            }
                          </Tag>
                        )}

                        {record.district && (
                          <Tag>
                            District:{" "}
                            {
                              record.district
                            }
                          </Tag>
                        )}

                        {record.city && (
                          <Tag>
                            City:{" "}
                            {
                              record.city
                            }
                          </Tag>
                        )}

                        {record.area && (
                          <Tag>
                            Area:{" "}
                            {record.area}
                          </Tag>
                        )}

                        {record.street && (
                          <Tag>
                            Street:{" "}
                            {
                              record.street
                            }
                          </Tag>
                        )}

                        {record.landmark && (
                          <Tag>
                            Landmark:{" "}
                            {
                              record.landmark
                            }
                          </Tag>
                        )}
                      </Space>
                    </div>
                  </div>

                  {/* NOTES */}

                  <div>
                    <Text strong>
                      Notes
                    </Text>

                    <TextArea
                      value={
                        form.notes
                      }
                      maxLength={500}
                      showCount
                      rows={2}
                      placeholder="Optional internal notes"
                      onChange={(e) =>
                        updateField(
                          "notes",
                          e.target.value,
                        )
                      }
                      style={{
                        marginTop: 5,
                      }}
                    />
                  </div>

                  {/* COUNTS */}

                  <Row gutter={8}>
                    <Col span={12}>
                      <div
                        style={{
                          border:
                            "1px solid #f0f0f0",
                          borderRadius: 8,
                          padding:
                            "7px 10px",
                          background:
                            "#fafafa",
                        }}
                      >
                        <Text
                          type="secondary"
                          style={{
                            fontSize: 10,
                            display:
                              "block",
                          }}
                        >
                          SUB-ZONES
                        </Text>

                        <Text strong>
                          {childCount}
                        </Text>
                      </div>
                    </Col>

                    <Col span={12}>
                      <div
                        style={{
                          border:
                            "1px solid #f0f0f0",
                          borderRadius: 8,
                          padding:
                            "7px 10px",
                          background:
                            "#fafafa",
                        }}
                      >
                        <Text
                          type="secondary"
                          style={{
                            fontSize: 10,
                            display:
                              "block",
                          }}
                        >
                          ASSIGNED BRANCHES
                        </Text>

                        <Text strong>
                          {branchCount}
                        </Text>
                      </div>
                    </Col>
                  </Row>

                  {/* STATUS */}

                  <div
                    style={{
                      border:
                        "1px solid #e6f4ff",
                      background:
                        "#f0f8ff",
                      borderRadius: 8,
                      padding:
                        "8px 10px",
                    }}
                  >
                    <Space>
                      <CheckCircleOutlined
                        style={{
                          color:
                            form.status ===
                            "active"
                              ? "#52c41a"
                              : "#8c8c8c",
                        }}
                      />

                      <div>
                        <Text strong>
                          Location is{" "}
                          {form.status ===
                          "active"
                            ? "active"
                            : "inactive"}
                        </Text>

                        <br />

                        <Text
                          type="secondary"
                          style={{
                            fontSize: 11,
                          }}
                        >
                          Active coverage
                          locations can
                          be used for
                          branch
                          allocation.
                        </Text>
                      </div>
                    </Space>
                  </div>
                </Space>
              </Card>
            </Col>

            {/* RIGHT MAP */}

            <Col
              xs={24}
              xl={15}
              style={{
                height: "100%",
              }}
            >
              <Card
                bordered={false}
                title={
                  <Space size={7}>
                    <EnvironmentOutlined />
                    <span>
                      Map & Coverage
                    </span>
                  </Space>
                }
                extra={
                  <Space size={5}>
                    <Tag color="purple">
                      {
                        form.coverage_radius_km
                      }{" "}
                      km
                    </Tag>

                    <Tag color="blue">
                      {
                        mapLocations.length
                      }{" "}
                      locations
                    </Tag>
                  </Space>
                }
                style={{
                  height: "100%",
                  borderRadius: 10,
                }}
                styles={{
                  header: {
                    minHeight: 46,
                    padding: "0 14px",
                  },

                  body: {
                    height:
                      "calc(100% - 46px)",
                    padding: 8,
                    display: "flex",
                    flexDirection:
                      "column",
                    minHeight: 0,
                  },
                }}
              >
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    position: "relative",
                  }}
                >
                  <CoverageRadiusMap
                    value={{
                      latitude:
                        form.latitude,
                      longitude:
                        form.longitude,
                    }}
                    radiusKm={
                      Number(
                        form.coverage_radius_km,
                      ) || 5
                    }
                    existingLocations={
                      mapLocations
                    }
                    existingBranches={
                      record.assignedBranches ||
                      []
                    }
                    showExisting
                    showBranches
                    showSearch
                    clickable
                    height="100%"
                    onChange={
                      handleMapChange
                    }
                    selectedLocationId={
                      record.id
                    }
                  />

                  {/* LEGEND */}

                  <div
                    style={{
                      position:
                        "absolute",
                      left: 10,
                      bottom: 10,
                      zIndex: 1000,
                      background:
                        "rgba(255,255,255,.96)",
                      border:
                        "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding:
                        "7px 9px",
                      boxShadow:
                        "0 2px 10px rgba(0,0,0,.12)",
                    }}
                  >
                    <Space
                      size={10}
                      wrap
                    >
                      <Space size={4}>
                        <span
                          style={{
                            width: 9,
                            height: 9,
                            borderRadius:
                              "50%",
                            background:
                              "#1677ff",
                            display:
                              "inline-block",
                          }}
                        />

                        <Text
                          style={{
                            fontSize: 10,
                          }}
                        >
                          Current
                        </Text>
                      </Space>

                      <Space size={4}>
                        <span
                          style={{
                            width: 9,
                            height: 9,
                            borderRadius:
                              "50%",
                            background:
                              "#52c41a",
                            display:
                              "inline-block",
                          }}
                        />

                        <Text
                          style={{
                            fontSize: 10,
                          }}
                        >
                          Main
                        </Text>
                      </Space>

                      <Space size={4}>
                        <span
                          style={{
                            width: 9,
                            height: 9,
                            borderRadius:
                              "50%",
                            background:
                              "#fa8c16",
                            display:
                              "inline-block",
                          }}
                        />

                        <Text
                          style={{
                            fontSize: 10,
                          }}
                        >
                          Sub
                        </Text>
                      </Space>
                    </Space>
                  </div>

                  {/* CURRENT BADGE */}

                  <div
                    style={{
                      position:
                        "absolute",
                      top: 10,
                      left: 10,
                      zIndex: 1000,
                      background:
                        "rgba(255,255,255,.96)",
                      border:
                        "1px solid #dbeafe",
                      borderRadius: 8,
                      padding:
                        "7px 9px",
                      boxShadow:
                        "0 2px 10px rgba(0,0,0,.1)",
                    }}
                  >
                    <Space size={6}>
                      <AimOutlined
                        style={{
                          color:
                            "#1677ff",
                        }}
                      />

                      <Text
                        style={{
                          fontSize: 11,
                        }}
                      >
                        Click map to
                        move location
                      </Text>
                    </Space>
                  </div>
                </div>

                {/* SUMMARY */}

                <div
                  style={{
                    marginTop: 7,
                    flexShrink: 0,
                    border:
                      "1px solid #e5e7eb",
                    borderRadius: 8,
                    background:
                      "#fafafa",
                    padding:
                      "7px 10px",
                  }}
                >
                  <Row gutter={12}>
                    <Col flex="1">
                      <Text
                        type="secondary"
                        style={{
                          fontSize: 9,
                          display:
                            "block",
                        }}
                      >
                        LATITUDE
                      </Text>

                      <Text strong>
                        {form.latitude ??
                          "—"}
                      </Text>
                    </Col>

                    <Col flex="1">
                      <Text
                        type="secondary"
                        style={{
                          fontSize: 9,
                          display:
                            "block",
                        }}
                      >
                        LONGITUDE
                      </Text>

                      <Text strong>
                        {form.longitude ??
                          "—"}
                      </Text>
                    </Col>

                    <Col flex="1">
                      <Text
                        type="secondary"
                        style={{
                          fontSize: 9,
                          display:
                            "block",
                        }}
                      >
                        COVERAGE
                      </Text>

                      <Text strong>
                        {
                          form.coverage_radius_km
                        }{" "}
                        km
                      </Text>
                    </Col>
                  </Row>
                </div>
              </Card>
            </Col>
          </Row>
        </div>

        {/* FOOTER */}

        <Card
          bordered={false}
          style={{
            borderRadius: 10,
            flexShrink: 0,
          }}
          styles={{
            body: {
              padding: "7px 12px",
            },
          }}
        >
          <Row
            justify="space-between"
            align="middle"
            gutter={[8, 8]}
          >
            <Col>
              <Space
                size={8}
                wrap
              >
                {hasChanges ? (
                  <Tag color="orange">
                    Unsaved changes
                  </Tag>
                ) : (
                  <Text
                    type="secondary"
                    style={{
                      fontSize: 11,
                    }}
                  >
                    No changes
                  </Text>
                )}

                {loadingLocations && (
                  <Space size={4}>
                    <Spin size="small" />

                    <Text
                      type="secondary"
                      style={{
                        fontSize: 11,
                      }}
                    >
                      Loading map
                      locations...
                    </Text>
                  </Space>
                )}
              </Space>
            </Col>

            <Col>
              <Space size={6}>
                <Button
                  size="small"
                  icon={
                    <UndoOutlined />
                  }
                  disabled={
                    !hasChanges ||
                    saving
                  }
                  onClick={
                    resetChanges
                  }
                >
                  Reset
                </Button>

                <Button
                  size="small"
                  onClick={() =>
                    router.push(
                      "/admin/coverage-locations",
                    )
                  }
                  disabled={saving}
                >
                  Cancel
                </Button>

                <Button
                  size="small"
                  type="primary"
                  icon={
                    <SaveOutlined />
                  }
                  loading={saving}
                  disabled={
                    !hasChanges
                  }
                  onClick={
                    saveChanges
                  }
                >
                  Save Changes
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      </div>
    </div>
  );
}