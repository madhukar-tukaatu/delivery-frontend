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
  BankOutlined,
  CheckCircleFilled,
  EnvironmentOutlined,
  FileTextOutlined,
  PlusOutlined,
  SaveOutlined,
  ShopOutlined,
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
          background: "#f8fafc",
          border: "1px dashed #cbd5e1",
          borderRadius: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#64748b",
          fontWeight: 500,
        }}
      >
        Loading map...
      </div>
    ),
  },
);

const { Text, Title } = Typography;

const BRANCH_TYPE_OPTIONS = [
  {
    value: "franchise_branch",
    label: "Franchise / Main Branch",
  },
  {
    value: "sub_branch",
    label: "Sub-Branch",
  },
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
    requiredFor: [],
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

const pageStyles = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    padding: "20px",
  },

  headerCard: {
    borderRadius: 20,
    border: "1px solid #e6ebf1",
    boxShadow: "0 8px 30px rgba(15, 23, 42, 0.06)",
    overflow: "hidden",
  },

  mainCard: {
    borderRadius: 20,
    border: "1px solid #e6ebf1",
    boxShadow: "0 8px 30px rgba(15, 23, 42, 0.05)",
    overflow: "hidden",
  },

  mapCard: {
    borderRadius: 20,
    border: "1px solid #e6ebf1",
    boxShadow: "0 8px 30px rgba(15, 23, 42, 0.05)",
    overflow: "hidden",
  },

  section: {
    border: "1px solid #e8edf3",
    borderRadius: 18,
    padding: 18,
    background: "#ffffff",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 20,
  },

  sectionNumber: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: "#eef4ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
  },

  infoPanel: {
    background: "linear-gradient(135deg, #f8fbff 0%, #f4f8ff 100%)",
    border: "1px solid #dbe8ff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },

  serviceCard: {
    height: "100%",
    border: "1px solid #e5eaf0",
    borderRadius: 14,
    padding: "14px 14px 10px",
    background: "#fbfcfe",
  },

  documentCard: {
    background: "#fbfcfe",
    border: "1px solid #e5eaf0",
    borderRadius: 16,
    overflow: "hidden",
  },

  actionBar: {
    position: "sticky",
    bottom: 12,
    zIndex: 10,
    border: "1px solid #e5eaf0",
    borderRadius: 16,
    padding: 12,
    background: "rgba(255,255,255,0.94)",
    backdropFilter: "blur(12px)",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.10)",
  },

  input: {
    borderRadius: 10,
  },
};

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
    item.requiredFor.includes(type),
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

function SectionHeader({ number, title, description, icon }) {
  return (
    <div style={pageStyles.sectionHeader}>
      <div style={pageStyles.sectionNumber}>{number}</div>

      <div style={{ flex: 1 }}>
        <Space size={8} align="center">
          {icon}

          <Title
            level={5}
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: 16,
            }}
          >
            {title}
          </Title>
        </Space>

        {description && (
          <Text
            type="secondary"
            style={{
              display: "block",
              marginTop: 4,
              lineHeight: 1.6,
            }}
          >
            {description}
          </Text>
        )}
      </div>
    </div>
  );
}

