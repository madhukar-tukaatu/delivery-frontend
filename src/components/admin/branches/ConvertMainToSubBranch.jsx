"use client";

import {
  useEffect,
  useMemo,
} from "react";

import dynamic from "next/dynamic";

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
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
} from "antd";

import {
  EnvironmentOutlined,
  SwapOutlined,
  WarningOutlined,
  SaveOutlined,
} from "@ant-design/icons";

const CoverageRadiusMap = dynamic(
  () =>
    import("@/components/maps/CoverageRadiusMap"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 420,
          background: "#f8fafc",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading map...
      </div>
    ),
  }
);

const {
  Text,
  Title,
} = Typography;

function toNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

export default function ConvertMainToSubBranch({
  location,
  mainZones = [],
  existingLocations = [],
  existingSubBranches = [],
  assignedBranches = [],
  loading = false,
  onSubmit,
  onCancel,
}) {
  const [form] = Form.useForm();

  const parentId = Form.useWatch(
    "parent_id",
    form
  );

  const name = Form.useWatch(
    "name",
    form
  );

  const latitude = Form.useWatch(
    "latitude",
    form
  );

  const longitude = Form.useWatch(
    "longitude",
    form
  );

  const radius = Form.useWatch(
    "coverage_radius_km",
    form
  );

  /*
   * ---------------------------------------------------------
   * Selected parent
   * ---------------------------------------------------------
   */

  const selectedParent = useMemo(() => {
    return mainZones.find(
      (item) =>
        Number(item.id) ===
        Number(parentId)
    );
  }, [
    mainZones,
    parentId,
  ]);

  /*
   * ---------------------------------------------------------
   * Initialize form
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!location) {
      return;
    }

    form.setFieldsValue({
      parent_id: undefined,

      name: location.name
        ? `${location.name} Sub-Branch`
        : "",

      latitude:
        location.latitude ?? null,

      longitude:
        location.longitude ?? null,

      coverage_radius_km:
        toNumber(
          location.coverage_radius_km
        ) || 3,

      country:
        location.country || "Nepal",

      province:
        location.province || "",

      district:
        location.district || "",

      city:
        location.city || "",

      area:
        location.area || "",

      street:
        location.street || "",

      address:
        location.address || "",

      landmark:
        location.landmark || "",
    });
  }, [
    location?.id,
    form,
  ]);

  /*
   * ---------------------------------------------------------
   * Map value
   *
   * IMPORTANT:
   * The shared CoverageRadiusMap accepts
   *
   * {
   *   latitude,
   *   longitude
   * }
   *
   * ---------------------------------------------------------
   */

  const mapValue = useMemo(() => {
    const lat =
      toNumber(latitude);

    const lng =
      toNumber(longitude);

    if (
      lat !== null &&
      lng !== null
    ) {
      return {
        latitude: lat,
        longitude: lng,
      };
    }

    const locationLat =
      toNumber(location?.latitude);

    const locationLng =
      toNumber(location?.longitude);

    if (
      locationLat !== null &&
      locationLng !== null
    ) {
      return {
        latitude: locationLat,
        longitude: locationLng,
      };
    }

    return {
      latitude: null,
      longitude: null,
    };
  }, [
    latitude,
    longitude,
    location?.latitude,
    location?.longitude,
  ]);

  /*
   * ---------------------------------------------------------
   * Map click/search result
   *
   * This is compatible with your existing
   * CoverageRadiusMap.
   * ---------------------------------------------------------
   */

  function handleMapChange(
    mapLocation
  ) {
    if (!mapLocation) {
      return;
    }

    const lat =
      toNumber(
        mapLocation.latitude
      );

    const lng =
      toNumber(
        mapLocation.longitude
      );

    if (
      lat === null ||
      lng === null
    ) {
      message.error(
        "Invalid map coordinates."
      );

      return;
    }

    form.setFieldsValue({
      latitude: lat,
      longitude: lng,

      address:
        mapLocation.address ||
        form.getFieldValue(
          "address"
        ),

      province:
        mapLocation.province ||
        form.getFieldValue(
          "province"
        ),

      district:
        mapLocation.district ||
        form.getFieldValue(
          "district"
        ),

      city:
        mapLocation.city ||
        form.getFieldValue(
          "city"
        ),

      area:
        mapLocation.area ||
        form.getFieldValue(
          "area"
        ),

      street:
        mapLocation.street ||
        form.getFieldValue(
          "street"
        ),

      landmark:
        mapLocation.landmark ||
        form.getFieldValue(
          "landmark"
        ),
    });
  }

  /*
   * ---------------------------------------------------------
   * Submit conversion
   * ---------------------------------------------------------
   */

  async function handleSubmit() {
    try {
      const values =
        await form.validateFields();

      const lat =
        toNumber(values.latitude);

      const lng =
        toNumber(values.longitude);

      if (
        lat === null ||
        lng === null
      ) {
        message.error(
          "Please select the new sub-branch location on the map."
        );

        return;
      }

      if (
        !values.parent_id
      ) {
        message.error(
          "Please select the destination main branch."
        );

        return;
      }

      if (
        Number(values.parent_id) ===
        Number(location?.id)
      ) {
        message.error(
          "The current location cannot be its own parent."
        );

        return;
      }

      if (
        !values.name?.trim()
      ) {
        message.error(
          "Please enter the new sub-branch name."
        );

        return;
      }

      const payload = {
        parent_id:
          Number(values.parent_id),

        name:
          values.name.trim(),

        latitude: lat,

        longitude: lng,

        coverage_radius_km:
          Number(
            values.coverage_radius_km
          ),

        country:
          values.country ||
          "Nepal",

        province:
          values.province ||
          null,

        district:
          values.district ||
          null,

        city:
          values.city ||
          null,

        area:
          values.area ||
          null,

        street:
          values.street ||
          null,

        address:
          values.address ||
          null,

        landmark:
          values.landmark ||
          null,
      };

      await onSubmit(payload);
    } catch (error) {
      /*
       * Ant Design validation error.
       */
      if (
        error?.errorFields
      ) {
        return;
      }

      console.error(error);

      message.error(
        error?.response?.data
          ?.message ||
          error?.message ||
          "Conversion failed."
      );
    }
  }

  const displayRadius =
    toNumber(radius) || 3;

  return (
    <Row
      gutter={[
        16,
        16,
      ]}
    >
      {/* =========================================================
          LEFT SIDE
          ========================================================= */}

      <Col
        xs={24}
        xl={10}
      >
        <Card>
          <Space
            direction="vertical"
            size={16}
            style={{
              width: "100%",
            }}
          >
            {/* Header */}

            <div>
              <Tag color="blue">
                Main Branch Zone
              </Tag>

              <SwapOutlined
                style={{
                  margin:
                    "0 8px",
                }}
              />

              <Tag color="green">
                Sub-Branch Zone
              </Tag>
            </div>

            <Title
              level={4}
              style={{
                margin: 0,
              }}
            >
              Convert Main to
              Sub-Branch
            </Title>

            <Text type="secondary">
              Convert this main coverage
              location into a sub-branch
              under another active main
              coverage location.
            </Text>

            {/* =====================================================
                CURRENT LOCATION
                ===================================================== */}

            <Card
              size="small"
              style={{
                background:
                  "#f8fafc",
              }}
            >
              <Descriptions
                column={1}
                size="small"
                title="Current Location"
              >
                <Descriptions.Item
                  label="Name"
                >
                  <strong>
                    {location?.name ||
                      "—"}
                  </strong>
                </Descriptions.Item>

                <Descriptions.Item
                  label="Code"
                >
                  {location?.code ||
                    "—"}
                </Descriptions.Item>

                <Descriptions.Item
                  label="Type"
                >
                  <Tag color="blue">
                    Main Branch Zone
                  </Tag>
                </Descriptions.Item>

                <Descriptions.Item
                  label="Coordinates"
                >
                  {location?.latitude ??
                    "—"}
                  {", "}
                  {location?.longitude ??
                    "—"}
                </Descriptions.Item>

                <Descriptions.Item
                  label="Radius"
                >
                  {location?.coverage_radius_km ??
                    3}{" "}
                  km
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* =====================================================
                EXISTING CHILDREN
                ===================================================== */}

            {existingSubBranches.length >
              0 && (
              <Alert
                type="warning"
                showIcon
                icon={
                  <WarningOutlined />
                }
                message={`${existingSubBranches.length} existing sub-branch zone${
                  existingSubBranches.length >
                  1
                    ? "s"
                    : ""
                }`}
                description={
                  <>
                    These child coverage
                    locations will be
                    transferred to the
                    selected destination
                    main branch.
                  </>
                }
              />
            )}

            {/* =====================================================
                FORM
                ===================================================== */}

            <Form
              form={form}
              layout="vertical"
            >
              {/* Parent */}

              <Form.Item
                label="Transfer Existing Sub-Branches To"
                name="parent_id"
                rules={[
                  {
                    required: true,
                    message:
                      "Select another active main coverage location.",
                  },
                ]}
              >
                <Select
                  showSearch
                  allowClear
                  placeholder="Select active main coverage location"
                  optionFilterProp="label"
                  options={mainZones.map(
                    (item) => ({
                      value:
                        Number(
                          item.id
                        ),
                      label:
                        `${item.name} (${item.code})`,
                    })
                  )}
                />
              </Form.Item>

              <Divider />

              {/* Name */}

              <Form.Item
                label="New Sub-Branch Name"
                name="name"
                rules={[
                  {
                    required: true,
                    message:
                      "Enter the new sub-branch name.",
                  },
                  {
                    max: 150,
                    message:
                      "Maximum 150 characters.",
                  },
                ]}
              >
                <Input
                  placeholder="Example: Butwal East"
                  maxLength={150}
                  showCount
                />
              </Form.Item>

              {/* Coordinates */}

              <Row
                gutter={12}
              >
                <Col
                  span={12}
                >
                  <Form.Item
                    label="Latitude"
                    name="latitude"
                    rules={[
                      {
                        required: true,
                        message:
                          "Select a location on the map.",
                      },
                    ]}
                  >
                    <InputNumber
                      style={{
                        width:
                          "100%",
                      }}
                      stringMode
                      precision={7}
                      readOnly
                    />
                  </Form.Item>
                </Col>

                <Col
                  span={12}
                >
                  <Form.Item
                    label="Longitude"
                    name="longitude"
                    rules={[
                      {
                        required: true,
                        message:
                          "Select a location on the map.",
                      },
                    ]}
                  >
                    <InputNumber
                      style={{
                        width:
                          "100%",
                      }}
                      stringMode
                      precision={7}
                      readOnly
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* Radius */}

              <Form.Item
                label="New Coverage Radius (km)"
                name="coverage_radius_km"
                rules={[
                  {
                    required: true,
                    message:
                      "Enter coverage radius.",
                  },
                ]}
              >
                <InputNumber
                  min={0.1}
                  max={100}
                  step={0.5}
                  precision={2}
                  style={{
                    width:
                      "100%",
                  }}
                />
              </Form.Item>

              {/* Hidden location fields */}

              <Form.Item
                name="country"
                hidden
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="province"
                hidden
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="district"
                hidden
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="city"
                hidden
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="area"
                hidden
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="street"
                hidden
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="address"
                hidden
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="landmark"
                hidden
              >
                <Input />
              </Form.Item>
            </Form>
          </Space>
        </Card>
      </Col>

      {/* =========================================================
          RIGHT SIDE
          ========================================================= */}

      <Col
        xs={24}
        xl={14}
      >
        <Card
          title={
            <Space>
              <EnvironmentOutlined />

              <span>
                Select New Sub-Branch Location
              </span>
            </Space>
          }
        >
          <Alert
            type="info"
            showIcon
            style={{
              marginBottom: 12,
            }}
            message="Select the new sub-branch location"
            description="Click anywhere on the map or search for a location. The coordinates and address information will automatically update."
          />

          {/*
           * IMPORTANT:
           *
           * This is your existing shared map.
           *
           * We are NOT changing CoverageRadiusMap.
           */}

          <CoverageRadiusMap
            value={mapValue}
            radiusKm={
              displayRadius
            }
            onChange={
              handleMapChange
            }
            existingLocations={
              existingLocations
            }
            existingBranches={[]}
            showExisting={true}
            showBranches={false}
            height={420}
            showSearch={true}
            clickable={true}
          />
        </Card>

        {/* =========================================================
            PREVIEW
            ========================================================= */}

        <Card
          style={{
            marginTop: 16,
          }}
          title="Conversion Preview"
        >
          <Row
            gutter={[
              16,
              16,
            ]}
          >
            <Col
              xs={24}
              md={8}
            >
              <Statistic
                title="Current"
                value={
                  location?.name ||
                  "-"
                }
              />

              <Text type="secondary">
                {location?.code ||
                  "-"}
              </Text>
            </Col>

            <Col
              xs={24}
              md={8}
            >
              <Statistic
                title="New Parent"
                value={
                  selectedParent?.name ||
                  "Not selected"
                }
              />

              <Text type="secondary">
                {selectedParent?.code ||
                  "Select a parent"}
              </Text>
            </Col>

            <Col
              xs={24}
              md={8}
            >
              <Statistic
                title="Children Transferred"
                value={
                  existingSubBranches.length
                }
              />
            </Col>
          </Row>

          <Divider />

          <Descriptions
            column={1}
            size="small"
          >
            <Descriptions.Item
              label="New Sub-Branch Name"
            >
              {name ||
                "-"}
            </Descriptions.Item>

            <Descriptions.Item
              label="New Type"
            >
              <Tag color="green">
                Sub-Branch Zone
              </Tag>
            </Descriptions.Item>

            <Descriptions.Item
              label="New Coordinates"
            >
              {mapValue.latitude !==
              null
                ? mapValue.latitude
                : "-"}
              {", "}
              {mapValue.longitude !==
              null
                ? mapValue.longitude
                : "-"}
            </Descriptions.Item>

            <Descriptions.Item
              label="New Radius"
            >
              {displayRadius} km
            </Descriptions.Item>

            <Descriptions.Item
              label="Assigned Branches"
            >
              {assignedBranches.length}
            </Descriptions.Item>
          </Descriptions>

          <Alert
            type="warning"
            showIcon
            style={{
              marginTop: 16,
            }}
            message="This operation changes the allocation hierarchy"
            description="Existing child zones will be transferred to the selected parent before this location becomes a sub-branch."
          />

          <Space
            style={{
              width: "100%",
              justifyContent:
                "flex-end",
              marginTop: 16,
            }}
          >
            <Button
              onClick={
                onCancel
              }
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="primary"
              danger
              icon={
                <SaveOutlined />
              }
              loading={loading}
              onClick={
                handleSubmit
              }
            >
              Convert to
              Sub-Branch
            </Button>
          </Space>
        </Card>
      </Col>
    </Row>
  );
}