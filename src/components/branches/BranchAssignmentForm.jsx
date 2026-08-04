"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from "antd";
import {
  AimOutlined,
  ApartmentOutlined,
  BankOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  FileAddOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  LoadingOutlined,
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
          height: 300,
          background: "#f8fafc",
          border: "1px dashed #cbd5e1",
          borderRadius: 14,
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
    requiredFor: ["franchise_branch", "sub_branch"],
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

const styles = {
  shell: {
    width: "100%",
  },
  headerCard: {
    borderRadius: 16,
    border: "1px solid #e4eaf1",
    boxShadow: "0 6px 24px rgba(15,23,42,.05)",
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    border: "1px solid #e4eaf1",
    boxShadow: "0 6px 24px rgba(15,23,42,.04)",
  },
  section: {
    border: "1px solid #e7ecf2",
    borderRadius: 14,
    padding: 14,
    background: "#fff",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  sectionNumber: {
    width: 30,
    height: 30,
    borderRadius: 9,
    background: "#edf4ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  serviceCard: {
    height: "100%",
    border: "1px solid #e4eaf1",
    borderRadius: 12,
    padding: 11,
    background: "#fafcff",
  },
  documentRow: {
    border: "1px solid #e4eaf1",
    borderRadius: 12,
    background: "#fff",
    padding: 12,
  },
  actionBar: {
    position: "sticky",
    bottom: 10,
    zIndex: 20,
    border: "1px solid #dfe6ee",
    borderRadius: 14,
    padding: "10px 12px",
    background: "rgba(255,255,255,.96)",
    backdropFilter: "blur(12px)",
    boxShadow: "0 10px 28px rgba(15,23,42,.11)",
  },
};

function isMainBranch(type) {
  return type === "franchise_branch";
}

function normalizeCoverageType(value) {
  const type = String(value || "")
    .trim()
    .toLowerCase();

  if (
    [
      "main_branch_zone",
      "main_zone",
      "main_branch",
      "franchise_branch_zone",
      "franchise_zone",
    ].includes(type)
  ) {
    return "main_branch_zone";
  }

  if (
    [
      "sub_branch_zone",
      "sub_zone",
      "sub_branch",
    ].includes(type)
  ) {
    return "sub_branch_zone";
  }

  return type;
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

function normalizeId(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function selectedParentCoverageId(parent) {
  return normalizeId(
    parent?.coverage_location_id ||
      parent?.coverage_location?.id ||
      parent?.coverageLocation?.id,
  );
}

function getCoverageParentRelationIds(location) {
  return [
    location?.parent_branch_id,
    location?.main_branch_id,
    location?.owner_branch_id,
    location?.branch_parent_id,
    location?.parent_branch?.id,
    location?.parentBranch?.id,
    location?.main_branch?.id,
    location?.mainBranch?.id,

    location?.parent_id,
    location?.parent_location_id,
    location?.parent_coverage_id,
    location?.parent_coverage_location_id,
    location?.main_branch_zone_id,
    location?.main_coverage_location_id,
    location?.parent_zone_id,
    location?.parent?.id,
    location?.parent_location?.id,
    location?.parentLocation?.id,
    location?.parent_coverage_location?.id,
    location?.parentCoverageLocation?.id,
    location?.main_branch_zone?.id,
    location?.mainBranchZone?.id,
  ]
    .map(normalizeId)
    .filter(Boolean);
}

function coverageBelongsToParent(location, parentBranch) {
  if (!parentBranch) {
    return false;
  }

  const parentBranchId = normalizeId(parentBranch.id);
  const parentCoverageId = selectedParentCoverageId(parentBranch);
  const relationIds = getCoverageParentRelationIds(location);

  return (
    (parentBranchId &&
      relationIds.includes(parentBranchId)) ||
    (parentCoverageId &&
      relationIds.includes(parentCoverageId))
  );
}

function getAssignedBranchCount(item) {
  const assignedBranches = Array.isArray(
    item?.assigned_branches,
  )
    ? item.assigned_branches
    : Array.isArray(
          item?.assignedBranches,
        )
      ? item.assignedBranches
      : [];

  const rawCount =
    item?.assigned_branches_count ??
    item?.assignedBranchesCount ??
    item?.branches_count ??
    item?.branch_count ??
    assignedBranches.length ??
    0;

  const count = Number(rawCount);

  return Number.isFinite(count)
    ? count
    : 0;
}

function isUnassignedCoverage(item) {
  const status = String(
    item?.status || "",
  )
    .trim()
    .toLowerCase();

  const directlyAssignedId =
    item?.branch_id ||
    item?.assigned_branch_id ||
    item?.assigned_to_branch_id ||
    item?.branch_office_id ||
    item?.franchise_id ||
    item?.franchise_branch_id ||
    item?.assigned_franchise_id ||
    item?.branch?.id ||
    item?.assigned_branch?.id ||
    item?.assignedBranch?.id ||
    item?.franchise?.id ||
    null;

  return (
    status === "active" &&
    !directlyAssignedId &&
    getAssignedBranchCount(item) === 0
  );
}

function SectionHeader({ number, title, description, icon, extra }) {
  return (
    <div style={styles.sectionHeader}>
      <div style={styles.sectionNumber}>{number}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <Row align="middle" justify="space-between" gutter={[10, 6]}>
          <Col flex="auto">
            <Space size={7} align="center">
              {icon}
              <Title
                level={5}
                style={{
                  margin: 0,
                  color: "#0f172a",
                  fontSize: 15,
                }}
              >
                {title}
              </Title>
            </Space>

            {description ? (
              <Text
                type="secondary"
                style={{
                  display: "block",
                  marginTop: 2,
                  fontSize: 12,
                  lineHeight: 1.45,
                }}
              >
                {description}
              </Text>
            ) : null}
          </Col>

          {extra ? <Col>{extra}</Col> : null}
        </Row>
      </div>
    </div>
  );
}

function ServiceSwitchCard({ label, name, description }) {
  return (
    <div style={styles.serviceCard}>
      <Row align="middle" justify="space-between" gutter={[8, 6]}>
        <Col>
          <Text strong style={{ color: "#0f172a" }}>
            {label}
          </Text>
        </Col>

        <Col>
          <Form.Item
            name={name}
            valuePropName="checked"
            style={{ marginBottom: 0 }}
          >
            <Switch size="small" />
          </Form.Item>
        </Col>
      </Row>

      <Text
        type="secondary"
        style={{
          display: "block",
          marginTop: 4,
          fontSize: 11,
          lineHeight: 1.4,
        }}
      >
        {description}
      </Text>
    </div>
  );
}

function CompactDocumentRow({
  document,
  onUpdate,
  onRemove,
}) {
  const isRequired = document.required;
  const hasFile = Boolean(document.file);
  const fixedType =
    isRequired || document.document_type === "company_registration";

  return (
    <div style={styles.documentRow}>
      <Row gutter={[10, 10]} align="middle">
        <Col xs={24} md={7}>
          <Space size={8} align="start">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: hasFile ? "#ecfdf5" : "#eef4ff",
                color: hasFile ? "#059669" : "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {hasFile ? <FileDoneOutlined /> : <FileTextOutlined />}
            </div>

            <div style={{ minWidth: 0 }}>
              <Text strong style={{ display: "block", lineHeight: 1.35 }}>
                {documentLabel(document.document_type)}
              </Text>

              <Space size={5} wrap style={{ marginTop: 3 }}>
                <Tag
                  color={isRequired ? "red" : "default"}
                  style={{ margin: 0, fontSize: 11 }}
                >
                  {isRequired ? "Required" : "Optional"}
                </Tag>

                <Tag
                  color={hasFile ? "success" : "warning"}
                  style={{ margin: 0, fontSize: 11 }}
                >
                  {hasFile ? "Attached" : "Missing"}
                </Tag>
              </Space>
            </div>
          </Space>
        </Col>

        <Col xs={24} md={5}>
          <Select
            size="middle"
            style={{ width: "100%" }}
            value={document.document_type}
            disabled={fixedType}
            options={DOCUMENT_TYPE_OPTIONS.map((item) => ({
              value: item.value,
              label: item.label,
            }))}
            onChange={(value) =>
              onUpdate(document.uid, {
                document_type: value,
                title: documentLabel(value),
              })
            }
          />
        </Col>

        <Col xs={24} md={5}>
          <Upload
            beforeUpload={() => false}
            maxCount={1}
            showUploadList={false}
            fileList={document.fileList}
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            onChange={({ file, fileList }) => {
              const nextFileList = fileList.slice(-1);
              const uploadEntry = nextFileList[0] || file || null;
              const nativeFile =
                uploadEntry?.originFileObj ||
                (typeof File !== "undefined" && uploadEntry instanceof File
                  ? uploadEntry
                  : null);

              if (!nativeFile) {
                message.error("The selected item is not a valid browser file.");
              }

              onUpdate(document.uid, {
                fileList: nextFileList,
                file: nativeFile,
              });
            }}
          >
            <Button
              block
              icon={hasFile ? <CheckCircleOutlined /> : <UploadOutlined />}
            >
              {hasFile ? "Replace file" : "Choose file"}
            </Button>
          </Upload>

          {hasFile ? (
            <Tooltip title={document.file?.name}>
              <Text
                type="secondary"
                ellipsis
                style={{
                  display: "block",
                  marginTop: 4,
                  fontSize: 11,
                  maxWidth: "100%",
                }}
              >
                {document.file?.name}
              </Text>
            </Tooltip>
          ) : null}
        </Col>

        <Col xs={24} md={6}>
          <Input
            value={document.notes}
            placeholder="Optional note"
            onChange={(event) =>
              onUpdate(document.uid, {
                notes: event.target.value,
              })
            }
          />
        </Col>

        <Col xs={24} md={1} style={{ textAlign: "right" }}>
          {!isRequired &&
          document.document_type !== "company_registration" ? (
            <Tooltip title="Remove document row">
              <Button
                danger
                type="text"
                icon={<DeleteOutlined />}
                onClick={() => onRemove(document.uid)}
              />
            </Tooltip>
          ) : hasFile ? (
            <Tooltip title="Clear selected file">
              <Button
                type="text"
                icon={<CloseCircleOutlined />}
                onClick={() =>
                  onUpdate(document.uid, {
                    file: null,
                    fileList: [],
                  })
                }
              />
            </Tooltip>
          ) : null}
        </Col>
      </Row>
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
  onParentChange,
  onSubmit,
  onCancel,
  compact = false,
  showHeader = true,
}) {
  const [form] = Form.useForm();

  const [manualAssignedAddress, setManualAssignedAddress] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [locatingCurrentLocation, setLocatingCurrentLocation] = useState(false);

  const type = Form.useWatch("type", form);
  const parentId = Form.useWatch("parent_id", form);
  const coverageLocationId = Form.useWatch("coverage_location_id", form);
  const officeLatitude = Form.useWatch("office_latitude", form);
  const officeLongitude = Form.useWatch("office_longitude", form);

  const selectedParentBranch = useMemo(
    () =>
      parentOptions.find((item) => Number(item.id) === Number(parentId)) || null,
    [parentOptions, parentId],
  );

  const selectedCoverageLocation = useMemo(
    () =>
      coverageLocations.find(
        (item) =>
          Number(item.id) ===
          Number(coverageLocationId),
      ) || null,
    [
      coverageLocations,
      coverageLocationId,
    ],
  );

  const filteredCoverageLocations =
    useMemo(() => {
      const requiredType =
        isMainBranch(type)
          ? "main_branch_zone"
          : "sub_branch_zone";

      if (
        !isMainBranch(type) &&
        !parentId
      ) {
        return [];
      }

      return coverageLocations.filter(
        (item) => {
          const matchesType =
            normalizeCoverageType(
              item?.type,
            ) === requiredType;

          const isCurrentlySelected =
            Number(item.id) ===
            Number(
              coverageLocationId,
            );

          if (!matchesType) {
            return false;
          }

          if (
            isCurrentlySelected &&
            mode === "edit"
          ) {
            return true;
          }

          if (
            !isUnassignedCoverage(
              item,
            )
          ) {
            return false;
          }

          if (isMainBranch(type)) {
            return true;
          }

          /*
           * The create page normally passes a list already
           * chained to the selected parent. When the API
           * includes parent relation IDs, verify them here.
           * When those relation fields are absent, trust the
           * parent page's already-filtered list.
           */
          const relationIds =
            getCoverageParentRelationIds(
              item,
            );

          if (
            relationIds.length === 0
          ) {
            return true;
          }

          return coverageBelongsToParent(
            item,
            selectedParentBranch,
          );
        },
      );
    }, [
      coverageLocations,
      coverageLocationId,
      mode,
      parentId,
      selectedParentBranch,
      type,
    ]);

  const officeMapValue = useMemo(
    () => ({
      latitude: officeLatitude,
      longitude: officeLongitude,
    }),
    [officeLatitude, officeLongitude],
  );

  const requiredDocumentLabels = useMemo(
    () => getRequiredDocumentTypes(type).map(documentLabel),
    [type],
  );

  function syncRequiredDocuments(nextType) {
    const requiredTypes = getRequiredDocumentTypes(nextType);

    setDocuments((previousDocuments) => {
      const keptRows = previousDocuments.filter(
        (item) => !item.required || requiredTypes.includes(item.document_type),
      );

      const normalizedRows = keptRows.map((item) => ({
        ...item,
        required: requiredTypes.includes(item.document_type),
        title: item.title || documentLabel(item.document_type),
      }));

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

  const initialValuesSignature =
    useMemo(
      () =>
        JSON.stringify(
          initialValues || {},
        ),
      [initialValues],
    );

  useEffect(() => {
    const values = {
      type: "franchise_branch",
      status: "draft",
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
    syncRequiredDocuments(
      values.type,
    );
    // initialValuesSignature prevents an inline initialValues
    // object from resetting the user's selections on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form,
    initialValuesSignature,
  ]);

  useEffect(() => {
    if (
      type !== "sub_branch"
    ) {
      onParentChange?.(null);
      return;
    }

    onParentChange?.(
      parentId || null,
    );
  }, [
    type,
    parentId,
    onParentChange,
  ]);

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
        item.uid === uid ? { ...item, ...changes } : item,
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

  function locateCurrentOfficeLocation() {
    if (typeof window === "undefined" || !navigator.geolocation) {
      message.error("Current location is not supported by this browser.");
      return;
    }

    setLocatingCurrentLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setFieldsValue({
          office_latitude: Number(position.coords.latitude.toFixed(7)),
          office_longitude: Number(position.coords.longitude.toFixed(7)),
        });

        setLocatingCurrentLocation(false);
        message.success("Current office location pinned successfully.");
      },
      (error) => {
        setLocatingCurrentLocation(false);

        const messages = {
          1: "Location permission was denied.",
          2: "Your current location could not be determined.",
          3: "Location request timed out.",
        };

        message.error(messages[error.code] || "Could not access your location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
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
          `Please upload: ${missingDocuments.map(documentLabel).join(", ")}`,
        );
        return;
      }

      const payload = {
        ...values,
        name: String(values.name || "").trim(),
        legal_name: String(values.legal_name || "").trim(),
        documents: documents
          .filter((item) => item.file)
          .map((item) => ({
            document_type: item.document_type,
            title: item.title,
            notes: item.notes,
            file: item.file,
          })),
      };

      /* Branch code is generated uniquely by the backend. */
      delete payload.code;

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

  const allocationDisabled = !isMainBranch(type) && !parentId;
  const formSize = compact ? "middle" : "large";

  return (
    <div style={styles.shell} className="branch-assignment-compact">
      <style jsx global>{`
        .branch-assignment-compact .ant-form-item {
          margin-bottom: ${compact ? "11px" : "16px"};
        }

        .branch-assignment-compact .ant-form-item-label {
          padding-bottom: 4px;
        }

        .branch-assignment-compact .ant-card-head {
          min-height: 48px;
        }

        .branch-assignment-compact .ant-select-selector,
        .branch-assignment-compact .ant-input,
        .branch-assignment-compact .ant-input-number {
          border-radius: 9px !important;
        }
      `}</style>

      {showHeader ? (
        <Card
          style={styles.headerCard}
          styles={{
            body: {
              padding: compact ? "15px 17px" : "20px 22px",
              background: "linear-gradient(135deg,#ffffff,#f3f7ff)",
            },
          }}
        >
          <Row gutter={[12, 10]} align="middle" justify="space-between">
            <Col flex="auto">
              <Space size={11} align="start">
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 13,
                    background: "#2563eb",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                  }}
                >
                  <ShopOutlined />
                </div>

                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    {mode === "edit"
                      ? "Update Branch Assignment"
                      : "Create Branch Assignment"}
                  </Title>

                  <Text type="secondary">
                    Allocation, office, business, operations and documents.
                  </Text>
                </div>
              </Space>
            </Col>

            <Col>
              <Tag
                icon={<CheckCircleFilled />}
                color="blue"
                style={{ margin: 0, borderRadius: 999, padding: "4px 10px" }}
              >
                {isMainBranch(type) ? "Main Branch" : "Sub-Branch"}
              </Tag>
            </Col>
          </Row>
        </Card>
      ) : null}

      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        size={formSize}
      >
        <Row gutter={[12, 12]} align="top">
          <Col xs={24} xl={16}>
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Card
                style={styles.card}
                styles={{ body: { padding: compact ? 14 : 18 } }}
              >
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                  <div style={styles.section}>
                    <SectionHeader
                      number="1"
                      icon={<ApartmentOutlined style={{ color: "#2563eb" }} />}
                      title="Branch assignment"
                      description={
                        isMainBranch(type)
                          ? "Choose an active, unassigned main coverage allocation."
                          : "Choose a parent branch, then select one of its active, unassigned sub allocations."
                      }
                      extra={
                        <Tag
                          color={filteredCoverageLocations.length ? "green" : "red"}
                          style={{ margin: 0 }}
                        >
                          {filteredCoverageLocations.length} available
                        </Tag>
                      }
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
                          onTypeChange?.(nextType);
                          syncRequiredDocuments(nextType);

                          form.setFieldsValue({
                            parent_id:
                              nextType === "franchise_branch"
                                ? null
                                : form.getFieldValue("parent_id"),
                            coverage_location_id: null,
                          });
                        }}
                      />
                    </Form.Item>

                    {!isMainBranch(type) ? (
                      <Form.Item
                        label="Parent Franchise / Main Branch"
                        name="parent_id"
                        rules={[
                          {
                            required: true,
                            message: "Parent branch is required.",
                          },
                        ]}
                      >
                        <Select
                          showSearch
                          placeholder="Select the parent main branch"
                          optionFilterProp="label"
                          options={parentOptions.map((item) => ({
                            value: item.id,
                            label:
                              item.label ||
                              `${item.name} (${item.code || item.type})`,
                          }))}
                          onChange={() => {
                            form.setFieldValue("coverage_location_id", null);
                          }}
                        />
                      </Form.Item>
                    ) : null}

                    <Form.Item
                      label={
                        isMainBranch(type)
                          ? "Main Branch Allocation"
                          : "Sub-Branch Allocation"
                      }
                      name="coverage_location_id"
                      extra={
                        allocationDisabled
                          ? "Select the parent branch first."
                          : !isMainBranch(type) &&
                              parentId &&
                              !filteredCoverageLocations.length
                            ? "No unassigned sub allocation linked to this parent branch."
                            : null
                      }
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
                        disabled={allocationDisabled}
                        placeholder={
                          allocationDisabled
                            ? "Select parent branch first"
                            : "Select an active, unassigned allocation"
                        }
                        optionFilterProp="label"
                        notFoundContent={
                          allocationDisabled
                            ? "Select a parent branch first"
                            : "No matching unassigned allocation"
                        }
                        options={filteredCoverageLocations.map((item) => ({
                          value: item.id,
                          label: `${item.name} (${item.code}) — Unassigned`,
                        }))}
                      />
                    </Form.Item>

                    {selectedParentBranch && !isMainBranch(type) ? (
                      <Alert
                        type="info"
                        showIcon
                        style={{ borderRadius: 10, marginTop: 2 }}
                        message={`Parent: ${selectedParentBranch.name}`}
                        description={
                          selectedParentCoverageId(selectedParentBranch)
                            ? `Coverage link: ${selectedParentCoverageId(
                                selectedParentBranch,
                              )}`
                            : "This parent branch has no main coverage allocation ID."
                        }
                      />
                    ) : null}

                    {selectedCoverageLocation ? (
                      <div
                        style={{
                          marginTop: 10,
                          padding: "10px 12px",
                          border: "1px solid #dbe7ff",
                          borderRadius: 11,
                          background: "#f7faff",
                        }}
                      >
                        <Row gutter={[10, 8]} align="middle">
                          <Col xs={24} md={10}>
                            <Text strong>{selectedCoverageLocation.name}</Text>
                            <Text
                              type="secondary"
                              style={{ display: "block", fontSize: 11 }}
                            >
                              {selectedCoverageLocation.code}
                            </Text>
                          </Col>

                          <Col xs={12} md={5}>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              Radius
                            </Text>
                            <Text strong style={{ display: "block" }}>
                              {selectedCoverageLocation.coverage_radius_km || 0} km
                            </Text>
                          </Col>

                          <Col xs={12} md={5}>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              Status
                            </Text>
                            <Tag
                              color={
                                String(
                                  selectedCoverageLocation.status ||
                                    "",
                                ).toLowerCase() ===
                                "active"
                                  ? "green"
                                  : "orange"
                              }
                              style={{
                                display: "block",
                                width: "fit-content",
                              }}
                            >
                              {selectedCoverageLocation.status ||
                                "active"}
                            </Tag>
                          </Col>

                          <Col xs={24} md={4} style={{ textAlign: "right" }}>
                            <Button
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
                          </Col>
                        </Row>
                      </div>
                    ) : null}
                  </div>

                  <div style={styles.section}>
                    <SectionHeader
                      number="2"
                      icon={<EnvironmentOutlined style={{ color: "#2563eb" }} />}
                      title="Physical office / pickup location"
                      description="Used for pickups, routing and branch operations."
                      extra={
                        <Button
                          size="small"
                          type="primary"
                          icon={
                            locatingCurrentLocation ? (
                              <LoadingOutlined />
                            ) : (
                              <AimOutlined />
                            )
                          }
                          loading={locatingCurrentLocation}
                          onClick={locateCurrentOfficeLocation}
                        >
                          Pin current location
                        </Button>
                      }
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
                        rows={2}
                        placeholder="Complete office or pickup address"
                      />
                    </Form.Item>

                    <Row gutter={[12, 0]}>
                      <Col xs={24} md={12}>
                        <Form.Item label="Office City" name="office_city">
                          <Input placeholder="City" />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={12}>
                        <Form.Item label="Office Area" name="office_area">
                          <Input placeholder="Area" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={[12, 0]}>
                      <Col xs={24} md={12}>
                        <Form.Item label="Office Street" name="office_street">
                          <Input placeholder="Street" />
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

                    <Row gutter={[12, 0]}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Latitude"
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
                            placeholder="27.7172"
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Longitude"
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
                            placeholder="85.3240"
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>

                  <div style={styles.section}>
                    <SectionHeader
                      number="3"
                      icon={<BankOutlined style={{ color: "#2563eb" }} />}
                      title="Business and manager"
                      description="Registered business, contact and login-account details."
                    />

                    <Form.Item
                      label="Branch Name"
                      name="name"
                      rules={[
                        {
                          required: true,
                          message: "Branch name is required.",
                        },
                      ]}
                    >
                      <Input placeholder="Example: Chitwan Franchise Branch" />
                    </Form.Item>

                    <Row gutter={[12, 0]}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Legal Business Name"
                          name="legal_name"
                          rules={[
                            {
                              required: isMainBranch(type),
                              message: "Legal business name is required.",
                            },
                          ]}
                        >
                          <Input placeholder="Registered business name" />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Owner Name"
                          name="owner_name"
                          rules={[
                            {
                              required: isMainBranch(type),
                              message: "Owner name is required.",
                            },
                          ]}
                        >
                          <Input placeholder="Full name" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={[12, 0]}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Manager Email"
                          name="email"
                          rules={[
                            {
                              required:
                                mode === "create" &&
                                ["franchise_branch", "sub_branch"].includes(type),
                              message: "Manager email is required.",
                            },
                            {
                              type: "email",
                              message: "Enter a valid email.",
                            },
                          ]}
                        >
                          <Input placeholder="manager@example.com" />
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

                    <Row gutter={[12, 0]}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Contact Person"
                          name="contact_person"
                        >
                          <Input placeholder="Contact person" />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Alternative Phone"
                          name="alternative_phone"
                        >
                          <Input placeholder="Optional phone" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={[12, 0]}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="PAN / VAT Number"
                          name="pan_vat_number"
                          rules={[
                            {
                              required: isMainBranch(type),
                              message: "PAN/VAT is required.",
                            },
                          ]}
                        >
                          <Input placeholder="PAN / VAT" />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Registration Number"
                          name="registration_number"
                        >
                          <Input placeholder="Registration number" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item label="Status" name="status" hidden>
                      <Select disabled options={STATUS_OPTIONS} />
                    </Form.Item>

                    <div style={{ display: "none" }}>
                      <Form.Item>
                        <Switch
                          checked={manualAssignedAddress}
                          onChange={setManualAssignedAddress}
                        />
                      </Form.Item>

                      {[
                        "country",
                        "province",
                        "district",
                        "city",
                        "area",
                        "address",
                        "landmark",
                        "business_type",
                      ].map((field) => (
                        <Form.Item key={field} name={field}>
                          <Input />
                        </Form.Item>
                      ))}
                    </div>
                  </div>

                  <div style={styles.section}>
                    <SectionHeader
                      number="4"
                      icon={<ShopOutlined style={{ color: "#2563eb" }} />}
                      title="Operations"
                      description="Working hours, days and enabled services."
                    />

                    <Row gutter={[12, 0]}>
                      <Col xs={24} md={8}>
                        <Form.Item label="Opening Time" name="opening_time">
                          <Input type="time" />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={8}>
                        <Form.Item label="Closing Time" name="closing_time">
                          <Input type="time" />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={8}>
                        <Form.Item label="Operating Days" name="operating_days">
                          <Select
                            mode="multiple"
                            allowClear
                            placeholder="Select days"
                            options={OPERATING_DAY_OPTIONS}
                            maxTagCount={2}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={[10, 10]}>
                      <Col xs={12} md={6}>
                        <ServiceSwitchCard
                          label="Pickup"
                          name="pickup_enabled"
                          description="Accept pickups."
                        />
                      </Col>

                      <Col xs={12} md={6}>
                        <ServiceSwitchCard
                          label="Delivery"
                          name="delivery_enabled"
                          description="Deliver parcels."
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
                          description="Process returns."
                        />
                      </Col>
                    </Row>
                  </div>

                  <div style={styles.section}>
                    <SectionHeader
                      number="5"
                      icon={<FileTextOutlined style={{ color: "#2563eb" }} />}
                      title="Supporting documents"
                      description="Required documents are prepared automatically for the selected branch type."
                      extra={
                        <Tag
                          color={
                            documents.filter((item) => item.file).length ===
                            getRequiredDocumentTypes(type).length
                              ? "green"
                              : "orange"
                          }
                          style={{ margin: 0 }}
                        >
                          {documents.filter((item) => item.file).length}/
                          {documents.length} attached
                        </Tag>
                      }
                    />

                    <Alert
                      type="info"
                      showIcon
                      style={{ borderRadius: 10, marginBottom: 10 }}
                      message="Required for this branch"
                      description={requiredDocumentLabels.join(", ")}
                    />

                    <Space
                      direction="vertical"
                      size={8}
                      style={{ width: "100%" }}
                    >
                      {documents.map((document) => (
                        <CompactDocumentRow
                          key={document.uid}
                          document={document}
                          onUpdate={updateDocumentRow}
                          onRemove={removeDocumentRow}
                        />
                      ))}

                      <Button
                        type="dashed"
                        block
                        icon={<FileAddOutlined />}
                        onClick={() => addDocumentRow("other")}
                        style={{ height: 40, borderRadius: 10 }}
                      >
                        Add another supporting document
                      </Button>
                    </Space>
                  </div>
                </Space>
              </Card>

              <div style={styles.actionBar}>
                <Row justify="space-between" align="middle" gutter={[10, 10]}>
                  <Col xs={24} sm="auto">
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Only active, unassigned allocations can be selected during creation.
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
                        style={{ minWidth: 145 }}
                      >
                        {mode === "edit" ? "Update Branch" : "Create Branch"}
                      </Button>
                    </Space>
                  </Col>
                </Row>
              </div>
            </Space>
          </Col>

          <Col xs={24} xl={8}>
            <Space
              direction="vertical"
              size={12}
              style={{
                width: "100%",
                position: "sticky",
                top: 82,
              }}
            >
              <Card
                style={styles.card}
                title={
                  <Space>
                    <EnvironmentOutlined />
                    Allocation preview
                  </Space>
                }
                styles={{ body: { padding: 12 } }}
              >
                {selectedCoverageLocation ? (
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
                    height={280}
                    clickable={false}
                    showSearch={false}
                    onChange={() => {}}
                  />
                ) : (
                  <div
                    style={{
                      minHeight: 220,
                      border: "1px dashed #cbd5e1",
                      borderRadius: 12,
                      background: "#f8fafc",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      padding: 18,
                    }}
                  >
                    <EnvironmentOutlined
                      style={{ fontSize: 28, color: "#94a3b8" }}
                    />
                    <Text strong style={{ marginTop: 8 }}>
                      No allocation selected
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Choose an available allocation to preview it.
                    </Text>
                  </div>
                )}
              </Card>

              <Card
                style={styles.card}
                title={
                  <Space>
                    <ShopOutlined />
                    Office map
                  </Space>
                }
                styles={{ body: { padding: 12 } }}
              >
                <CoverageRadiusMap
                  value={officeMapValue}
                  radiusKm={0.5}
                  showExisting={false}
                  showBranches={false}
                  height={320}
                  onChange={onOfficeMapChange}
                />

                {officeLatitude || officeLongitude ? (
                  <Row gutter={[8, 8]} style={{ marginTop: 9 }}>
                    <Col span={12}>
                      <div
                        style={{
                          padding: "7px 9px",
                          borderRadius: 9,
                          background: "#f8fafc",
                          border: "1px solid #e4eaf1",
                        }}
                      >
                        <Text type="secondary" style={{ fontSize: 10 }}>
                          Latitude
                        </Text>
                        <Text strong ellipsis style={{ display: "block" }}>
                          {officeLatitude || "—"}
                        </Text>
                      </div>
                    </Col>

                    <Col span={12}>
                      <div
                        style={{
                          padding: "7px 9px",
                          borderRadius: 9,
                          background: "#f8fafc",
                          border: "1px solid #e4eaf1",
                        }}
                      >
                        <Text type="secondary" style={{ fontSize: 10 }}>
                          Longitude
                        </Text>
                        <Text strong ellipsis style={{ display: "block" }}>
                          {officeLongitude || "—"}
                        </Text>
                      </div>
                    </Col>
                  </Row>
                ) : null}
              </Card>
            </Space>
          </Col>
        </Row>
      </Form>
    </div>
  );
}