function ServiceSwitchCard({ label, name, description }) {
  return (
    <div style={pageStyles.serviceCard}>
      <Form.Item
        name={name}
        valuePropName="checked"
        style={{ marginBottom: 0 }}
      >
        <Switch />
      </Form.Item>

      <Text
        strong
        style={{
          display: "block",
          marginTop: 10,
          color: "#0f172a",
        }}
      >
        {label}
      </Text>

      <Text
        type="secondary"
        style={{
          display: "block",
          marginTop: 3,
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        {description}
      </Text>
    </div>
  );
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
      (item) => Number(item.id) === Number(coverageLocationId),
    );
  }, [coverageLocations, coverageLocationId]);

  const filteredCoverageLocations = useMemo(() => {
    if (isMainBranch(type)) {
      return coverageLocations.filter(
        (item) => item.type === "main_branch_zone",
      );
    }

    return coverageLocations.filter((item) => item.type === "sub_branch_zone");
  }, [coverageLocations, type]);

  const officeMapValue = useMemo(
    () => ({
      latitude: officeLatitude,
      longitude: officeLongitude,
    }),
    [officeLatitude, officeLongitude],
  );

  function syncRequiredDocuments(nextType) {
    const requiredTypes = getRequiredDocumentTypes(nextType);

    setDocuments((previousDocuments) => {
      const keptRows = previousDocuments.filter(
        (item) => !item.required || requiredTypes.includes(item.document_type),
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

      const hasCompanyRegistration = normalizedRows.some(
        (item) => item.document_type === "company_registration",
      );

      const companyRegistrationRow = hasCompanyRegistration
        ? []
        : [makeDocumentRow("company_registration", false)];

      return [...normalizedRows, ...missingRows, ...companyRegistrationRow];
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
    setDocuments((previousDocuments) => [
      ...previousDocuments,
      makeDocumentRow(documentType, false),
    ]);
  }

  function removeDocumentRow(uid) {
    setDocuments((previousDocuments) =>
      previousDocuments.filter((item) => item.uid !== uid),
    );
  }

  function updateDocumentRow(uid, changes) {
    setDocuments((previousDocuments) =>
      previousDocuments.map((item) =>
        item.uid === uid
          ? {
              ...item,
              ...changes,
            }
          : item,
      ),
    );
  }

  function onOfficeMapChange(location) {
    form.setFieldsValue({
      office_latitude:
        location.latitude ?? form.getFieldValue("office_latitude"),

      office_longitude:
        location.longitude ?? form.getFieldValue("office_longitude"),

      office_address: location.address || form.getFieldValue("office_address"),

      office_city: location.city || form.getFieldValue("office_city"),

      office_area: location.area || form.getFieldValue("office_area"),

      office_street: location.street || form.getFieldValue("office_street"),

      office_landmark:
        location.landmark || form.getFieldValue("office_landmark"),
    });
  }

  function applyCoverageAddressToBranch() {
    if (!selectedCoverageLocation) {
      return;
    }

    form.setFieldsValue({
      country: selectedCoverageLocation.country || "Nepal",
      province: selectedCoverageLocation.province,
      district: selectedCoverageLocation.district,
      city: selectedCoverageLocation.city,
      area: selectedCoverageLocation.area,
      address: selectedCoverageLocation.address,
      landmark: selectedCoverageLocation.landmark,
    });

    message.success("Allocation address applied successfully.");
  }

  async function handleSubmit() {
    try {
      const values = await form.validateFields();

      const requiredTypes = getRequiredDocumentTypes(values.type);

      const missingDocuments = requiredTypes.filter((documentType) => {
        const matchingDocument = documents.find(
          (item) => item.document_type === documentType,
        );

        return !matchingDocument?.file && mode === "create";
      });

      if (missingDocuments.length) {
        message.error(
          `Please upload required documents: ${missingDocuments
            .map(documentLabel)
            .join(", ")}`,
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
      if (error?.errorFields) {
        message.warning("Please complete the required fields.");
        return;
      }

      message.error(error?.message || "Please check the form.");
    }
  }

  return (
    <div style={pageStyles.page}>
      <Space
        direction="vertical"
        size={18}
        style={{
          width: "100%",
          maxWidth: 1600,
          margin: "0 auto",
        }}
      >
        <Card
          style={pageStyles.headerCard}
          styles={{
            body: {
              padding: "22px 24px",
              background: "linear-gradient(135deg, #ffffff 0%, #f4f8ff 100%)",
            },
          }}
        >
          <Row gutter={[16, 16]} align="middle">
            <Col flex="auto">
              <Space align="start" size={14}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    background: "#2563eb",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    boxShadow: "0 8px 20px rgba(37, 99, 235, 0.25)",
                  }}
                >
                  <ShopOutlined />
                </div>

                <div>
                  <Title
                    level={3}
                    style={{
                      margin: 0,
                      color: "#0f172a",
                    }}
                  >
                    {mode === "edit"
                      ? "Update Branch Assignment"
                      : "Create Branch Assignment"}
                  </Title>

                  <Text
                    type="secondary"
                    style={{
                      display: "block",
                      marginTop: 5,
                      lineHeight: 1.6,
                    }}
                  >
                    Configure business details, service allocation, office
                    location and supporting documents.
                  </Text>
                </div>
              </Space>
            </Col>

            <Col>
              <Tag
                icon={<CheckCircleFilled />}
                color="blue"
                style={{
                  borderRadius: 999,
                  padding: "5px 12px",
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                {isMainBranch(type) ? "Main Branch" : "Sub-Branch"}
              </Tag>
            </Col>
          </Row>
        </Card>

        <Form
          form={form}
          layout="vertical"
          requiredMark="optional"
          size="large"
        >
          <Row gutter={[18, 18]} align="top">
            <Col xs={24} xl={14}>
              <Space direction="vertical" size={18} style={{ width: "100%" }}>
                <Card
                  style={pageStyles.mainCard}
                  styles={{
                    body: {
                      padding: 20,
                    },
                  }}
                >
                  <Space
                    direction="vertical"
                    size={18}
                    style={{ width: "100%" }}
                  >
                    <div style={pageStyles.section}>
                      <SectionHeader
                        number="1"
                        icon={
                          <EnvironmentOutlined style={{ color: "#2563eb" }} />
                        }
                        title="Assignment Setup"
                        description="Select the service allocation assigned to this branch."
                      />

                      <Form.Item
                        label="Branch Type"
                        name="type"
                        hidden
                        rules={[
                          {
                            required: true,
                            message: "Branch type is required.",
                          },
                        ]}
                      >
                        <Select
                          disabled
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
                              message:
                                "Parent franchise/main branch is required.",
                            },
                          ]}
                        >
                          <Select
                            showSearch
                            placeholder="Select parent franchise/main branch"
                            optionFilterProp="label"
                            style={pageStyles.input}
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
                          allowClear
                          placeholder="Search and select an allocation"
                          optionFilterProp="label"
                          options={filteredCoverageLocations.map((item) => ({
                            value: item.id,
                            label: `${item.name} (${item.code})`,
                          }))}
                        />
                      </Form.Item>

                      {selectedCoverageLocation && (
                        <div
                          style={{
                            background: "#f8fbff",
                            border: "1px solid #dbe8ff",
                            borderRadius: 16,
                            padding: 16,
                            marginBottom: 20,
                          }}
                        >
                          <Row gutter={[16, 16]}>
                            <Col xs={24} sm={12}>
                              <Text
                                type="secondary"
                                style={{
                                  display: "block",
                                  marginBottom: 6,
                                  fontSize: 13,
                                }}
                              >
                                Allocation Type
                              </Text>

                              <Tag
                                color="blue"
                                style={{
                                  margin: 0,
                                  borderRadius: 6,
                                  padding: "3px 9px",
                                  whiteSpace: "normal",
                                }}
                              >
                                {selectedCoverageLocation.type ===
                                "main_branch_zone"
                                  ? "Main Branch Allocation"
                                  : "Sub-Branch Allocation"}
                              </Tag>
                            </Col>

                            <Col xs={24} sm={12}>
                              <Text
                                type="secondary"
                                style={{
                                  display: "block",
                                  marginBottom: 6,
                                  fontSize: 13,
                                }}
                              >
                                Coverage Radius
                              </Text>

                              <Text
                                strong
                                style={{
                                  display: "block",
                                  color: "#0f172a",
                                  fontSize: 14,
                                }}
                              >
                                {selectedCoverageLocation.coverage_radius_km ||
                                  0}{" "}
                                km
                              </Text>
                            </Col>

                            <Col xs={24}>
                              <Text
                                type="secondary"
                                style={{
                                  display: "block",
                                  marginBottom: 6,
                                  fontSize: 13,
                                }}
                              >
                                Coordinates
                              </Text>

                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 12,
                                  flexWrap: "wrap",
                                  background: "#ffffff",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: 10,
                                  padding: "10px 12px",
                                }}
                              >
                                <Text
                                  style={{
                                    color: "#334155",
                                    wordBreak: "break-word",
                                    minWidth: 0,
                                  }}
                                >
                                  {selectedCoverageLocation.latitude || "-"},{" "}
                                  {selectedCoverageLocation.longitude || "-"}
                                </Text>

                                <Button
                                  type="text"
                                  size="small"
                                  icon={<EnvironmentOutlined />}
                                  onClick={() => {
                                    navigator.clipboard?.writeText(
                                      `${selectedCoverageLocation.latitude}, ${selectedCoverageLocation.longitude}`,
                                    );

                                    message.success("Coordinates copied.");
                                  }}
                                >
                                  Copy
                                </Button>
                              </div>
                            </Col>

                            <Col xs={24}>
                              <Text
                                type="secondary"
                                style={{
                                  display: "block",
                                  marginBottom: 6,
                                  fontSize: 13,
                                }}
                              >
                                Service Area
                              </Text>

                              <Text
                                strong
                                style={{
                                  display: "block",
                                  color: "#0f172a",
                                  lineHeight: 1.5,
                                }}
                              >
                                {selectedCoverageLocation.city || "-"}
                                {selectedCoverageLocation.area
                                  ? ` / ${selectedCoverageLocation.area}`
                                  : ""}
                              </Text>
                            </Col>

                            <Col xs={24}>
                              <Button
                                block
                                icon={<EnvironmentOutlined />}
                                onClick={applyCoverageAddressToBranch}
                                style={{
                                  height: 40,
                                  borderRadius: 10,
                                  fontWeight: 500,
                                }}
                              >
                                Apply Allocation Address
                              </Button>
                            </Col>
                          </Row>
                        </div>
                      )}
                    </div>

                    <div style={pageStyles.section}>
                      <SectionHeader
                        number="2"
                        icon={<BankOutlined style={{ color: "#2563eb" }} />}
                        title="Business Details"
                        description="Enter the registered business and contact information."
                      />

                      <Row gutter={[14, 0]}>
                        <Col xs={24} style={{ display: "none" }}>
                          <Form.Item
                            label="Branch / Franchise Name"
                            name="name"
                          >
                            <Input placeholder="Example: Pokhara Franchise Branch" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12} style={{ display: "none" }}>
                          <Form.Item label="Code" name="code" hidden>
                            <Input disabled placeholder="Auto or custom code" />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Form.Item
                        label="Legal Business Name"
                        name="legal_name"
                        rules={[
                          {
                            required: isMainBranch(type),
                            message:
                              "Legal business name is required for franchise.",
                          },
                        ]}
                      >
                        <Input placeholder="Enter registered business name" />
                      </Form.Item>

                      <Row gutter={[14, 0]}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            label="Owner Name"
                            name="owner_name"
                            rules={[
                              {
                                required: isMainBranch(type),
                                message:
                                  "Owner name is required for franchise.",
                              },
                            ]}
                          >
                            <Input placeholder="Enter owner full name" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                          <Form.Item
                            label="Contact Person"
                            name="contact_person"
                          >
                            <Input placeholder="Enter contact person name" />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={[14, 0]}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            label="Email Address"
                            name="email"
                            rules={[
                              {
                                type: "email",
                                message: "Enter a valid email address.",
                              },
                            ]}
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

                      <Row gutter={[14, 0]}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            label="Alternative Phone"
                            name="alternative_phone"
                          >
                            <Input placeholder="Optional phone number" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12} style={{ display: "none" }}>
                          <Form.Item label="Business Type" name="business_type">
                            <Input placeholder="Courier franchise / branch office" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                          <Form.Item
                            label="PAN / VAT Number"
                            name="pan_vat_number"
                            rules={[
                              {
                                required: isMainBranch(type),
                                message:
                                  "PAN/VAT is required for franchise branch.",
                              },
                            ]}
                          >
                            <Input placeholder="Enter PAN / VAT number" />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Form.Item
                        label="Registration Number"
                        name="registration_number"
                      >
                        <Input placeholder="Enter registration number if available" />
                      </Form.Item>

                      <Form.Item label="Status" name="status" hidden>
                        <Select disabled options={STATUS_OPTIONS} />
                      </Form.Item>

                      <div style={{ display: "none" }}>
                        <Form.Item>
                          <Switch
                            checked={manualAssignedAddress}
                            onChange={setManualAssignedAddress}
                          />{" "}
                          <Text>Manually edit assigned branch address</Text>
                        </Form.Item>

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
                      </div>
                    </div>

                    <div style={pageStyles.section}>
                      <SectionHeader
                        number="3"
                        icon={<ShopOutlined style={{ color: "#2563eb" }} />}
                        title="Operation Settings"
                        description="Set operating hours, working days and enabled services."
                      />

                      <Row gutter={[14, 0]}>
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
                          placeholder="Select operating days"
                          options={OPERATING_DAY_OPTIONS}
                          maxTagCount="responsive"
                        />
                      </Form.Item>

                      <Form.Item
                        label="Covered Areas"
                        name="covered_areas"
                        hidden
                      >
                        <Select
                          mode="tags"
                          allowClear
                          placeholder="Add areas covered by this branch"
                        />
                      </Form.Item>

                      <Form.Item
                        label="Daily Shipment Capacity"
                        name="daily_shipment_capacity"
                        hidden
                      >
                        <InputNumber min={0} style={{ width: "100%" }} />
                      </Form.Item>

                      <Text
                        strong
                        style={{
                          display: "block",
                          marginBottom: 10,
                          color: "#334155",
                        }}
                      >
                        Enabled Services
                      </Text>

                      <Row gutter={[12, 12]}>
                        <Col xs={12} md={6}>
                          <ServiceSwitchCard
                            label="Pickup"
                            name="pickup_enabled"
                            description="Accept pickup requests."
                          />
                        </Col>

                        <Col xs={12} md={6}>
                          <ServiceSwitchCard
                            label="Delivery"
                            name="delivery_enabled"
                            description="Handle parcel delivery."
                          />
                        </Col>

                        <Col xs={12} md={6}>
                          <ServiceSwitchCard
                            label="POD"
                            name="pod_enabled"
                            description="Proof of delivery."
                          />
                        </Col>

                        <Col xs={12} md={6}>
                          <ServiceSwitchCard
                            label="Return"
                            name="return_enabled"
                            description="Process return parcels."
                          />
                        </Col>
                      </Row>
                    </div>

                    <div style={pageStyles.section}>
                      <SectionHeader
                        number="4"
                        icon={
                          <EnvironmentOutlined style={{ color: "#2563eb" }} />
                        }
                        title="Physical Office / Pickup Location"
                        description="This location will be used for pickups, delivery routing and branch operations."
                      />

                      <Alert
                        type="info"
                        showIcon
                        style={{
                          marginBottom: 18,
                          borderRadius: 12,
                          border: "1px solid #bfdbfe",
                          background: "#eff6ff",
                        }}
                        message="Select the exact physical office location"
                        description="You can enter the address manually or click on the map. Latitude and longitude will be stored automatically."
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
                        <Input.TextArea
                          rows={3}
                          placeholder="Enter complete office or pickup address"
                        />
                      </Form.Item>

                      <Row gutter={[14, 0]}>
                        <Col xs={24} md={12}>
                          <Form.Item label="Office City" name="office_city">
                            <Input placeholder="Enter city" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                          <Form.Item label="Office Area" name="office_area">
                            <Input placeholder="Enter area" />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={[14, 0]}>
                        <Col xs={24} md={12}>
                          <Form.Item label="Office Street" name="office_street">
                            <Input placeholder="Enter street name" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                          <Form.Item
                            label="Office Landmark"
                            name="office_landmark"
                          >
                            <Input placeholder="Nearby landmark" />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={[14, 0]}>
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
                            <InputNumber
                              style={{ width: "100%" }}
                              stringMode
                              placeholder="Example: 27.7172"
                            />
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
                            <InputNumber
                              style={{ width: "100%" }}
                              stringMode
                              placeholder="Example: 85.3240"
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    </div>

                    <div style={pageStyles.section}>
                      <SectionHeader
                        number="5"
                        icon={<FileTextOutlined style={{ color: "#2563eb" }} />}
                        title="Supporting Documents"
                        description="Upload the required branch documents. Company registration is visible but optional."
                      />

                      <Alert
                        type="warning"
                        showIcon
                        style={{
                          marginBottom: 18,
                          borderRadius: 12,
                        }}
                        message="Required documents must be uploaded before saving"
                        description={
                          isMainBranch(type)
                            ? "Required: PAN/VAT certificate, owner ID, agreement and office photo. Company registration certificate is optional."
                            : "Required: branch agreement and office photo. Company registration certificate is optional."
                        }
                      />

                      <Space
                        direction="vertical"
                        size={14}
                        style={{ width: "100%" }}
                      >
                        {documents.map((document) => {
                          const isCompanyRegistration =
                            document.document_type === "company_registration";

                          return (
                            <Card
                              key={document.uid}
                              size="small"
                              style={pageStyles.documentCard}
                              styles={{
                                header: {
                                  minHeight: 52,
                                  padding: "0 16px",
                                  background: isCompanyRegistration
                                    ? "#f8fbff"
                                    : "#ffffff",
                                },
                                body: {
                                  padding: 16,
                                },
                              }}
                              title={
                                <Space size={9} wrap>
                                  <div
                                    style={{
                                      width: 30,
                                      height: 30,
                                      borderRadius: 9,
                                      background: "#eef4ff",
                                      color: "#2563eb",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <FileTextOutlined />
                                  </div>

                                  <Text strong>
                                    {documentLabel(document.document_type)}
                                  </Text>

                                  {document.required ? (
                                    <Tag color="red">Required</Tag>
                                  ) : (
                                    <Tag color="default">Optional</Tag>
                                  )}
                                </Space>
                              }
                              extra={
                                !document.required &&
                                !isCompanyRegistration && (
                                  <Button
                                    danger
                                    type="text"
                                    size="small"
                                    onClick={() =>
                                      removeDocumentRow(document.uid)
                                    }
                                  >
                                    Remove
                                  </Button>
                                )
                              }
                            >
                              <Row gutter={[14, 14]} align="bottom">
                                <Col xs={24} md={8}>
                                  <Text
                                    type="secondary"
                                    style={{
                                      display: "block",
                                      marginBottom: 7,
                                      fontSize: 13,
                                    }}
                                  >
                                    Document Type
                                  </Text>

                                  <Select
                                    style={{ width: "100%" }}
                                    value={document.document_type}
                                    disabled={
                                      document.required || isCompanyRegistration
                                    }
                                    options={DOCUMENT_TYPE_OPTIONS.map(
                                      (item) => ({
                                        value: item.value,
                                        label: item.label,
                                      }),
                                    )}
                                    onChange={(value) =>
                                      updateDocumentRow(document.uid, {
                                        document_type: value,
                                        title:
                                          document.title ||
                                          documentLabel(value),
                                      })
                                    }
                                  />
                                </Col>

                                <Col xs={24} md={8}>
                                  <Text
                                    type="secondary"
                                    style={{
                                      display: "block",
                                      marginBottom: 7,
                                      fontSize: 13,
                                    }}
                                  >
                                    Document Title
                                  </Text>

                                  <Input
                                    value={document.title}
                                    placeholder="Enter document title"
                                    onChange={(event) =>
                                      updateDocumentRow(document.uid, {
                                        title: event.target.value,
                                      })
                                    }
                                  />
                                </Col>

                                <Col xs={24} md={8}>
                                  <Text
                                    type="secondary"
                                    style={{
                                      display: "block",
                                      marginBottom: 7,
                                      fontSize: 13,
                                    }}
                                  >
                                    Upload File
                                  </Text>

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
                                          nextFileList?.[0]?.originFileObj ||
                                          null,
                                      });
                                    }}
                                  >
                                    <Button block icon={<UploadOutlined />}>
                                      Select File
                                    </Button>
                                  </Upload>
                                </Col>

                                <Col xs={24}>
                                  <Text
                                    type="secondary"
                                    style={{
                                      display: "block",
                                      marginBottom: 7,
                                      fontSize: 13,
                                    }}
                                  >
                                    Notes
                                  </Text>

                                  <Input.TextArea
                                    rows={2}
                                    value={document.notes}
                                    placeholder="Add optional document notes"
                                    onChange={(event) =>
                                      updateDocumentRow(document.uid, {
                                        notes: event.target.value,
                                      })
                                    }
                                  />
                                </Col>
                              </Row>
                            </Card>
                          );
                        })}

                        <Button
                          type="dashed"
                          block
                          icon={<PlusOutlined />}
                          onClick={() => addDocumentRow("other")}
                          style={{
                            height: 46,
                            borderRadius: 12,
                          }}
                        >
                          Add Another Supporting Document
                        </Button>
                      </Space>
                    </div>
                  </Space>
                </Card>

                <div style={pageStyles.actionBar}>
                  <Row justify="space-between" align="middle" gutter={[12, 12]}>
                    <Col xs={24} sm="auto">
                      <Text type="secondary">
                        Review all required information before saving.
                      </Text>
                    </Col>

                    <Col xs={24} sm="auto">
                      <Space
                        style={{
                          width: "100%",
                          justifyContent: "flex-end",
                        }}
                      >
                        <Button onClick={onCancel}>Cancel</Button>

                        <Button
                          type="primary"
                          icon={<SaveOutlined />}
                          loading={loading}
                          onClick={handleSubmit}
                          style={{
                            minWidth: 150,
                            boxShadow: "0 8px 18px rgba(37, 99, 235, 0.22)",
                          }}
                        >
                          {mode === "edit" ? "Update Branch" : "Save Branch"}
                        </Button>
                      </Space>
                    </Col>
                  </Row>
                </div>
              </Space>
            </Col>

            <Col xs={24} xl={10}>
              <div
                style={{
                  position: "sticky",
                  top: 18,
                }}
              >
                <Space direction="vertical" size={18} style={{ width: "100%" }}>
                  <Card
                    style={pageStyles.mapCard}
                    styles={{
                      header: {
                        padding: "0 18px",
                        minHeight: 56,
                      },
                      body: {
                        padding: 14,
                      },
                    }}
                    title={
                      <Space>
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 9,
                            background: "#eef4ff",
                            color: "#2563eb",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <EnvironmentOutlined />
                        </div>

                        <span>Assigned Allocation Preview</span>
                      </Space>
                    }
                  >
                    {selectedCoverageLocation ? (
                      <>
                        <div
                          style={{
                            marginBottom: 12,
                            padding: "10px 12px",
                            borderRadius: 12,
                            background: "#f8fafc",
                            border: "1px solid #e5eaf0",
                          }}
                        >
                          <Text strong style={{ color: "#0f172a" }}>
                            {selectedCoverageLocation.name}
                          </Text>

                          <Text
                            type="secondary"
                            style={{
                              display: "block",
                              marginTop: 3,
                            }}
                          >
                            Radius:{" "}
                            {selectedCoverageLocation.coverage_radius_km} km
                          </Text>
                        </div>

                        <CoverageRadiusMap
                          value={{
                            latitude: selectedCoverageLocation.latitude,
                            longitude: selectedCoverageLocation.longitude,
                          }}
                          radiusKm={
                            selectedCoverageLocation.coverage_radius_km || 5
                          }
                          existingLocations={[selectedCoverageLocation]}
                          existingBranches={existingBranches}
                          showBranches={false}
                          height={340}
                          clickable={false}
                          showSearch={false}
                          onChange={() => {}}
                        />
                      </>
                    ) : (
                      <div
                        style={{
                          minHeight: 340,
                          borderRadius: 16,
                          border: "1px dashed #cbd5e1",
                          background: "#f8fafc",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          textAlign: "center",
                          padding: 24,
                        }}
                      >
                        <EnvironmentOutlined
                          style={{
                            fontSize: 34,
                            color: "#94a3b8",
                          }}
                        />

                        <Text
                          strong
                          style={{
                            display: "block",
                            marginTop: 12,
                            color: "#475569",
                          }}
                        >
                          No allocation selected
                        </Text>

                        <Text
                          type="secondary"
                          style={{
                            display: "block",
                            marginTop: 4,
                          }}
                        >
                          Select an allocation to preview its coverage area.
                        </Text>
                      </div>
                    )}
                  </Card>

                  <Card
                    style={pageStyles.mapCard}
                    styles={{
                      header: {
                        padding: "0 18px",
                        minHeight: 56,
                      },
                      body: {
                        padding: 14,
                      },
                    }}
                    title={
                      <Space>
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 9,
                            background: "#ecfdf5",
                            color: "#059669",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <ShopOutlined />
                        </div>

                        <span>Physical Office Location</span>
                      </Space>
                    }
                  >
                    <Alert
                      type="success"
                      showIcon
                      style={{
                        marginBottom: 12,
                        borderRadius: 12,
                      }}
                      message="Click on the map to set the office location"
                    />

                    <CoverageRadiusMap
                      value={officeMapValue}
                      radiusKm={0.5}
                      showExisting={false}
                      showBranches={false}
                      height={420}
                      onChange={onOfficeMapChange}
                    />
                  </Card>
                </Space>
              </div>
            </Col>
          </Row>
        </Form>
      </Space>
    </div>
  );
}
