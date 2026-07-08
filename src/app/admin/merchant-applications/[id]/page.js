"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Image,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
  Tooltip,
  Divider,
} from "antd";
import {
  ArrowLeftOutlined,
  BankOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  FileDoneOutlined,
  InfoCircleOutlined,
  ShopOutlined,
  StopOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";

import {
  approveMerchantApplication,
  previewMerchantDocument,
  downloadMerchantDocument,
  getBranches,
  getMerchantApplication,
  rejectMerchantApplication,
  requestMerchantMoreInfo,
} from "@/services/adminMerchantApplicationService";

const MerchantApplicationMap = dynamic(
  () => import("@/components/maps/MerchantApplicationMap"),
  { ssr: false }
);



const { Title, Text } = Typography;

const STATUS_COLORS = {
  active: "green",
  approved: "green",
  rejected: "red",
  pending: "blue",
  pending_verification: "blue",
  under_review: "blue",
  more_info_required: "orange",
};

function getStatusColor(status) {
  return STATUS_COLORS[String(status || "").toLowerCase()] || "default";
}

function formatValue(value) {
  return value || "-";
}

function getFileExtension(name = "") {
  return String(name).split(".").pop()?.toLowerCase() || "";
}

function isImageDocument(doc) {
  const mime = String(doc?.mime_type || "").toLowerCase();
  const ext = getFileExtension(doc?.original_name);

  return (
    mime.startsWith("image/") ||
    ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)
  );
}

function isPdfDocument(doc) {
  const mime = String(doc?.mime_type || "").toLowerCase();
  const ext = getFileExtension(doc?.original_name);

  return mime === "application/pdf" || mime.includes("pdf") || ext === "pdf";
}

function getBranchLabel(branch) {
  if (!branch) return "-";
  return [branch.name, branch.area, branch.city].filter(Boolean).join(", ");
}

const copyToClipboard = (text, label) => {
  if (!text) return;

  navigator.clipboard.writeText(text);
  message.success(`${label} copied!`);
};

function DocumentImagePreview({ doc, onClick }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let active = true;

    async function loadImage() {
      if (!doc?.id || !isImageDocument(doc)) return;

      try {
        setLoading(true);
        setFailed(false);

        const blob = await previewMerchantDocument(doc.id);
        objectUrl = URL.createObjectURL(blob);

        if (active) {
          setImageUrl(objectUrl);
        }
      } catch (error) {
        console.error("Document image preview failed:", error);

        if (active) {
          setFailed(true);
          setImageUrl(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadImage();

    return () => {
      active = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [doc?.id, doc?.mime_type, doc?.original_name]);

  if (loading) {
    return (
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 8,
          background: "#f5f5f5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          color: "#999",
        }}
      >
        Loading
      </div>
    );
  }

  if (isImageDocument(doc) && imageUrl) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          width: 64,
          height: 64,
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 0,
          overflow: "hidden",
          cursor: "pointer",
          background: "#fff",
        }}
      >
        <img
          src={imageUrl}
          alt={doc.original_name || doc.document_type}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 64,
        height: 64,
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        background: failed ? "#fff1f0" : "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <FileDoneOutlined
        style={{
          fontSize: 24,
          color: failed ? "#cf1322" : "#1890ff",
        }}
      />
    </button>
  );
}

