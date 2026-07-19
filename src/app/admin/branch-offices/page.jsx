"use client";

import { useEffect, useMemo, useState } from "react";
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
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  HomeOutlined,
  ReloadOutlined,
  SaveOutlined,
  StopOutlined,
} from "@ant-design/icons";

import {
  activateBranch,
  approveBranch,
  createBranch,
  deleteBranch,
  getBranchParentOptions,
  getBranches,
  getCoverageLocations,
  rejectBranch,
  suspendBranch,
  updateBranch,
} from "@/services/branchAllocationApi";

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

const { Title, Text } = Typography;

const BRANCH_TYPES = [
  { value: "franchise_branch", label: "Franchise / Main Branch" },
  { value: "sub_branch", label: "Sub Branch" },
  { value: "pickup_point", label: "Pickup Point" },
  { value: "delivery_hub", label: "Delivery Hub" },
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

function normalizeRows(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

function makeCode(name, type) {
  const prefix =
    type === "franchise_branch"
      ? "FR"
      : type === "sub_branch"
      ? "SUB"
      : type === "pickup_point"
      ? "PICK"
      : "HUB";

  return (
    prefix +
    "-" +
    String(name || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

function isMainType(type) {
  return ["franchise_branch"].includes(type);
}

export default function BranchOfficesPage() {
  const [form] = Form.useForm();

  const [branches, setBranches] = useState([]);
  const [parentOptions, setParentOptions] = useState([]);
  const [coverageLocations, setCoverageLocations] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(null);
  const [activeTab, setActiveTab] = useState("franchise");

  const [actionModal, setActionModal] = useState({
    open: false,
    action: null,
    record: null,
    reason: "",
  });

  const type = Form.useWatch("type", form);
  const coverageLocationId = Form.useWatch("coverage_location_id", form);
  const officeLatitude = Form.useWatch("office_latitude", form);
  const officeLongitude = Form.useWatch("office_longitude", form);

  const officeMapValue = useMemo(
    () => ({
      latitude: officeLatitude,
      longitude: officeLongitude,
    }),
    [officeLatitude, officeLongitude]
  );

  const selectedCoverageLocation = useMemo(() => {
    return coverageLocations.find(
      (item) => Number(item.id) === Number(coverageLocationId)
    );
  }, [coverageLocations, coverageLocationId]);

  const filteredCoverageLocations = useMemo(() => {
    if (isMainType(type)) {
      return coverageLocations.filter(
        (item) => item.type === "main_branch_zone"
      );
    }

    return coverageLocations.filter((item) => item.type === "sub_branch_zone");
  }, [coverageLocations, type]);

  async function loadData() {
    try {
      setLoading(true);

      const [branchesResponse, coverageResponse] = await Promise.all([
        getBranches({ all: 1 }),
        getCoverageLocations({ all: 1 }),
      ]);

      setBranches(normalizeRows(branchesResponse));
      setCoverageLocations(normalizeRows(coverageResponse));
    } catch (error) {
      message.error(error?.response?.data?.message || "Could not load data.");
    } finally {
      setLoading(false);
    }
  }

  async function loadParentOptions(branchType) {
    if (!branchType || isMainType(branchType)) {
      setParentOptions([]);
      return;
    }

    try {
      const response = await getBranchParentOptions(branchType);
      setParentOptions(normalizeRows(response));
    } catch {
      setParentOptions([]);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadParentOptions(type);
  }, [type]);

  function resetForm(nextType = "franchise_branch") {
    setEditing(null);

    form.resetFields();

    form.setFieldsValue({
      type: nextType,
      status: "active",
      country: "Nepal",
      pickup_enabled: true,
      delivery_enabled: true,
      pod_enabled: true,
      return_enabled: true,
    });
  }

  useEffect(() => {
    resetForm("franchise_branch");
  }, []);

  function switchTab(key) {
    setActiveTab(key);

    if (key === "franchise") {
      resetForm("franchise_branch");
    }

    if (key === "sub") {
      resetForm("sub_branch");
    }

    if (key === "pickup") {
      resetForm("pickup_point");
    }

    if (key === "hub") {
      resetForm("delivery_hub");
    }
  }

  function onOfficeMapChange(location) {
    form.setFieldsValue({
      office_latitude: location.latitude ?? form.getFieldValue("office_latitude"),
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

  async function save() {
    try {
      const values = await form.validateFields();

      setSaving(true);

      const payload = {
        ...values,
        code: values.code || makeCode(values.name, values.type),
      };

      if (isMainType(payload.type)) {
        payload.parent_id = null;
      }

      if (editing?.id) {
        await updateBranch(editing.id, payload);
        message.success("Branch office updated.");
      } else {
        await createBranch(payload);
        message.success("Branch office created.");
      }

      await loadData();
      resetForm(payload.type);
    } catch (error) {
      if (error?.errorFields) return;

      message.error(
        error?.response?.data?.message || "Could not save branch office."
      );
    } finally {
      setSaving(false);
    }
  }

  function editRecord(record) {
    setEditing(record);

    form.setFieldsValue({
      parent_id: record.parent_id,
      coverage_location_id: record.coverage_location_id,

      type: record.type,
      name: record.name,
      code: record.code,
      legal_name: record.legal_name,
      owner_name: record.owner_name,
      contact_person: record.contact_person,
      email: record.email,
      phone: record.phone,
      alternative_phone: record.alternative_phone,
      pan_vat_number: record.pan_vat_number,
      registration_number: record.registration_number,
      business_type: record.business_type,
      status: record.status,

      country: record.country || "Nepal",
      province: record.province,
      district: record.district,
      city: record.city,
      area: record.area,
      address: record.address,
      landmark: record.landmark,

      office_address: record.office_address,
      office_city: record.office_city,
      office_area: record.office_area,
      office_street: record.office_street,
      office_landmark: record.office_landmark,
      office_latitude: record.office_latitude,
      office_longitude: record.office_longitude,

      daily_shipment_capacity: record.daily_shipment_capacity,
      pickup_enabled: record.pickup_enabled,
      delivery_enabled: record.delivery_enabled,
      pod_enabled: record.pod_enabled,
      return_enabled: record.return_enabled,
      manager_user_id: record.manager_user_id,
    });

    if (record.type === "franchise_branch") setActiveTab("franchise");
    if (record.type === "sub_branch") setActiveTab("sub");
    if (record.type === "pickup_point") setActiveTab("pickup");
    if (record.type === "delivery_hub") setActiveTab("hub");
  }

  async function removeRecord(id) {
    try {
      await deleteBranch(id);
      message.success("Branch office deleted.");
      await loadData();
    } catch (error) {
      message.error(
        error?.response?.data?.message || "Could not delete branch office."
      );
    }
  }

  function openAction(action, record) {
    setActionModal({
      open: true,
      action,
      record,
      reason: "",
    });
  }

  function closeAction() {
    setActionModal({
      open: false,
      action: null,
      record: null,
      reason: "",
    });
  }

  async function submitAction() {
    try {
      const { action, record, reason } = actionModal;

      if (!record?.id) return;

      if (action === "approve") {
        await approveBranch(record.id);
        message.success("Branch approved.");
      }

      if (action === "activate") {
        await activateBranch(record.id);
        message.success("Branch activated.");
      }

      if (action === "suspend") {
        await suspendBranch(record.id, reason || "Suspended from admin panel.");
        message.success("Branch suspended.");
      }

      if (action === "reject") {
        await rejectBranch(record.id, reason || "Rejected from admin panel.");
        message.success("Branch rejected.");
      }

      closeAction();
      await loadData();
    } catch (error) {
      message.error(error?.response?.data?.message || "Action failed.");
    }
  }

  function branchForm(formType) {
    const isMain = isMainType(formType);

    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card
            style={{ background: "#ffffff" }}
            title={
              editing
                ? "Edit Branch Office"
                : isMain
                ? "Create Franchise / Main Branch"
                : "Create Sub-Branch / Hub"
            }
            extra={
              <Button onClick={() => resetForm(formType)} icon={<ReloadOutlined />}>
                New
              </Button>
            }
          >
            <Form form={form} layout="vertical">
              <Form.Item hidden name="type">
                <Input />
              </Form.Item>

              {!isMain && (
                <Form.Item
                  label="Parent Franchise / Main Branch"
                  name="parent_id"
                  rules={[
                    {
                      required: true,
                      message: "Select parent branch.",
                    },
                  ]}
                >
                  <Select
                    showSearch
                    placeholder="Select parent branch"
                    optionFilterProp="label"
                    options={parentOptions.map((item) => ({
                      value: item.id,
                      label:
                        item.label || `${item.name} (${item.code || item.type})`,
                    }))}
                  />
                </Form.Item>
              )}

              <Form.Item
                label="Assigned Coverage Allocation"
                name="coverage_location_id"
                rules={[
                  {
                    required: true,
                    message: "Select assigned coverage allocation.",
                  },
                ]}
              >
                <Select
                  showSearch
                  placeholder={
                    isMain
                      ? "Select main branch allocation"
                      : "Select sub-branch allocation"
                  }
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
                    marginBottom: 16,
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <Descriptions
                    size="small"
                    column={1}
                    items={[
                      {
                        key: "type",
                        label: "Coverage Type",
                        children: selectedCoverageLocation.type,
                      },
                      {
                        key: "radius",
                        label: "Radius",
                        children: `${selectedCoverageLocation.coverage_radius_km} km`,
                      },
                      {
                        key: "point",
                        label: "Assigned Point",
                        children: `${selectedCoverageLocation.latitude}, ${selectedCoverageLocation.longitude}`,
                      },
                    ]}
                  />
                </Card>
              )}

              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Branch / Franchise Name"
                    name="name"
                    rules={[{ required: true }]}
                  >
                    <Input placeholder="Pokhara Franchise Branch" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Branch Code" name="code">
                    <Input placeholder="Auto or custom code" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Legal Business Name" name="legal_name">
                <Input />
              </Form.Item>

              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item label="Owner Name" name="owner_name">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Contact Person" name="contact_person">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item label="Email" name="email">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label="Phone"
                    name="phone"
                    rules={[
                      {
                        required: true,
                        message: "Phone is required.",
                      },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item label="Alternative Phone" name="alternative_phone">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Business Type" name="business_type">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item label="PAN/VAT Number" name="pan_vat_number">
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label="Registration Number"
                    name="registration_number"
                  >
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Status" name="status">
                <Select options={STATUS_OPTIONS} />
              </Form.Item>

              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="Office location"
                description="This is the actual physical office. It can be different from assigned coverage allocation."
              />

              <Form.Item
                label="Office Address"
                name="office_address"
                rules={[{ required: true }]}
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
                    label="Office Latitude"
                    name="office_latitude"
                    rules={[{ required: true }]}
                  >
                    <InputNumber style={{ width: "100%" }} stringMode />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label="Office Longitude"
                    name="office_longitude"
                    rules={[{ required: true }]}
                  >
                    <InputNumber style={{ width: "100%" }} stringMode />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Daily Shipment Capacity"
                    name="daily_shipment_capacity"
                  >
                    <InputNumber min={0} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
              </Row>

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

              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={save}
                block
              >
                Save Branch / Franchise
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} xl={14}>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Card
              title={
                <Space>
                  <HomeOutlined />
                  <span>Physical Office Location</span>
                </Space>
              }
              style={{ background: "#ffffff" }}
            >
              <CoverageRadiusMap
                value={officeMapValue}
                radiusKm={0.5}
                showExisting={false}
                showBranches={false}
                onChange={onOfficeMapChange}
              />
            </Card>

            <Card title="Assigned Coverage Preview" style={{ background: "#ffffff" }}>
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
                  selectedCoverageLocation
                    ? [selectedCoverageLocation]
                    : coverageLocations
                }
                showBranches={false}
                height={320}
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

  const columns = [
    {
      title: "Branch / Franchise",
      dataIndex: "name",
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Button
            type="link"
            style={{ padding: 0 }}
            onClick={() => editRecord(record)}
          >
            {text}
          </Button>
          <Text type="secondary">{record.code}</Text>
        </Space>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      render: (value) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: "Assigned Allocation",
      render: (_, record) => record.coverage_location?.name || "-",
    },
    {
      title: "Parent",
      render: (_, record) => record.parent?.name || "-",
    },
    {
      title: "Office",
      render: (_, record) => record.office_city || record.office_area || "-",
    },
    {
      title: "POD",
      dataIndex: "pod_enabled",
      render: (value) => (
        <Tag color={value ? "green" : "red"}>{value ? "Enabled" : "Off"}</Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (value) => (
        <Tag color={value === "active" ? "green" : "orange"}>{value}</Tag>
      ),
    },
    {
      title: "Action",
      render: (_, record) => (
        <Space wrap>
          <Button size="small" onClick={() => editRecord(record)}>
            Edit
          </Button>

          <Button
            size="small"
            icon={<CheckCircleOutlined />}
            onClick={() => openAction("approve", record)}
          >
            Approve
          </Button>

          <Button
            size="small"
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => openAction("activate", record)}
          >
            Activate
          </Button>

          <Button
            size="small"
            icon={<StopOutlined />}
            onClick={() => openAction("suspend", record)}
          >
            Suspend
          </Button>

          <Button
            size="small"
            danger
            icon={<CloseCircleOutlined />}
            onClick={() => openAction("reject", record)}
          >
            Reject
          </Button>

          <Popconfirm
            title="Delete branch office?"
            onConfirm={() => removeRecord(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ background: "#ffffff", minHeight: "100vh", padding: 20 }}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card style={{ background: "#ffffff" }}>
          <Space direction="vertical" size={4}>
            <Title level={3} style={{ margin: 0 }}>
              Franchise / Branch Office Setup
            </Title>

            <Text type="secondary">
              Kathmandu Head Office manages franchise branches, sub-branches, pickup points, and delivery hubs.
            </Text>
          </Space>
        </Card>

        <Tabs
          activeKey={activeTab}
          onChange={switchTab}
          items={[
            {
              key: "franchise",
              label: "Franchise / Main Branch",
              children: branchForm("franchise_branch"),
            },
            {
              key: "sub",
              label: "Sub-Branch",
              children: branchForm("sub_branch"),
            },
            {
              key: "pickup",
              label: "Pickup Point",
              children: branchForm("pickup_point"),
            },
            {
              key: "hub",
              label: "Delivery Hub",
              children: branchForm("delivery_hub"),
            },
            {
              key: "list",
              label: "Branch / Franchise List",
              children: (
                <Card
                  style={{ background: "#ffffff" }}
                  extra={
                    <Button onClick={loadData} icon={<ReloadOutlined />}>
                      Refresh
                    </Button>
                  }
                >
                  <Table
                    rowKey="id"
                    loading={loading}
                    columns={columns}
                    dataSource={branches}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 1400 }}
                  />
                </Card>
              ),
            },
            {
              key: "map",
              label: "Map View",
              children: (
                <Card style={{ background: "#ffffff" }}>
                  <CoverageRadiusMap
                    value={{}}
                    radiusKm={5}
                    existingLocations={coverageLocations}
                    existingBranches={branches}
                    showExisting
                    showBranches
                    height={650}
                    clickable={false}
                    showSearch={false}
                    onChange={() => {}}
                  />
                </Card>
              ),
            },
          ]}
        />

        <Modal
          open={actionModal.open}
          title={
            actionModal.action
              ? `${actionModal.action.toUpperCase()} Branch`
              : "Branch Action"
          }
          onCancel={closeAction}
          onOk={submitAction}
          okText="Confirm"
        >
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Text>
              Branch: <strong>{actionModal.record?.name}</strong>
            </Text>

            {["suspend", "reject"].includes(actionModal.action) && (
              <Input.TextArea
                rows={4}
                value={actionModal.reason}
                onChange={(event) =>
                  setActionModal((prev) => ({
                    ...prev,
                    reason: event.target.value,
                  }))
                }
                placeholder="Enter reason"
              />
            )}
          </Space>
        </Modal>
      </Space>
    </div>
  );
}