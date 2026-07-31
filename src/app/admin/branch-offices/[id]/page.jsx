"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  Alert,
  Avatar,
  Breadcrumb,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Result,
  Row,
  Select,
  Skeleton,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ApartmentOutlined,
  ArrowLeftOutlined,
  BankOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  MailOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  StopOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from "@ant-design/icons";

import * as branchApi from "@/services/branchAllocationApi";
import BranchInvitationActions from "@/components/branches/BranchInvitationActions";
import BranchInvitationStatusTag from "@/components/branches/BranchInvitationStatusTag";
import EditableSectionCard from "@/components/branches/branch-office/EditableSectionCard";
import {
  SECTION_TITLES,
  apiErrorMessage,
  buildChangedPayload,
  formatDate,
  getManagerEmail,
  getSectionInitialValues,
  normalizeRows,
  typeColor,
  typeLabel,
  unwrapRecord,
} from "@/components/branches/branch-office/branchOfficeUtils";

const CoverageRadiusMap = dynamic(
  () => import("@/components/maps/CoverageRadiusMap"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          minHeight: 430,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px dashed #cbd5e1",
          borderRadius: 16,
          background: "#f8fafc",
        }}
      >
        Loading map...
      </div>
    ),
  },
);

const { Title, Text } = Typography;

const STATUS_META = {
  draft: { label: "Draft", color: "default" },
  pending_review: { label: "Pending Review", color: "gold" },
  approved: { label: "Approved", color: "cyan" },
  active: { label: "Active", color: "green" },
  suspended: { label: "Suspended", color: "orange" },
  rejected: { label: "Rejected", color: "red" },
  closed: { label: "Closed", color: "default" },
};

