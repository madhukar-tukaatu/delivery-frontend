"use client";

import { useEffect, useMemo, useState } from "react";
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
  Switch,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import {
  EnvironmentOutlined,
  FileTextOutlined,
  SaveOutlined,
  UploadOutlined,
} from "@ant-design/icons";

const CoverageRadiusMap = dynamic(
  () => import("@/components/maps/CoverageRadiusMap"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 420,
          background: "#ffffff",
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

const { Text, Title } = Typography;

const BRANCH_TYPE_OPTIONS = [
  { value: "franchise_branch", label: "Franchise / Main Branch" },
  { value: "sub_branch", label: "Sub-Branch" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
  { value: "closed", label: "Closed" },
];

const OPERATING_DAY_OPTIONS = [
  { value: "sunday", label: "Sunday" },
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
];

const DOCUMENT_TYPE_OPTIONS = [
  {
    value: "pan_vat_certificate",
    label: "PAN / VAT Certificate",
    requiredFor: ["franchise_branch"],
  },
  {
    value: "company_registration",
    label: "Company Registration Certificate",
    requiredFor: ["franchise_branch"],
  },
  {
    value: "owner_id",
    label: "Owner Citizenship / ID",
    requiredFor: ["franchise_branch"],
  },
  {
    value: "agreement",
    label: "Franchise / Branch Agreement",
    requiredFor: ["franchise_branch", "sub_branch"],
  },
  {
    value: "office_photo",
    label: "Office / Pickup Location Photo",
    requiredFor: ["franchise_branch", "sub_branch"],
  },
  {
    value: "other",
    label: "Other Supporting Document",
    requiredFor: [],
  },
];

function isMainBranch(type) {
  return type === "franchise_branch";
}

function makeCode(name, type) {
  const prefix = type === "franchise_branch" ? "FR" : "SUB";

  return (
    prefix +
    "-" +
    String(name || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

function getRequiredDocumentTypes(type) {
  return DOCUMENT_TYPE_OPTIONS.filter((item) =>
    item.requiredFor.includes(type)
  ).map((item) => item.value);
}

function documentLabel(type) {
  return (
    DOCUMENT_TYPE_OPTIONS.find((item) => item.value === type)?.label || type
  );
}

function makeDocumentRow(documentType, required = false) {
  return {
    uid: `${Date.now()}-${documentType}-${Math.random()}`,
    document_type: documentType,
    title: documentLabel(documentType),
    notes: "",
    file: null,
    fileList: [],
    required,
  };
}

export default function BranchAssignmentForm({
  mode = "create",
  initialValues,
  parentOptions = [],
  coverageLocations = [],
  existingBranches = [],
  loading = false,
  onTypeChange,
  onSubmit,
  onCancel,
}) {
  const [form] = Form.useForm();
  const [manualAssignedAddress, setManualAssignedAddress] = useState(false);
  const [documents, setDocuments] = useState([]);

  const type = Form.useWatch("type", form);
  const coverageLocationId = Form.useWatch("coverage_location_id", form);
  const officeLatitude = Form.useWatch("office_latitude", form);
  const officeLongitude = Form.useWatch("office_longitude", form);

  const selectedCoverageLocation = useMemo(() => {
    return coverageLocations.find(
      (item) => Number(item.id) === Number(coverageLocationId)
    );
  }, [coverageLocations, coverageLocationId]);

  const filteredCoverageLocations = useMemo(() => {
    if (isMainBranch(type)) {
      return coverageLocations.filter(
        (item) => item.type === "main_branch_zone"
      );
    }

    return coverageLocations.filter(
      (item) => item.type === "sub_branch_zone"
    );
  }, [coverageLocations, type]);

  const officeMapValue = useMemo(
    () => ({
      latitude: officeLatitude,
      longitude: officeLongitude,
    }),
    [officeLatitude, officeLongitude]
  );

  function syncRequiredDocuments(nextType) {
    const requiredTypes = getRequiredDocumentTypes(nextType);

    setDocuments((prev) => {
      const keptRows = prev.filter(
        (item) => !item.required || requiredTypes.includes(item.document_type)
      );

      const normalizedRows = keptRows.map((item) => {
        if (requiredTypes.includes(item.document_type)) {
          return {
            ...item,
            required: true,
            title: item.title || documentLabel(item.document_type),
          };
        }

        return item;
      });

      const existingTypes = normalizedRows.map((item) => item.document_type);

      const missingRows = requiredTypes
        .filter((documentType) => !existingTypes.includes(documentType))
        .map((documentType) => makeDocumentRow(documentType, true));

      return [...normalizedRows, ...missingRows];
    });
  }

  useEffect(() => {
    const values = {
      type: "franchise_branch",
      status: "active",
      country: "Nepal",
      province: "Bagmati",
      district: "Kathmandu",
      pickup_enabled: true,
      delivery_enabled: true,
      pod_enabled: true,
      return_enabled: true,
      operating_days: [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
      ],
      ...initialValues,
    };

    form.setFieldsValue(values);
    syncRequiredDocuments(values.type);
  }, [form, initialValues]);

  function addDocumentRow(documentType = "other") {
    setDocuments((prev) => [...prev, makeDocumentRow(documentType, false)]);
  }

  function removeDocumentRow(uid) {
    setDocuments((prev) => prev.filter((item) => item.uid !== uid));
  }

  function updateDocumentRow(uid, changes) {
    setDocuments((prev) =>
      prev.map((item) =>
        item.uid === uid
          ? {
              ...item,
              ...changes,
            }
          : item
      )
    );
  }

  function onOfficeMapChange(location) {
    form.setFieldsValue({
      office_latitude:
        location.latitude ?? form.getFieldValue("office_latitude"),
      office_longitude:
        location.longitude ?? form.getFieldValue("office_longitude"),
      office_address:
        location.address || form.getFieldValue("office_address"),
      office_city: location.city || form.getFieldValue("office_city"),
      office_area: location.area || form.getFieldValue("office_area"),
      office_street: location.street || form.getFieldValue("office_street"),
      office_landmark:
        location.landmark || form.getFieldValue("office_landmark"),
    });
  }

  function applyCoverageAddressToBranch() {
    if (!selectedCoverageLocation) return;

    form.setFieldsValue({
      country: selectedCoverageLocation.country || "Nepal",
      province: selectedCoverageLocation.province,
      district: selectedCoverageLocation.district,
      city: selectedCoverageLocation.city,
      area: selectedCoverageLocation.area,
      address: selectedCoverageLocation.address,
      landmark: selectedCoverageLocation.landmark,
    });
  }

  async function handleSubmit() {
    try {
      const values = await form.validateFields();

      const requiredTypes = getRequiredDocumentTypes(values.type);

      const missingDocuments = requiredTypes.filter((documentType) => {
        const match = documents.find(
          (item) => item.document_type === documentType
        );

        return !match?.file && mode === "create";
      });

      if (missingDocuments.length) {
        message.error(
          `Please upload required documents: ${missingDocuments
            .map(documentLabel)
            .join(", ")}`
        );
        return;
      }

      const payload = {
        ...values,
        code: values.code || makeCode(values.name, values.type),
        documents: documents
          .filter((item) => item.file)
          .map((item) => ({
            document_type: item.document_type,
            title: item.title,
            notes: item.notes,
            file: item.file,
          })),
      };

      if (isMainBranch(payload.type)) {
        payload.parent_id = null;
      }

      await onSubmit(payload);
    } catch (error) {
      if (error?.errorFields) return;

      message.error(error?.message || "Please check the form.");
    }
  }

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={10}>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Card>
            <Space direction="vertical" size={4}>
              <Title level={4} style={{ margin: 0 }}>
                Branch Assignment Form
              </Title>

              <Text type="secondary">
                Assign a franchise/main branch or sub-branch to a service
                allocation. Pickup and delivery use the physical office location.
              </Text>
            </Space>
          </Card>

          <Card title="1. Assignment Setup">
            <Form form={form} layout="vertical">
              <Form.Item
                label="Branch Type"
                name="type"
                rules={[{ required: true, message: "Branch type is required." }]}
              >
                <Select
                  disabled={mode === "edit"}
                  options={BRANCH_TYPE_OPTIONS}
                  onChange={(nextType) => {
                    if (typeof onTypeChange === "function") {
                      onTypeChange(nextType);
                    }

                    syncRequiredDocuments(nextType);

                    if (nextType === "franchise_branch") {
                      form.setFieldsValue({
                        parent_id: null,
                        coverage_location_id: null,
                      });
                    } else {
                      form.setFieldsValue({
                        coverage_location_id: null,
                      });
                    }
                  }}
                />
              </Form.Item>

              {!isMainBranch(type) && (
                <Form.Item
                  label="Parent Franchise / Main Branch"
                  name="parent_id"
                  rules={[
                    {
                      required: true,
                      message: "Parent franchise/main branch is required.",
                    },
                  ]}
                >
                  <Select
                    showSearch
                    placeholder="Select parent franchise/main branch"
                    optionFilterProp="label"
                    options={parentOptions.map((item) => ({
                      value: item.id,
                      label:
                        item.label ||
                        `${item.name} (${item.code || item.type})`,
                    }))}
                  />
                </Form.Item>
              )}

              <Form.Item
                label={
                  isMainBranch(type)
                    ? "Assigned Main Branch Allocation"
                    : "Assigned Sub-Branch Allocation"
                }
                name="coverage_location_id"
                rules={[
                  {
                    required: true,
                    message: "Assigned allocation is required.",
                  },
                ]}
              >
                <Select
                  showSearch
                  placeholder="Select assigned allocation"
                  optionFilterProp="label"
                  options={filteredCoverageLocations.map((item) => ({
                    value: item.id,
                    label: `${item.name} (${item.code})`,
                  }))}
                />
              </Form.Item>

              {selectedCoverageLocation && (
                <Card
                  size="small"
                  style={{
                    background: "#fafafa",
                    border: "1px solid #e5e7eb",
                    marginBottom: 16,
                  }}
                >
                  <Descriptions
                    size="small"
                    column={1}
                    items={[
                      {
                        key: "allocation_type",
                        label: "Allocation Type",
                        children:
                          selectedCoverageLocation.type === "main_branch_zone"
                            ? "Main Branch Allocation"
                            : "Sub-Branch Allocation",
                      },
                      {
                        key: "radius",
                        label: "Coverage Radius",
                        children: `${selectedCoverageLocation.coverage_radius_km} km`,
                      },
                      {
                        key: "point",
                        label: "Allocation Latitude / Longitude",
                        children: `${selectedCoverageLocation.latitude}, ${selectedCoverageLocation.longitude}`,
                      },
                      {
                        key: "area",
                        label: "Area",
                        children: `${selectedCoverageLocation.city || "-"} / ${
                          selectedCoverageLocation.area || "-"
                        }`,
                      },
                    ]}
                  />

                  <Button
                    size="small"
                    style={{ marginTop: 12 }}
                    onClick={applyCoverageAddressToBranch}
                  >
                    Use allocation address for branch
                  </Button>
                </Card>
              )}

              <Divider orientation="left">2. Business Details</Divider>

              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Branch / Franchise Name"
                    name="name"
                    rules={[{ required: true, message: "Name is required." }]}
                  >
                    <Input placeholder="Example: Pokhara Franchise Branch" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Code" name="code">
                    <Input placeholder="Auto or custom code" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="Legal Business Name"
                name="legal_name"
                rules={[
                  {
                    required: isMainBranch(type),
                    message: "Legal business name is required for franchise.",
                  },
                ]}
              >
                <Input placeholder="Registered business name" />
              </Form.Item>

              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Owner Name"
                    name="owner_name"
                    rules={[
                      {
                        required: isMainBranch(type),
                        message: "Owner name is required for franchise.",
                      },
                    ]}
                  >
                    <Input placeholder="Owner full name" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Contact Person" name="contact_person">
                    <Input placeholder="Contact person" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Email"
                    name="email"
                    rules={[{ type: "email", message: "Enter valid email." }]}
                  >
                    <Input placeholder="branch@example.com" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label="Primary Phone"
                    name="phone"
                    rules={[
                      {
                        required: true,
                        message: "Primary phone is required.",
                      },
                    ]}
                  >
                    <Input placeholder="98XXXXXXXX" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item label="Alternative Phone" name="alternative_phone">
                    <Input placeholder="Optional" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Business Type" name="business_type">
                    <Input placeholder="Courier franchise / branch office" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="PAN / VAT Number"
                    name="pan_vat_number"
                    rules={[
                      {
                        required: isMainBranch(type),
                        message: "PAN/VAT is required for franchise branch.",
                      },
                    ]}
                  >
                    <Input placeholder="PAN / VAT number" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label="Registration Number"
                    name="registration_number"
                  >
                    <Input placeholder="Optional registration number" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Status" name="status">
                <Select options={STATUS_OPTIONS} />
              </Form.Item>

              <Divider orientation="left">
                3. Assigned Service Area Address
              </Divider>

              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="Assigned address is normally copied from selected allocation."
                description="This is the service area/address. The physical pickup and delivery point is selected below."
              />

              <Form.Item>
                <Switch
                  checked={manualAssignedAddress}
                  onChange={setManualAssignedAddress}
                />{" "}
                <Text>Manually edit assigned branch address</Text>
              </Form.Item>

              {manualAssignedAddress && (
                <>
                  <Row gutter={12}>
                    <Col xs={24} md={12}>
                      <Form.Item label="Country" name="country">
                        <Input />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item label="Province" name="province">
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={12}>
                    <Col xs={24} md={12}>
                      <Form.Item label="District" name="district">
                        <Input />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item label="City" name="city">
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={12}>
                    <Col xs={24} md={12}>
                      <Form.Item label="Area" name="area">
                        <Input />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item label="Landmark" name="landmark">
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item label="Address" name="address">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </>
              )}

              <Divider orientation="left">4. Operation Settings</Divider>

              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item label="Opening Time" name="opening_time">
                    <Input type="time" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Closing Time" name="closing_time">
                    <Input type="time" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Operating Days" name="operating_days">
                <Select
                  mode="multiple"
                  allowClear
                  options={OPERATING_DAY_OPTIONS}
                />
              </Form.Item>

              <Form.Item label="Covered Areas" name="covered_areas">
                <Select
                  mode="tags"
                  allowClear
                  placeholder="Add areas covered by this branch"
                />
              </Form.Item>

              <Form.Item
                label="Daily Shipment Capacity"
                name="daily_shipment_capacity"
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>

              <Row gutter={12}>
                <Col xs={12} md={6}>
                  <Form.Item
                    label="Pickup"
                    name="pickup_enabled"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>

                <Col xs={12} md={6}>
                  <Form.Item
                    label="Delivery"
                    name="delivery_enabled"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>

                <Col xs={12} md={6}>
                  <Form.Item
                    label="POD"
                    name="pod_enabled"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>

                <Col xs={12} md={6}>
                  <Form.Item
                    label="Return"
                    name="return_enabled"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">
                5. Physical Office / Pickup Location
              </Divider>

              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message="Pickup and delivery will use this physical office location."
                description="This latitude and longitude is stored as office_latitude and office_longitude."
              />

              <Form.Item
                label="Office / Pickup Address"
                name="office_address"
                rules={[
                  {
                    required: true,
                    message: "Physical office address is required.",
                  },
                ]}
              >
                <Input.TextArea rows={2} />
              </Form.Item>

              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item label="Office City" name="office_city">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Office Area" name="office_area">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item label="Office Street" name="office_street">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Office Landmark" name="office_landmark">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Office / Pickup Latitude"
                    name="office_latitude"
                    rules={[
                      {
                        required: true,
                        message: "Latitude is required.",
                      },
                    ]}
                  >
                    <InputNumber style={{ width: "100%" }} stringMode />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label="Office / Pickup Longitude"
                    name="office_longitude"
                    rules={[
                      {
                        required: true,
                        message: "Longitude is required.",
                      },
                    ]}
                  >
                    <InputNumber style={{ width: "100%" }} stringMode />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">
                6. Required Documents Upload
              </Divider>

              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="Upload branch documents before saving."
                description="Franchise/main branch needs PAN/VAT, company registration, owner ID, agreement, and office photo. Sub-branch needs agreement and office photo."
              />

              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                {documents.map((document) => (
                  <Card
                    key={document.uid}
                    size="small"
                    title={
                      <Space>
                        <FileTextOutlined />
                        <span>{documentLabel(document.document_type)}</span>
                        {document.required && <Tag color="red">Required</Tag>}
                      </Space>
                    }
                    extra={
                      !document.required && (
                        <Button
                          danger
                          size="small"
                          onClick={() => removeDocumentRow(document.uid)}
                        >
                          Remove
                        </Button>
                      )
                    }
                    style={{
                      background: "#fafafa",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <Row gutter={[12, 12]}>
                      <Col xs={24} md={8}>
                        <Text type="secondary">Document Type</Text>

                        <Select
                          style={{ width: "100%", marginTop: 6 }}
                          value={document.document_type}
                          disabled={document.required}
                          options={DOCUMENT_TYPE_OPTIONS.map((item) => ({
                            value: item.value,
                            label: item.label,
                          }))}
                          onChange={(value) =>
                            updateDocumentRow(document.uid, {
                              document_type: value,
                              title: document.title || documentLabel(value),
                            })
                          }
                        />
                      </Col>

                      <Col xs={24} md={8}>
                        <Text type="secondary">Document Title</Text>

                        <Input
                          style={{ marginTop: 6 }}
                          value={document.title}
                          placeholder="Document title"
                          onChange={(event) =>
                            updateDocumentRow(document.uid, {
                              title: event.target.value,
                            })
                          }
                        />
                      </Col>

                      <Col xs={24} md={8}>
                        <Text type="secondary">File</Text>

                        <div style={{ marginTop: 6 }}>
                          <Upload
                            beforeUpload={() => false}
                            maxCount={1}
                            fileList={document.fileList}
                            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                            onChange={({ fileList }) => {
                              const nextFileList = fileList.slice(-1);

                              updateDocumentRow(document.uid, {
                                fileList: nextFileList,
                                file:
                                  nextFileList?.[0]?.originFileObj || null,
                              });
                            }}
                          >
                            <Button icon={<UploadOutlined />}>
                              Select File
                            </Button>
                          </Upload>
                        </div>
                      </Col>

                      <Col xs={24}>
                        <Text type="secondary">Notes</Text>

                        <Input.TextArea
                          rows={2}
                          style={{ marginTop: 6 }}
                          value={document.notes}
                          placeholder="Optional notes"
                          onChange={(event) =>
                            updateDocumentRow(document.uid, {
                              notes: event.target.value,
                            })
                          }
                        />
                      </Col>
                    </Row>
                  </Card>
                ))}

                <Button onClick={() => addDocumentRow("other")}>
                  Add Other Document
                </Button>
              </Space>

              <Divider />

              <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                <Button onClick={onCancel}>Cancel</Button>

                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={loading}
                  onClick={handleSubmit}
                >
                  {mode === "edit" ? "Update Branch" : "Save Branch"}
                </Button>
              </Space>
            </Form>
          </Card>
        </Space>
      </Col>

      <Col xs={24} xl={14}>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Card
            title={
              <Space>
                <EnvironmentOutlined />
                <span>Physical Office / Pickup Location</span>
              </Space>
            }
          >
            <CoverageRadiusMap
              value={officeMapValue}
              radiusKm={0.5}
              showExisting={false}
              showBranches={false}
              onChange={onOfficeMapChange}
            />
          </Card>

          <Card title="Assigned Allocation Preview">
            <CoverageRadiusMap
              value={
                selectedCoverageLocation
                  ? {
                      latitude: selectedCoverageLocation.latitude,
                      longitude: selectedCoverageLocation.longitude,
                    }
                  : {}
              }
              radiusKm={selectedCoverageLocation?.coverage_radius_km || 5}
              existingLocations={
                selectedCoverageLocation ? [selectedCoverageLocation] : []
              }
              existingBranches={existingBranches}
              showBranches={false}
              height={360}
              clickable={false}
              showSearch={false}
              onChange={() => {}}
            />
          </Card>
        </Space>
      </Col>
    </Row>
  );
}