export default function AdminMerchantApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [merchant, setMerchant] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [moreInfoModalOpen, setMoreInfoModalOpen] = useState(false);

  const [form] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const [moreInfoForm] = Form.useForm();

  const cleanPreviewUrl = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  const load = useCallback(async () => {
    try {
      setPageLoading(true);

      const [merchantData, branchRows] = await Promise.all([
        getMerchantApplication(params.id),
        getBranches(),
      ]);

      setMerchant(merchantData);
      setBranches(branchRows || []);

      form.setFieldsValue({
        branch_id:
          merchantData?.default_branch_id ||
          merchantData?.suggested_branch_id ||
          undefined,
        sub_branch_id:
          merchantData?.default_sub_branch_id ||
          merchantData?.suggested_sub_branch_id ||
          undefined,
      });
    } catch (error) {
      console.error("Could not load merchant application:", error);
      message.error("Could not load merchant application.");
    } finally {
      setPageLoading(false);
    }
  }, [params.id, form]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const selectedBranchId = Form.useWatch("branch_id", form);

  const branchOptions = useMemo(() => {
    return branches
      .filter((branch) => {
        const type = String(branch.type || "").toLowerCase();
        return type === "branch" || type === "main_branch" || !branch.parent_id;
      })
      .map((branch) => ({
        value: branch.id,
        label: getBranchLabel(branch),
      }));
  }, [branches]);

  const subBranchOptions = useMemo(() => {
    return branches
      .filter((branch) => {
        const type = String(branch.type || "").toLowerCase();

        if (type && type !== "sub_branch") return false;

        if (selectedBranchId) {
          return Number(branch.parent_id) === Number(selectedBranchId);
        }

        return type === "sub_branch" || branch.parent_id;
      })
      .map((branch) => ({
        value: branch.id,
        label: getBranchLabel(branch),
      }));
  }, [branches, selectedBranchId]);

  const requiredDocuments = [
    "business_registration",
    "pan_vat",
    "owner_id",
    "bank_proof",
  ];

  const uploadedTypes = useMemo(() => {
    return new Set((merchant?.documents || []).map((doc) => doc.document_type));
  }, [merchant]);

  const missingDocuments = requiredDocuments.filter(
    (type) => !uploadedTypes.has(type)
  );

  const canApprove =
    missingDocuments.length === 0 &&
    merchant?.status !== "active" &&
    merchant?.status !== "approved";

  const openDocument = async (doc) => {
    if (!doc?.id) return;

    try {
      setPreviewLoading(true);
      setPreviewDoc(doc);
      cleanPreviewUrl();

      const blob = await previewMerchantDocument(doc.id);
      const objectUrl = URL.createObjectURL(blob);

      setPreviewUrl(objectUrl);
      setPreviewOpen(true);
    } catch (error) {
      console.error("Could not load document preview:", error);
      message.error("Could not load document preview.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const downloadDocument = async (doc) => {
    if (!doc?.id) return;

    try {
      const blob = await downloadMerchantDocument(doc.id);
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = doc.original_name || `${doc.document_type}.pdf`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("Could not download document:", error);
      message.error("Could not download document.");
    }
  };

  const closePreviewModal = () => {
    setPreviewOpen(false);
    cleanPreviewUrl();
  };

  const documentColumns = [
    {
      title: "Preview",
      key: "preview",
      width: 90,
      render: (_, doc) => (
        <DocumentImagePreview doc={doc} onClick={() => openDocument(doc)} />
      ),
    },
    {
      title: "Document",
      dataIndex: "document_type",
      key: "document_type",
      render: (value) => (
        <Space direction="vertical" size={0}>
          <Text strong>
            {String(value || "")
              .replaceAll("_", " ")
              .replace(/\b\w/g, (char) => char.toUpperCase())}
          </Text>

          <Text type="secondary" style={{ fontSize: 12 }}>
            {value}
          </Text>
        </Space>
      ),
    },
    {
      title: "File",
      dataIndex: "original_name",
      key: "original_name",
      render: (value, row) => (
        <Space direction="vertical" size={0}>
          <Text ellipsis style={{ maxWidth: 280 }}>
            {value || "-"}
          </Text>

          {row.mime_type && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {row.mime_type}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (value) => (
        <Tag color={getStatusColor(value)}>{value || "pending"}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      render: (_, row) => (
        <Space>
          <Tooltip title="Preview">
            <Button
              size="small"
              icon={<EyeOutlined />}
              loading={previewLoading && previewDoc?.id === row.id}
              onClick={() => openDocument(row)}
            />
          </Tooltip>

          <Tooltip title="Download">
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => downloadDocument(row)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const handleApprove = async () => {
    try {
      const values = await form.validateFields();

      setLoading(true);

      await approveMerchantApplication(params.id, values);

      message.success("Merchant approved and activated successfully.");
      await load();
    } catch (error) {
      if (error?.errorFields) return;

      message.error(
        error?.response?.data?.message || "Could not approve merchant."
      );
    } finally {
      setLoading(false);
    }
  };

  const submitReject = async () => {
    try {
      const values = await rejectForm.validateFields();

      setLoading(true);

      await rejectMerchantApplication(params.id, values.reason);

      message.success("Merchant application has been rejected.");
      setRejectModalOpen(false);
      rejectForm.resetFields();
      await load();
    } catch (error) {
      if (error?.errorFields) return;

      message.error(
        error?.response?.data?.message || "Could not reject merchant."
      );
    } finally {
      setLoading(false);
    }
  };

  const submitMoreInfo = async () => {
    try {
      const values = await moreInfoForm.validateFields();

      setLoading(true);

      await requestMerchantMoreInfo(params.id, values.message);

      message.success("Information request sent to merchant.");
      setMoreInfoModalOpen(false);
      moreInfoForm.resetFields();
      await load();
    } catch (error) {
      if (error?.errorFields) return;

      message.error(
        error?.response?.data?.message || "Could not request more information."
      );
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return <Card loading style={{ minHeight: "80vh" }} />;
  }

  if (!merchant) {
    return (
      <Card>
        <Alert type="error" message="Merchant application not found." showIcon />
      </Card>
    );
  }

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Card bordered={false}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Space direction="vertical" size={8}>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => router.back()}
                type="text"
              >
                Back to Applications
              </Button>

              <Title level={3} style={{ margin: 0 }}>
                {merchant.name}

                {merchant.merchant_id && (
                  <Text type="secondary" style={{ marginLeft: 12 }}>
                    #{merchant.merchant_id}
                  </Text>
                )}
              </Title>

              <Space wrap>
                <Tag
                  color={getStatusColor(merchant.status)}
                  style={{ fontSize: 14, padding: "4px 12px" }}
                >
                  {merchant.status?.toUpperCase()}
                </Tag>

                <Tag color={getStatusColor(merchant.verification_status)}>
                  Verification: {merchant.verification_status || "unverified"}
                </Tag>

                {merchant.default_branch && (
                  <Tag color="cyan">Hub: {merchant.default_branch.name}</Tag>
                )}
              </Space>
            </Space>
          </Col>

          <Col xs={24} md={8} style={{ textAlign: "right" }}>
            <Space wrap>
              <Button
                onClick={() => setMoreInfoModalOpen(true)}
                icon={<InfoCircleOutlined />}
              >
                Request Info
              </Button>

              <Button
                danger
                icon={<StopOutlined />}
                onClick={() => setRejectModalOpen(true)}
              >
                Reject
              </Button>

              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={loading}
                disabled={!canApprove}
                onClick={handleApprove}
                size="large"
              >
                Approve & Activate
              </Button>
            </Space>
          </Col>
        </Row>

        {merchant.more_info_message && (
          <Alert
            style={{ marginTop: 16 }}
            type="warning"
            showIcon
            message="More Information Requested"
            description={merchant.more_info_message}
          />
        )}

        {merchant.rejected_reason && (
          <Alert
            style={{ marginTop: 16 }}
            type="error"
            showIcon
            message="Application Rejected"
            description={merchant.rejected_reason}
          />
        )}

        {missingDocuments.length > 0 && (
          <Alert
            style={{ marginTop: 16 }}
            type="warning"
            showIcon
            message="Missing Mandatory Documents"
            description={`Please upload: ${missingDocuments
              .join(", ")
              .replaceAll("_", " ")}`}
          />
        )}
      </Card>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <ShopOutlined /> Business Profile
              </Space>
            }
            bordered={false}
          >
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Legal Name">
                {formatValue(merchant.name)}
              </Descriptions.Item>

              <Descriptions.Item label="Owner">
                {formatValue(merchant.owner_name)}
              </Descriptions.Item>

              <Descriptions.Item label="Contact Person">
                {formatValue(merchant.contact_person)}
              </Descriptions.Item>

              <Descriptions.Item label="Email">
                <Space>
                  {formatValue(merchant.email)}

                  {merchant.email && (
                    <Tooltip title="Copy Email">
                      <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => copyToClipboard(merchant.email, "Email")}
                      />
                    </Tooltip>
                  )}
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Phone">
                <Space>
                  {formatValue(merchant.phone)}

                  {merchant.phone && (
                    <Tooltip title="Copy Phone">
                      <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => copyToClipboard(merchant.phone, "Phone")}
                      />
                    </Tooltip>
                  )}
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Business Type">
                {formatValue(merchant.business_type)}
              </Descriptions.Item>

              <Descriptions.Item label="PAN / VAT">
                {formatValue(merchant.pan_vat_number)}
              </Descriptions.Item>

              <Descriptions.Item label="Address">
                {formatValue(merchant.address)}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <BankOutlined /> Banking Details
              </Space>
            }
            bordered={false}
            style={{ height: "100%" }}
          >
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Bank Name">
                {formatValue(merchant.bank_name)}
              </Descriptions.Item>

              <Descriptions.Item label="Account Name">
                {formatValue(merchant.bank_account_name)}
              </Descriptions.Item>

              <Descriptions.Item label="Account Number">
                {formatValue(merchant.bank_account_number)}
              </Descriptions.Item>

              <Descriptions.Item label="Branch">
                {formatValue(merchant.bank_branch)}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <Space>
            <EnvironmentOutlined /> Logistics & Dispatch Hub
          </Space>
        }
        bordered={false}
      >
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={10}>
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Pickup Address">
                {formatValue(
                  merchant.pickup_location?.address || merchant.pickup_address
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Coordinates">
                {merchant.pickup_location?.latitude
                  ? `${merchant.pickup_location.latitude}, ${merchant.pickup_location.longitude}`
                  : "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Suggested Branch">
                {getBranchLabel(merchant.suggested_branch)}
              </Descriptions.Item>

              <Descriptions.Item label="Suggested Sub-Branch">
                {getBranchLabel(merchant.suggested_sub_branch)}
              </Descriptions.Item>
            </Descriptions>
          </Col>

          <Col xs={24} lg={14} style={{ minHeight: 380 }}>
            <MerchantApplicationMap
              merchant={merchant}
              branches={branches}
              showMerchantPin={true}
              showBranchPins={true}
            />
          </Col>
        </Row>
      </Card>

      <Card
        title={
          <Space>
            <FileDoneOutlined /> KYC Documents
          </Space>
        }
        bordered={false}
        extra={
          <Text type="secondary">
            {merchant.documents?.length || 0} documents uploaded
          </Text>
        }
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Document preview"
          description="Image documents are loaded securely from private storage and shown as thumbnails below. Click a thumbnail or preview icon to open the full document."
        />

        <Table
          rowKey="id"
          columns={documentColumns}
          dataSource={merchant.documents || []}
          pagination={false}
          scroll={{ x: true }}
        />
      </Card>

      <Card title="Branch & Sub-Branch Assignment" bordered={false}>
        <Alert
          type="info"
          showIcon
          message="Permanent Routing Configuration"
          description="This assignment will be locked after approval."
          style={{ marginBottom: 20 }}
        />

        <Form form={form} layout="vertical">
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="branch_id"
                label="Primary Branch"
                rules={[
                  { required: true, message: "Primary branch is required" },
                ]}
              >
                <Select
                  showSearch
                  options={branchOptions}
                  optionFilterProp="label"
                  placeholder="Select primary branch"
                  onChange={() =>
                    form.setFieldsValue({ sub_branch_id: undefined })
                  }
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="sub_branch_id" label="Sub-Branch (Optional)">
                <Select
                  allowClear
                  showSearch
                  options={subBranchOptions}
                  optionFilterProp="label"
                  placeholder="Select sub-branch"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <Divider />

        <Space>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={loading}
            disabled={!canApprove}
            onClick={handleApprove}
          >
            Approve & Activate
          </Button>

          <Button onClick={() => setMoreInfoModalOpen(true)}>
            Request More Info
          </Button>

          <Button danger onClick={() => setRejectModalOpen(true)}>
            Reject Application
          </Button>
        </Space>
      </Card>

      <Modal
        title={
          <Space direction="vertical" size={0}>
            <Text strong>{previewDoc?.original_name || "Document Preview"}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {previewDoc?.document_type} · {previewDoc?.mime_type}
            </Text>
          </Space>
        }
        open={previewOpen}
        onCancel={closePreviewModal}
        footer={[
          <Button key="close" onClick={closePreviewModal}>
            Close
          </Button>,
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => downloadDocument(previewDoc)}
          >
            Download
          </Button>,
        ]}
        width={1000}
        destroyOnClose
      >
        {previewLoading || !previewUrl ? (
          <Card loading />
        ) : isImageDocument(previewDoc) ? (
          <div
            style={{
              background: "#111",
              padding: 16,
              borderRadius: 12,
              textAlign: "center",
            }}
          >
            <Image
              src={previewUrl}
              alt={previewDoc?.original_name || "Document"}
              style={{
                width: "100%",
                maxHeight: "75vh",
                objectFit: "contain",
              }}
              preview={false}
            />
          </div>
        ) : isPdfDocument(previewDoc) ? (
          <iframe
            src={previewUrl}
            title="PDF Preview"
            style={{
              width: "100%",
              height: "75vh",
              border: "none",
            }}
          />
        ) : (
          <Alert
            type="info"
            message="Preview not available"
            description="Download the file to view."
          />
        )}
      </Modal>

      <Modal
        title="Reject Application"
        open={rejectModalOpen}
        onCancel={() => setRejectModalOpen(false)}
        onOk={submitReject}
        confirmLoading={loading}
        okText="Confirm Rejection"
        okButtonProps={{ danger: true }}
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Rejection Reason"
            rules={[{ required: true, message: "Please provide a reason" }]}
          >
            <Input.TextArea
              rows={5}
              placeholder="Provide detailed reason for rejection..."
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Request More Information"
        open={moreInfoModalOpen}
        onCancel={() => setMoreInfoModalOpen(false)}
        onOk={submitMoreInfo}
        confirmLoading={loading}
        okText="Send Request"
      >
        <Form form={moreInfoForm} layout="vertical">
          <Form.Item
            name="message"
            label="Message to Merchant"
            rules={[{ required: true, message: "Please enter your request" }]}
          >
            <Input.TextArea
              rows={5}
              placeholder="Specify which documents or details need correction..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}