const BRANCH_TYPE_OPTIONS = [
  { value: "franchise_branch", label: "Franchise / Main Branch" },
  { value: "sub_branch", label: "Sub-Branch" },
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

const EDITABLE_SECTIONS = ["identity", "business", "office", "operations"];

function isFranchise(record) {
  return ["franchise_branch", "head_branch", "main_branch"].includes(
    record?.type,
  );
}

function serviceTags(record) {
  return [
    record?.pickup_enabled && ["Pickup", "purple"],
    record?.delivery_enabled && ["Delivery", "orange"],
    record?.pod_enabled && ["POD", "green"],
    record?.return_enabled && ["Return", "cyan"],
  ].filter(Boolean);
}

function readinessItems(record) {
  const items = [
    ["Branch name", record?.name],
    ["Branch code", record?.code],
    ["Phone", record?.phone],
    ["Coverage allocation", record?.coverage_location_id || record?.coverage_location?.id],
    ["Coverage address", record?.address],
    ["Coverage latitude", record?.latitude],
    ["Coverage longitude", record?.longitude],
    ["Office address", record?.office_address],
    ["Office latitude", record?.office_latitude],
    ["Office longitude", record?.office_longitude],
  ].map(([label, value]) => ({ label, complete: Boolean(value) }));

  if (isFranchise(record)) {
    items.push({
      label: "Manager account",
      complete: Boolean(record?.manager_user_id && getManagerEmail(record)),
    });
  }

  return items;
}

function ServiceSwitch({ form, name, title, description }) {
  const checked = Boolean(Form.useWatch(name, form));

  return (
    <div
      style={{
        width: "100%",
        minHeight: 94,
        padding: 14,
        borderRadius: 14,
        border: checked ? "1px solid #93c5fd" : "1px solid #e2e8f0",
        background: checked ? "#eff6ff" : "#ffffff",
      }}
    >
      <Row justify="space-between" align="top" gutter={10}>
        <Col flex="auto">
          <Text strong style={{ display: "block" }}>
            {title}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {description}
          </Text>
        </Col>
        <Col>
          <Form.Item name={name} valuePropName="checked" noStyle>
            <Switch size="small" />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
}

export default function BranchOfficeWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = params?.id;

  const [identityForm] = Form.useForm();
  const [businessForm] = Form.useForm();
  const [officeForm] = Form.useForm();
  const [operationsForm] = Form.useForm();

  const [record, setRecord] = useState(null);
  const [allBranches, setAllBranches] = useState([]);
  const [coverageLocations, setCoverageLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editingSection, setEditingSection] = useState(null);
  const [savingSection, setSavingSection] = useState(null);
  const [changedFieldCount, setChangedFieldCount] = useState(0);
  const handledEditQueryRef = useRef(null);
  const [actionModal, setActionModal] = useState({
    open: false,
    action: null,
    reason: "",
    submitting: false,
  });

  const watchedType = Form.useWatch("type", identityForm) || record?.type;
  const watchedCoverageId = Form.useWatch(
    "coverage_location_id",
    identityForm,
  );
  const watchedOfficeLatitude = Form.useWatch("office_latitude", officeForm);
  const watchedOfficeLongitude = Form.useWatch("office_longitude", officeForm);

  const loadPage = useCallback(async () => {
    if (!branchId) return;

    try {
      setLoading(true);
      setLoadError("");

      const [branchResponse, branchesResponse, coverageResponse] =
        await Promise.all([
          branchApi.getBranch(branchId),
          branchApi.getBranches({ all: 1 }),
          branchApi.getCoverageLocations({ all: 1 }),
        ]);

      setRecord(unwrapRecord(branchResponse));
      setAllBranches(normalizeRows(branchesResponse));
      setCoverageLocations(normalizeRows(coverageResponse));
    } catch (error) {
      setLoadError(apiErrorMessage(error, "Could not load branch office."));
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const refreshRecord = useCallback(async () => {
    if (!branchId) return null;

    const response = await branchApi.getBranch(branchId);
    const freshRecord = unwrapRecord(response);

    if (freshRecord?.id) {
      setRecord(freshRecord);
    }

    return freshRecord;
  }, [branchId]);

  const parentOptions = useMemo(
    () =>
      allBranches
        .filter((item) => Number(item.id) !== Number(branchId))
        .filter((item) =>
          ["franchise_branch", "head_branch", "main_branch"].includes(
            item.type,
          ),
        )
        .map((item) => ({
          value: item.id,
          label: `${item.name} (${item.code || item.type})`,
        })),
    [allBranches, branchId],
  );

  const coverageOptions = useMemo(() => {
    const requiredType =
      watchedType === "franchise_branch"
        ? "main_branch_zone"
        : "sub_branch_zone";

    return coverageLocations
      .filter((item) => {
        const current =
          Number(item.id) ===
          Number(watchedCoverageId || record?.coverage_location_id);
        const unassigned =
          !item.branch_id &&
          !item.assigned_branch_id &&
          !item.assigned_to_branch_id &&
          !item.branch?.id;
        const inactive =
          String(item.status || "").toLowerCase() === "inactive";

        return item.type === requiredType && (current || (inactive && unassigned));
      })
      .map((item) => ({
        value: item.id,
        label:
          Number(item.id) === Number(record?.coverage_location_id)
            ? `${item.name} (${item.code}) — Current allocation`
            : `${item.name} (${item.code}) — Inactive · Unassigned`,
      }));
  }, [
    coverageLocations,
    record?.coverage_location_id,
    watchedCoverageId,
    watchedType,
  ]);

  const forms = useMemo(
    () => ({
      identity: identityForm,
      business: businessForm,
      office: officeForm,
      operations: operationsForm,
    }),
    [identityForm, businessForm, officeForm, operationsForm],
  );

  const buildBranchUrl = useCallback(
    (editSection = null) => {
      const next = new URLSearchParams(searchParams.toString());

      if (editSection) {
        next.set("edit", editSection);
      } else {
        next.delete("edit");
      }

      const query = next.toString();

      return `/admin/branch-offices/${branchId}${query ? `?${query}` : ""}`;
    },
    [branchId, searchParams],
  );

  const openSection = useCallback(
    (section, { updateUrl = true } = {}) => {
      const form = forms[section];

      if (!record || !form || !EDITABLE_SECTIONS.includes(section)) return;

      form.resetFields();
      form.setFieldsValue(getSectionInitialValues(section, record));

      handledEditQueryRef.current = section;
      setChangedFieldCount(0);
      setEditingSection(section);

      if (updateUrl) {
        router.replace(buildBranchUrl(section), { scroll: false });
      }
    },
    [buildBranchUrl, forms, record, router],
  );

  const closeSection = useCallback(() => {
    const currentSection = editingSection;

    if (currentSection && forms[currentSection]) {
      forms[currentSection].resetFields();
    }

    // Keep the current query marked as handled until Next.js removes it.
    // This prevents the edit section from immediately reopening after save/cancel.
    handledEditQueryRef.current = searchParams.get("edit") || currentSection;

    setChangedFieldCount(0);
    setEditingSection(null);
    router.replace(buildBranchUrl(null), { scroll: false });
  }, [buildBranchUrl, editingSection, forms, router, searchParams]);

  const requestOpenSection = useCallback(
    (section) => {
      if (!editingSection || editingSection === section) {
        openSection(section);
        return;
      }

      if (changedFieldCount === 0) {
        openSection(section);
        return;
      }

      Modal.confirm({
        title: "Discard unsaved changes?",
        content: `You have unsaved changes in ${SECTION_TITLES[editingSection]}.`,
        okText: "Discard and continue",
        cancelText: "Keep editing",
        okButtonProps: { danger: true },
        onOk: () => openSection(section),
      });
    },
    [changedFieldCount, editingSection, openSection],
  );

  useEffect(() => {
    const requested = searchParams.get("edit");

    if (!requested) {
      handledEditQueryRef.current = null;
      return;
    }

    if (
      !record ||
      editingSection ||
      !EDITABLE_SECTIONS.includes(requested) ||
      handledEditQueryRef.current === requested
    ) {
      return;
    }

    handledEditQueryRef.current = requested;
    openSection(requested, { updateUrl: false });
  }, [editingSection, openSection, record, searchParams]);

  const handleSectionValuesChange = useCallback(
    (section, allValues) => {
      if (!record) {
        setChangedFieldCount(0);
        return;
      }

      const formValues = forms[section]?.getFieldsValue(true) || allValues || {};
      const changedPayload = buildChangedPayload(section, record, formValues);

      setChangedFieldCount(Object.keys(changedPayload).length);
    },
    [forms, record],
  );

  const recalculateSectionChanges = useCallback(
    (section) => {
      queueMicrotask(() => {
        handleSectionValuesChange(
          section,
          forms[section]?.getFieldsValue(true) || {},
        );
      });
    },
    [forms, handleSectionValuesChange],
  );

  const saveSection = useCallback(
    async (section, values) => {
      const updateRequest =
        branchApi.updateBranch ||
        branchApi.updateBranchOffice ||
        branchApi.saveBranch;

      if (typeof updateRequest !== "function") {
        message.error(
          "branchAllocationApi must export updateBranch, updateBranchOffice, or saveBranch.",
        );
        return;
      }

      const payload = buildChangedPayload(section, record, values);
      const updatedFields = Object.keys(payload);

      if (!updatedFields.length) {
        message.info("No changes were made.");
        closeSection();
        return;
      }

      try {
        setSavingSection(section);

        const response = await updateRequest(branchId, payload);
        const updatedRecord = unwrapRecord(response);

        if (updatedRecord?.id) {
          setRecord((previous) => ({
            ...previous,
            ...updatedRecord,
          }));
        }

        closeSection();

        try {
          await refreshRecord();
        } catch {
          // The update already succeeded. Keep the merged response if refresh fails.
        }

        message.success(
          `${SECTION_TITLES[section]} updated successfully (${updatedFields.length} field${updatedFields.length === 1 ? "" : "s"}).`,
        );
      } catch (error) {
        message.error(
          apiErrorMessage(
            error,
            `Could not update ${SECTION_TITLES[section].toLowerCase()}.`,
          ),
        );
      } finally {
        setSavingSection(null);
      }
    },
    [branchId, closeSection, record, refreshRecord],
  );

  const submitCurrentForm = useCallback(
    (section) => {
      const form = forms[section];
      if (form) form.submit();
    },
    [forms],
  );

  const openAction = useCallback((action) => {
    setActionModal({ open: true, action, reason: "", submitting: false });
  }, []);

  const closeAction = useCallback(() => {
    setActionModal({ open: false, action: null, reason: "", submitting: false });
  }, []);

  const submitAction = useCallback(async () => {
    if (!record?.id) return;

    const { action, reason } = actionModal;
    if (["suspend", "reject"].includes(action) && !reason.trim()) {
      message.warning("Please enter a reason.");
      return;
    }

    try {
      setActionModal((previous) => ({ ...previous, submitting: true }));

      if (action === "approve") await branchApi.approveBranch(record.id);
      if (action === "activate") await branchApi.activateBranch(record.id);
      if (action === "suspend") {
        await branchApi.suspendBranch(record.id, reason.trim());
      }
      if (action === "reject") {
        await branchApi.rejectBranch(record.id, reason.trim());
      }

      message.success("Branch status updated successfully.");
      closeAction();
      await loadPage();
    } catch (error) {
      setActionModal((previous) => ({ ...previous, submitting: false }));
      message.error(apiErrorMessage(error, "Branch action failed."));
    }
  }, [actionModal, closeAction, loadPage, record]);

  const handleBack = useCallback(() => {
    if (editingSection && changedFieldCount > 0) {
      Modal.confirm({
        title: "Leave without saving?",
        content: `Your changes in ${SECTION_TITLES[editingSection]} will be lost.`,
        okText: "Leave page",
        cancelText: "Stay",
        okButtonProps: { danger: true },
        onOk: () => router.push("/admin/branch-offices"),
      });
      return;
    }

    router.push("/admin/branch-offices");
  }, [changedFieldCount, editingSection, router]);

  const childColumns = [
    {
      title: "Branch",
      dataIndex: "name",
      render: (name, row) => (
        <Space direction="vertical" size={0}>
          <Link href={`/admin/branch-offices/${row.id}`}>
            {name || row.legal_name || "Unnamed branch"}
          </Link>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {row.code || `#${row.id}`}
          </Text>
        </Space>
      ),
    },
    {
      title: "Office",
      render: (_, row) =>
        [row.office_area, row.office_city].filter(Boolean).join(", ") || "—",
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
      render: (status) => (
        <Tag color={STATUS_META[status]?.color || "default"}>
          {STATUS_META[status]?.label || status}
        </Tag>
      ),
    },
  ];

  const documentColumns = [
    { title: "Title", dataIndex: "title", render: (value) => value || "—" },
    {
      title: "Type",
      dataIndex: "document_type",
      render: (value) => value || "—",
    },
    { title: "Notes", dataIndex: "notes", render: (value) => value || "—" },
  ];

  const agreementColumns = [
    { title: "Title", dataIndex: "title", render: (value) => value || "—" },
    {
      title: "Type",
      dataIndex: "agreement_type",
      render: (value) => value || "—",
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
      render: (value) => (value ? <Tag>{value}</Tag> : "—"),
    },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", padding: 24, background: "#f4f7fb" }}>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Card style={{ borderRadius: 18 }}>
            <Skeleton active paragraph={{ rows: 2 }} />
          </Card>
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={15}>
              <Card style={{ borderRadius: 18 }}>
                <Skeleton active paragraph={{ rows: 16 }} />
              </Card>
            </Col>
            <Col xs={24} xl={9}>
              <Card style={{ borderRadius: 18 }}>
                <Skeleton active paragraph={{ rows: 12 }} />
              </Card>
            </Col>
          </Row>
        </Space>
      </div>
    );
  }

  if (loadError || !record) {
    return (
      <div style={{ minHeight: "100vh", padding: 24, background: "#f4f7fb" }}>
        <Result
          status="error"
          title="Branch office could not be loaded"
          subTitle={loadError || "The requested branch was not found."}
          extra={[
            <Button
              key="back"
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
            >
              Back to branches
            </Button>,
            <Button
              key="retry"
              type="primary"
              icon={<ReloadOutlined />}
              onClick={loadPage}
            >
              Retry
            </Button>,
          ]}
        />
      </div>
    );
  }

  const currentStatus = STATUS_META[record.status] || {
    label: record.status,
    color: "default",
  };
  const services = serviceTags(record);
  const readiness = readinessItems(record);
  const readyCount = readiness.filter((item) => item.complete).length;
  const readyForActivation = readyCount === readiness.length;
  const isMain = isFranchise(record);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "22px clamp(14px, 2vw, 28px) 40px",
        background: "#f4f7fb",
      }}
    >
      <Space direction="vertical" size={18} style={{ width: "100%" }}>
        <Card
          variant="borderless"
          style={{
            borderRadius: 22,
            overflow: "hidden",
            background:
              "linear-gradient(135deg, #0f172a 0%, #172554 55%, #1d4ed8 135%)",
            boxShadow: "0 18px 45px rgba(15, 23, 42, 0.16)",
          }}
          styles={{ body: { padding: "26px clamp(20px, 3vw, 34px)" } }}
        >
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Breadcrumb
              items={[
                {
                  title: (
                    <Link style={{ color: "#bfdbfe" }} href="/admin/branch-offices">
                      Branch Offices
                    </Link>
                  ),
                },
                { title: <span style={{ color: "#ffffff" }}>{record.name}</span> },
              ]}
            />

            <Row gutter={[20, 20]} align="middle" justify="space-between">
              <Col xs={24} xl={15}>
                <Space align="start" size={15}>
                  <Avatar
                    size={54}
                    icon={<ShopOutlined />}
                    style={{ background: "rgba(255,255,255,0.16)" }}
                  />
                  <Space direction="vertical" size={7}>
                    <Space wrap>
                      <Title level={2} style={{ margin: 0, color: "#ffffff" }}>
                        {record.name || record.legal_name}
                      </Title>
                      <Tag color={typeColor(record.type)}>
                        {typeLabel(record.type)}
                      </Tag>
                      <Tag color={currentStatus.color}>{currentStatus.label}</Tag>
                    </Space>
                    <Text style={{ color: "#cbd5e1" }}>
                      {record.code ? `Code: ${record.code}` : `Branch #${record.id}`}
                      {record.parent?.name ? ` · Parent: ${record.parent.name}` : ""}
                    </Text>
                    <Text style={{ color: "#cbd5e1" }}>
                      {record.office_address || record.address || "Office address not completed"}
                    </Text>
                  </Space>
                </Space>
              </Col>

              <Col xs={24} xl={9}>
                <Space wrap style={{ width: "100%", justifyContent: "flex-end" }}>
                  <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={handleBack}
                  >
                    Back
                  </Button>

                  {isMain ? (
                    <BranchInvitationActions branch={record} onChanged={loadPage} />
                  ) : null}

                  {!isMain && !["approved", "active"].includes(record.status) ? (
                    <Button
                      icon={<CheckCircleOutlined />}
                      onClick={() => openAction("approve")}
                    >
                      Approve
                    </Button>
                  ) : null}

                  {["approved", "suspended"].includes(record.status) ? (
                    <Button
                      type="primary"
                      icon={<ThunderboltOutlined />}
                      onClick={() => openAction("activate")}
                    >
                      Activate
                    </Button>
                  ) : null}

                  {["approved", "active"].includes(record.status) ? (
                    <Button
                      icon={<StopOutlined />}
                      onClick={() => openAction("suspend")}
                    >
                      Suspend
                    </Button>
                  ) : null}
                </Space>
              </Col>
            </Row>
          </Space>
        </Card>

        {editingSection ? (
          <Alert
            showIcon
            type="info"
            message={`Editing ${SECTION_TITLES[editingSection]}`}
            description="Only fields changed inside this section are sent to the API. Other branch information remains untouched."
            style={{ borderRadius: 14 }}
          />
        ) : null}

        <Row gutter={[18, 18]} align="top">
          <Col xs={24} xl={16}>
            <Space direction="vertical" size={18} style={{ width: "100%" }}>
              <EditableSectionCard
                title="Branch information"
                description="Identity, hierarchy and assigned coverage allocation."
                icon={<ApartmentOutlined />}
                editing={editingSection === "identity"}
                saving={savingSection === "identity"}
                changedCount={editingSection === "identity" ? changedFieldCount : 0}
                editDisabled={Boolean(editingSection && editingSection !== "identity")}
                onEdit={() => requestOpenSection("identity")}
                onCancel={closeSection}
                onSave={() => submitCurrentForm("identity")}
              >
                {editingSection === "identity" ? (
                  <Form
                    form={identityForm}
                    layout="vertical"
                    onValuesChange={(_, allValues) =>
                      handleSectionValuesChange("identity", allValues)
                    }
                    onFinish={(values) => saveSection("identity", values)}
                  >
                    <Row gutter={[14, 0]}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="name"
                          label="Branch name"
                          rules={[{ required: true, message: "Branch name is required." }]}
                        >
                          <Input placeholder="Branch name" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="legal_name" label="Legal business name">
                          <Input placeholder="Registered business name" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="code" label="Branch code">
                          <Input placeholder="Branch code" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="type"
                          label="Branch type"
                          rules={[{ required: true }]}
                        >
                          <Select
                            options={BRANCH_TYPE_OPTIONS}
                            onChange={(value) => {
                              identityForm.setFieldsValue({
                                parent_id:
                                  value === "franchise_branch"
                                    ? null
                                    : identityForm.getFieldValue("parent_id"),
                                coverage_location_id: null,
                              });
                              recalculateSectionChanges("identity");
                            }}
                          />
                        </Form.Item>
                      </Col>

                      {watchedType !== "franchise_branch" ? (
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="parent_id"
                            label="Parent branch"
                            rules={[{ required: true, message: "Parent branch is required." }]}
                          >
                            <Select
                              showSearch
                              optionFilterProp="label"
                              options={parentOptions}
                              placeholder="Select parent branch"
                            />
                          </Form.Item>
                        </Col>
                      ) : null}

                      <Col xs={24} md={watchedType !== "franchise_branch" ? 12 : 24}>
                        <Form.Item
                          name="coverage_location_id"
                          label="Coverage allocation"
                          rules={[{ required: true, message: "Coverage allocation is required." }]}
                        >
                          <Select
                            showSearch
                            allowClear
                            optionFilterProp="label"
                            options={coverageOptions}
                            placeholder="Select allocation"
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                ) : (
                  <Descriptions size="small" column={{ xs: 1, sm: 2 }}>
                    <Descriptions.Item label="Branch name">
                      {record.name || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Legal name">
                      {record.legal_name || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Code">
                      {record.code || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Type">
                      <Tag color={typeColor(record.type)}>{typeLabel(record.type)}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Parent branch">
                      {record.parent ? (
                        <Link href={`/admin/branch-offices/${record.parent.id}`}>
                          {record.parent.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Coverage allocation">
                      {record.coverage_location ? (
                        <Link href={`/admin/coverage-locations/${record.coverage_location.id}`}>
                          {record.coverage_location.name}
                        </Link>
                      ) : (
                        "Not assigned"
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                )}
              </EditableSectionCard>

              <EditableSectionCard
                title="Business and manager details"
                description="Registered business, contact information and branch manager account."
                icon={<BankOutlined />}
                editing={editingSection === "business"}
                saving={savingSection === "business"}
                changedCount={editingSection === "business" ? changedFieldCount : 0}
                editDisabled={Boolean(editingSection && editingSection !== "business")}
                onEdit={() => requestOpenSection("business")}
                onCancel={closeSection}
                onSave={() => submitCurrentForm("business")}
              >
                {editingSection === "business" ? (
                  <Form
                    form={businessForm}
                    layout="vertical"
                    onValuesChange={(_, allValues) =>
                      handleSectionValuesChange("business", allValues)
                    }
                    onFinish={(values) => saveSection("business", values)}
                  >
                    <Alert
                      showIcon
                      type="info"
                      message="Manager email is a single source of truth"
                      description="Saving the email should update the branch email, manager login email and invitation email through the backend transaction included in this package."
                      style={{ marginBottom: 18, borderRadius: 12 }}
                    />
                    <Row gutter={[14, 0]}>
                      <Col xs={24} md={12}>
                        <Form.Item name="owner_name" label="Owner / manager name">
                          <Input placeholder="Full name" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="contact_person" label="Contact person">
                          <Input placeholder="Contact person" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="email"
                          label="Manager email"
                          rules={[
                            { type: "email", message: "Enter a valid email address." },
                            ...(isMain
                              ? [{ required: true, message: "Manager email is required." }]
                              : []),
                          ]}
                        >
                          <Input prefix={<MailOutlined />} placeholder="manager@example.com" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="phone" label="Primary phone">
                          <Input placeholder="98XXXXXXXX" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="alternative_phone" label="Alternative phone">
                          <Input placeholder="Optional" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="business_type" label="Business type">
                          <Input placeholder="Courier / franchise / logistics" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="pan_vat_number" label="PAN / VAT number">
                          <Input placeholder="PAN / VAT number" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="registration_number" label="Registration number">
                          <Input placeholder="Registration number" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                ) : (
                  <Descriptions size="small" column={{ xs: 1, sm: 2 }}>
                    <Descriptions.Item label="Owner / manager">
                      {record.owner_name || record.manager?.name || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Contact person">
                      {record.contact_person || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Manager email">
                      {getManagerEmail(record) || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Primary phone">
                      {record.phone || record.manager?.phone || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Alternative phone">
                      {record.alternative_phone || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Business type">
                      {record.business_type || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="PAN / VAT">
                      {record.pan_vat_number || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Registration number">
                      {record.registration_number || "—"}
                    </Descriptions.Item>
                    {isMain ? (
                      <Descriptions.Item label="Account invitation" span={2}>
                        <BranchInvitationStatusTag branch={record} showEmail />
                      </Descriptions.Item>
                    ) : null}
                  </Descriptions>
                )}
              </EditableSectionCard>

              <EditableSectionCard
                title="Office location"
                description="Physical office or pickup point used by operations and routing."
                icon={<EnvironmentOutlined />}
                editing={editingSection === "office"}
                saving={savingSection === "office"}
                changedCount={editingSection === "office" ? changedFieldCount : 0}
                editDisabled={Boolean(editingSection && editingSection !== "office")}
                onEdit={() => requestOpenSection("office")}
                onCancel={closeSection}
                onSave={() => submitCurrentForm("office")}
              >
                {editingSection === "office" ? (
                  <Form
                    form={officeForm}
                    layout="vertical"
                    onValuesChange={(_, allValues) =>
                      handleSectionValuesChange("office", allValues)
                    }
                    onFinish={(values) => saveSection("office", values)}
                  >
                    <Form.Item
                      name="office_address"
                      label="Office address"
                      rules={[{ required: true, message: "Office address is required." }]}
                    >
                      <Input.TextArea rows={3} />
                    </Form.Item>
                    <Row gutter={[14, 0]}>
                      <Col xs={24} md={12}>
                        <Form.Item name="office_city" label="City">
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="office_area" label="Area">
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="office_street" label="Street">
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="office_landmark" label="Landmark">
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="office_latitude"
                          label="Latitude"
                          rules={[{ required: true, message: "Latitude is required." }]}
                        >
                          <InputNumber stringMode style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="office_longitude"
                          label="Longitude"
                          rules={[{ required: true, message: "Longitude is required." }]}
                        >
                          <InputNumber stringMode style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <CoverageRadiusMap
                      value={{
                        latitude: watchedOfficeLatitude,
                        longitude: watchedOfficeLongitude,
                      }}
                      radiusKm={0.5}
                      showExisting={false}
                      showBranches={false}
                      height={370}
                      onChange={(location) =>
                        officeForm.setFieldsValue({
                          office_latitude:
                            location.latitude ??
                            officeForm.getFieldValue("office_latitude"),
                          office_longitude:
                            location.longitude ??
                            officeForm.getFieldValue("office_longitude"),
                          office_address:
                            location.address ||
                            officeForm.getFieldValue("office_address"),
                          office_city:
                            location.city || officeForm.getFieldValue("office_city"),
                          office_area:
                            location.area || officeForm.getFieldValue("office_area"),
                          office_street:
                            location.street ||
                            officeForm.getFieldValue("office_street"),
                          office_landmark:
                            location.landmark ||
                            officeForm.getFieldValue("office_landmark"),
                        })
                      }
                    />
                  </Form>
                ) : (
                  <Descriptions size="small" column={{ xs: 1, sm: 2 }}>
                    <Descriptions.Item label="Address" span={2}>
                      {record.office_address || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="City">
                      {record.office_city || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Area">
                      {record.office_area || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Street">
                      {record.office_street || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Landmark">
                      {record.office_landmark || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Latitude">
                      {record.office_latitude || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Longitude">
                      {record.office_longitude || "—"}
                    </Descriptions.Item>
                  </Descriptions>
                )}
              </EditableSectionCard>

              <EditableSectionCard
                title="Operations and services"
                description="Opening hours, operating days, capacity and available services."
                icon={<ShopOutlined />}
                editing={editingSection === "operations"}
                saving={savingSection === "operations"}
                changedCount={editingSection === "operations" ? changedFieldCount : 0}
                editDisabled={Boolean(editingSection && editingSection !== "operations")}
                onEdit={() => requestOpenSection("operations")}
                onCancel={closeSection}
                onSave={() => submitCurrentForm("operations")}
              >
                {editingSection === "operations" ? (
                  <Form
                    form={operationsForm}
                    layout="vertical"
                    onValuesChange={(_, allValues) =>
                      handleSectionValuesChange("operations", allValues)
                    }
                    onFinish={(values) => saveSection("operations", values)}
                  >
                    <Row gutter={[14, 0]}>
                      <Col xs={24} md={8}>
                        <Form.Item name="opening_time" label="Opening time">
                          <Input type="time" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item name="closing_time" label="Closing time">
                          <Input type="time" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item
                          name="daily_shipment_capacity"
                          label="Daily shipment capacity"
                        >
                          <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item name="operating_days" label="Operating days">
                      <Select
                        mode="multiple"
                        allowClear
                        maxTagCount="responsive"
                        options={OPERATING_DAY_OPTIONS}
                      />
                    </Form.Item>
                    <Row gutter={[12, 12]}>
                      <Col xs={12} md={6}>
                        <ServiceSwitch
                          form={operationsForm}
                          name="pickup_enabled"
                          title="Pickup"
                          description="Accept pickup requests."
                        />
                      </Col>
                      <Col xs={12} md={6}>
                        <ServiceSwitch
                          form={operationsForm}
                          name="delivery_enabled"
                          title="Delivery"
                          description="Handle parcel delivery."
                        />
                      </Col>
                      <Col xs={12} md={6}>
                        <ServiceSwitch
                          form={operationsForm}
                          name="pod_enabled"
                          title="POD"
                          description="Proof of delivery."
                        />
                      </Col>
                      <Col xs={12} md={6}>
                        <ServiceSwitch
                          form={operationsForm}
                          name="return_enabled"
                          title="Return"
                          description="Process returns."
                        />
                      </Col>
                    </Row>
                  </Form>
                ) : (
                  <Descriptions size="small" column={{ xs: 1, sm: 2 }}>
                    <Descriptions.Item label="Opening time">
                      {record.opening_time || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Closing time">
                      {record.closing_time || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Operating days" span={2}>
                      {record.operating_days?.length
                        ? record.operating_days.join(", ")
                        : "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Daily capacity">
                      {record.daily_shipment_capacity || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Services">
                      {services.length ? (
                        <Space size={[4, 6]} wrap>
                          {services.map(([label, color]) => (
                            <Tag key={label} color={color}>
                              {label}
                            </Tag>
                          ))}
                        </Space>
                      ) : (
                        "No services enabled"
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                )}
              </EditableSectionCard>

              {isMain ? (
                <Card
                  variant="borderless"
                  title={
                    <Space>
                      <TeamOutlined />
                      Sub-branches ({record.children?.length || 0})
                    </Space>
                  }
                  extra={
                    <Link
                      href={`/admin/branch-offices/create?type=sub_branch&parent_id=${record.id}`}
                    >
                      <Button type="primary" icon={<PlusOutlined />}>
                        Add sub-branch
                      </Button>
                    </Link>
                  }
                  style={{ borderRadius: 18, border: "1px solid #e5eaf0" }}
                >
                  <Table
                    rowKey="id"
                    size="small"
                    columns={childColumns}
                    dataSource={record.children || []}
                    pagination={false}
                    locale={{ emptyText: <Empty description="No sub-branches" /> }}
                  />
                </Card>
              ) : null}

              <Card
                variant="borderless"
                title={
                  <Space>
                    <FileTextOutlined />
                    Documents ({record.documents?.length || 0})
                  </Space>
                }
                style={{ borderRadius: 18, border: "1px solid #e5eaf0" }}
              >
                <Table
                  rowKey="id"
                  size="small"
                  columns={documentColumns}
                  dataSource={record.documents || []}
                  pagination={false}
                  locale={{ emptyText: "No documents uploaded." }}
                />
              </Card>

              <Card
                variant="borderless"
                title={
                  <Space>
                    <SafetyCertificateOutlined />
                    Agreements ({record.agreements?.length || 0})
                  </Space>
                }
                style={{ borderRadius: 18, border: "1px solid #e5eaf0" }}
              >
                <Table
                  rowKey="id"
                  size="small"
                  columns={agreementColumns}
                  dataSource={record.agreements || []}
                  pagination={false}
                  locale={{ emptyText: "No agreements found." }}
                />
              </Card>
            </Space>
          </Col>

          <Col xs={24} xl={8}>
            <div style={{ position: "sticky", top: 18 }}>
              <Space direction="vertical" size={18} style={{ width: "100%" }}>
                <Card
                  variant="borderless"
                  title={
                    <Space>
                      <EnvironmentOutlined />
                      Office map
                    </Space>
                  }
                  style={{ borderRadius: 18, border: "1px solid #e5eaf0" }}
                >
                  <CoverageRadiusMap
                    value={{
                      latitude: record.office_latitude || record.latitude,
                      longitude: record.office_longitude || record.longitude,
                    }}
                    radiusKm={record.coverage_radius_km || 1}
                    existingLocations={
                      record.coverage_location ? [record.coverage_location] : []
                    }
                    existingBranches={[record]}
                    showExisting
                    showBranches
                    height={430}
                    clickable={false}
                    showSearch={false}
                    onChange={() => {}}
                  />
                </Card>

                <Card
                  variant="borderless"
                  title={
                    <Space>
                      <CheckCircleOutlined />
                      Activation readiness
                    </Space>
                  }
                  extra={
                    <Tag color={readyForActivation ? "green" : "gold"}>
                      {readyCount}/{readiness.length} complete
                    </Tag>
                  }
                  style={{ borderRadius: 18, border: "1px solid #e5eaf0" }}
                >
                  <Space direction="vertical" size={10} style={{ width: "100%" }}>
                    {readiness.map((item) => (
                      <Row key={item.label} justify="space-between" align="middle">
                        <Col>
                          <Text>{item.label}</Text>
                        </Col>
                        <Col>
                          <Tag color={item.complete ? "green" : "red"}>
                            {item.complete ? "Complete" : "Missing"}
                          </Tag>
                        </Col>
                      </Row>
                    ))}
                  </Space>
                </Card>

                <Card
                  variant="borderless"
                  title={
                    <Space>
                      <CalendarOutlined />
                      Audit information
                    </Space>
                  }
                  style={{ borderRadius: 18, border: "1px solid #e5eaf0" }}
                >
                  <Descriptions size="small" column={1}>
                    <Descriptions.Item label="Created">
                      {formatDate(record.created_at)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Updated">
                      {formatDate(record.updated_at)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Approved">
                      {formatDate(record.approved_at)}
                    </Descriptions.Item>
                    {record.rejection_reason ? (
                      <Descriptions.Item label="Latest reason">
                        {record.rejection_reason}
                      </Descriptions.Item>
                    ) : null}
                  </Descriptions>
                </Card>
              </Space>
            </div>
          </Col>
        </Row>
      </Space>

      <Modal
        open={actionModal.open}
        title={
          actionModal.action
            ? `${actionModal.action.charAt(0).toUpperCase()}${actionModal.action.slice(1)} branch`
            : "Branch action"
        }
        okText="Confirm"
        confirmLoading={actionModal.submitting}
        okButtonProps={{
          danger: ["suspend", "reject"].includes(actionModal.action),
        }}
        onCancel={closeAction}
        onOk={submitAction}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Text>
            This action will update <strong>{record.name}</strong>.
          </Text>
          {["suspend", "reject"].includes(actionModal.action) ? (
            <Input.TextArea
              rows={4}
              value={actionModal.reason}
              placeholder={`Reason for ${actionModal.action}`}
              onChange={(event) =>
                setActionModal((previous) => ({
                  ...previous,
                  reason: event.target.value,
                }))
              }
            />
          ) : null}
        </Space>
      </Modal>
    </div>
  );
}
