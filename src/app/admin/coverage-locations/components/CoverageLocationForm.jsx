"use client";

import { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";

import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Select,
  Row,
  Space,
  Tag,
  Typography,
} from "antd";

import {
  EnvironmentOutlined,
  SaveOutlined,
} from "@ant-design/icons";

import { makeCoverageCode } from "@/lib/nepalDistrictAbbr";

const { Text } = Typography;

const CoverageRadiusMap = dynamic(
  () =>
    import(
      "@/components/maps/CoverageRadiusMap"
    ),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100%",
          height: 520,
          minHeight: 420,
          background: "#f8fafc",
          border:
            "1px solid #e5e7eb",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading map...
      </div>
    ),
  },
);

function stringValue(
  value,
){
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
}

function numberOrNull(
  value,
) {
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

export default function CoverageLocationForm({
  mode = "create",
  initialValues,
  mainZones = [],
  existingLocations = [],
  existingBranches = [],
  loading = false,
  onSubmit,
  onCancel,
}) {
  const [form] = Form.useForm();

  const type = Form.useWatch(
    "type",
    form,
  );

  const name = Form.useWatch(
    "name",
    form,
  );

  const radius = Form.useWatch(
    "coverage_radius_km",
    form,
  );

  const latitude = Form.useWatch(
    "latitude",
    form,
  );

  const longitude = Form.useWatch(
    "longitude",
    form,
  );

  const province = Form.useWatch(
    "province",
    form,
  );

  const district = Form.useWatch(
    "district",
    form,
  );

  const city = Form.useWatch(
    "city",
    form,
  );

  const area = Form.useWatch(
    "area",
    form,
  );

  const street = Form.useWatch(
    "street",
    form,
  );

  const landmark = Form.useWatch(
    "landmark",
    form,
  );

  const address = Form.useWatch(
    "address",
    form,
  );

  const isSub =
    type === "sub_branch_zone";

  const codePreview =
    mode === "create"
      ? makeCoverageCode(
          name,
          type,
        )
      : null;

  const hasCoords =
    latitude !== null &&
    latitude !== undefined &&
    latitude !== "" &&
    longitude !== null &&
    longitude !== undefined &&
    longitude !== "";

  const mapValue = useMemo(() => {
    const lat =
      numberOrNull(latitude);

    const lng =
      numberOrNull(longitude);

    return {
      latitude: lat,
      longitude: lng,
    };
  }, [
    latitude,
    longitude,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Initialize form                                                        */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const defaults = {
      type: "main_branch_zone",

      country: "Nepal",

      coverage_radius_km: 5,

      status: "active",

      is_hq_managed: true,

      parent_id: null,

      province: "",
      district: "",
      city: "",
      area: "",
      street: "",
      landmark: "",
      address: "",

      ...initialValues,
    };

    defaults.country =
      stringValue(
        defaults.country,
      );

    defaults.province =
      stringValue(
        defaults.province,
      );

    defaults.district =
      stringValue(
        defaults.district,
      );

    defaults.city =
      stringValue(
        defaults.city,
      );

    defaults.area =
      stringValue(
        defaults.area,
      );

    defaults.street =
      stringValue(
        defaults.street,
      );

    defaults.landmark =
      stringValue(
        defaults.landmark,
      );

    defaults.address =
      stringValue(
        defaults.address,
      );

    defaults.parent_id =
      numberOrNull(
        defaults.parent_id,
      );

    if (
      defaults.type ===
        "sub_branch_zone" &&
      !defaults.coverage_radius_km
    ) {
      defaults.coverage_radius_km = 3;
    }

    form.setFieldsValue(
      defaults,
    );
  }, [
    form,
    initialValues,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Map                                                                    */
  /* ---------------------------------------------------------------------- */

  function handleMapChange(
    location,
  ) {
    if (!location) {
      return;
    }

    form.setFieldsValue({
      latitude:
        location.latitude !==
          null &&
        location.latitude !==
          undefined
          ? Number(
              location.latitude,
            )
          : form.getFieldValue(
              "latitude",
            ),

      longitude:
        location.longitude !==
          null &&
        location.longitude !==
          undefined
          ? Number(
              location.longitude,
            )
          : form.getFieldValue(
              "longitude",
            ),

      address: stringValue(
        location.address ??
          form.getFieldValue(
            "address",
          ),
      ),

      province: stringValue(
        location.province ??
          form.getFieldValue(
            "province",
          ),
      ),

      district: stringValue(
        location.district ??
          form.getFieldValue(
            "district",
          ),
      ),

      city: stringValue(
        location.city ??
          form.getFieldValue(
            "city",
          ),
      ),

      area: stringValue(
        location.area ??
          form.getFieldValue(
            "area",
          ),
      ),

      street: stringValue(
        location.street ??
          form.getFieldValue(
            "street",
          ),
      ),

      landmark: stringValue(
        location.landmark ??
          form.getFieldValue(
            "landmark",
          ),
      ),
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Submit                                                                 */
  /* ---------------------------------------------------------------------- */

  async function handleSubmit() {
    const values =
      await form.validateFields();

    const normalizedType =
      values.type ||
      "main_branch_zone";

    const parentId =
      numberOrNull(
        values.parent_id,
      );

    /**
     * Main branch cannot have parent.
     */
    if (
      normalizedType ===
      "main_branch_zone"
    ) {
      values.parent_id = null;
    }

    /**
     * Sub branch MUST have parent.
     */
    if (
      normalizedType ===
        "sub_branch_zone" &&
      !parentId
    ) {
      form.setFields([
        {
          name: "parent_id",
          errors: [
            "Select parent main branch allocation.",
          ],
        },
      ]);

      return;
    }

    const payload = {
      ...values,

      type: normalizedType,

      parent_id:
        normalizedType ===
        "sub_branch_zone"
          ? parentId
          : null,

      country: stringValue(
        values.country,
      ),

      province: stringValue(
        values.province,
      ),

      district: stringValue(
        values.district,
      ),

      city: stringValue(
        values.city,
      ),

      area: stringValue(
        values.area,
      ),

      street: stringValue(
        values.street,
      ),

      landmark: stringValue(
        values.landmark,
      ),

      address: stringValue(
        values.address,
      ),

      latitude:
        Number(values.latitude),

      longitude:
        Number(values.longitude),

      coverage_radius_km:
        Number(
          values.coverage_radius_km,
        ),

      code:
        values.code ||
        makeCoverageCode(
          values.name,
          normalizedType,
        ),
    };

    await onSubmit(payload);
  }

  /* ---------------------------------------------------------------------- */
  /* Location details                                                       */
  /* ---------------------------------------------------------------------- */

  const locationDetails = [
    {
      label: "Province",
      value: province,
    },
    {
      label: "District",
      value: district,
    },
    {
      label: "City",
      value: city,
    },
    {
      label: "Area",
      value: area,
    },
    {
      label: "Street",
      value: street,
    },
    {
      label: "Landmark",
      value: landmark,
    },
    {
      label: "Address",
      value: address,
      span: 2,
    },
  ];

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={10}>
        <Card>
          <Form
            form={form}
            layout="vertical"
          >
            {/* Hidden fields */}

            <Form.Item
              name="type"
              hidden
            >
              <Input />
            </Form.Item>

            <Form.Item
              name="is_hq_managed"
              hidden
            >
              <Input />
            </Form.Item>

            <Form.Item
              name="country"
              hidden
            >
              <Input />
            </Form.Item>

            <Form.Item
              name="status"
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
              name="landmark"
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

            {/* Allocation type */}

            <div
              style={{
                marginBottom: 16,
              }}
            >
              <Text type="secondary">
                Allocation Type
              </Text>

              <div
                style={{
                  marginTop: 4,
                }}
              >
                <Tag
                  color={
                    isSub
                      ? "green"
                      : "blue"
                  }
                >
                  {isSub
                    ? "Sub-Branch Zone"
                    : "Main Branch Zone"}
                </Tag>
              </div>
            </div>

            {/* Parent */}

            {isSub && (
              <Form.Item
                label="Parent Main Branch Allocation"
                name="parent_id"
                rules={[
                  {
                    required: true,
                    message:
                      "Select parent main branch allocation.",
                  },
                ]}
              >
                <Select
                  showSearch
                  placeholder="Select parent main branch allocation"
                  optionFilterProp="label"
                  options={mainZones.map(
                    (item) => ({
                      value: item.id,
                      label: `${item.name} (${item.code})`,
                    }),
                  )}
                />
              </Form.Item>
            )}

            {/* Name / Code */}

            <Row gutter={12}>
              <Col
                xs={24}
                md={12}
              >
                <Form.Item
                  label={
                    isSub
                      ? "Sub-Branch Allocation Name"
                      : "Main Branch Allocation Name"
                  }
                  name="name"
                  rules={[
                    {
                      required: true,
                      message:
                        "Enter allocation name.",
                    },
                  ]}
                >
                  <Input
                    placeholder={
                      isSub
                        ? "Thamel Sub-Branch Zone"
                        : "Pokhara Main Branch Zone"
                    }
                  />
                </Form.Item>
              </Col>

              <Col
                xs={24}
                md={12}
              >
                <Form.Item
                  label="Code"
                  name="code"
                  extra={
                    mode === "create"
                      ? codePreview
                        ? `Will be saved as: ${codePreview}`
                        : "Auto-generated from name."
                      : "Code cannot be changed after creation."
                  }
                >
                  <Input
                    disabled
                    placeholder={
                      mode === "create"
                        ? "Type name to preview"
                        : ""
                    }
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Coordinates */}

            <Row gutter={12}>
              <Col
                xs={24}
                md={12}
              >
                <Form.Item
                  label="Latitude"
                  name="latitude"
                  rules={[
                    {
                      required: true,
                      message:
                        "Click the map to pin a location.",
                    },
                  ]}
                >
                  <InputNumber
                    style={{
                      width: "100%",
                    }}
                    stringMode
                    precision={7}
                    readOnly
                  />
                </Form.Item>
              </Col>

              <Col
                xs={24}
                md={12}
              >
                <Form.Item
                  label="Longitude"
                  name="longitude"
                  rules={[
                    {
                      required: true,
                      message:
                        "Click the map to pin a location.",
                    },
                  ]}
                >
                  <InputNumber
                    style={{
                      width: "100%",
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
              label="Coverage Radius (km)"
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
                  width: "100%",
                }}
              />
            </Form.Item>

            {/* Location Details */}

            {hasCoords && (
              <Card
                size="small"
                style={{
                  background:
                    "#f0f9ff",
                  border:
                    "1px solid #bae6fd",
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                <Space
                  style={{
                    marginBottom: 8,
                  }}
                >
                  <EnvironmentOutlined />

                  <Text strong>
                    Pinned Location
                    Details
                  </Text>
                </Space>

                <Descriptions
                  size="small"
                  column={2}
                  items={locationDetails.map(
                    ({
                      label,
                      value,
                      span,
                    }) => ({
                      key: label,
                      label,
                      span:
                        span || 1,
                      children:
                        value || (
                          <Text type="secondary">
                            —
                          </Text>
                        ),
                    }),
                  )}
                />
              </Card>
            )}

            {/* Buttons */}

            <Space
              style={{
                width: "100%",
                justifyContent:
                  "flex-end",
              }}
            >
              <Button
                onClick={onCancel}
              >
                Cancel
              </Button>

              <Button
                type="primary"
                icon={
                  <SaveOutlined />
                }
                loading={loading}
                onClick={
                  handleSubmit
                }
              >
                {mode === "edit"
                  ? "Update Allocation"
                  : "Save Allocation"}
              </Button>
            </Space>
          </Form>
        </Card>
      </Col>

      {/* MAP */}

      <Col xs={24} xl={14}>
        <Card
          title={
            <Space>
              <EnvironmentOutlined />

              <span>
                Map Radius Allocation
              </span>
            </Space>
          }
          styles={{
            body: {
              padding: 16,
            },
          }}
        >
          <Alert
            type="info"
            showIcon
            style={{
              marginBottom: 12,
            }}
            message="Click the map to pin the coverage point"
            description="Coordinates and location details will be resolved automatically from the selected point."
          />

          <CoverageRadiusMap
            value={mapValue}
            radiusKm={
              Number(radius) || 10
            }
            existingLocations={
              existingLocations
            }
            existingBranches={
              existingBranches
            }
            showExisting
            showBranches
            showSearch
            clickable
            height={520}
            onChange={
              handleMapChange
            }
          />
        </Card>
      </Col>
    </Row>
  );
}