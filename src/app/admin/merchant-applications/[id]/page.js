"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Alert, Button, Card, Col, Form, Image, Input,
  Modal, Row, Select, Space, Table, Tag, Tooltip, Typography, message,
} from "antd";
import {
  ArrowLeftOutlined, BankOutlined, CheckCircleOutlined,
  CopyOutlined, DownloadOutlined, EnvironmentOutlined,
  EyeOutlined, FileDoneOutlined, InfoCircleOutlined,
  ShopOutlined, StopOutlined,
} from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import {
  approveMerchantApplication, previewMerchantDocument,
  downloadMerchantDocument, getBranches, getMerchantApplication,
  rejectMerchantApplication, requestMerchantMoreInfo,
} from "@/services/adminMerchantApplicationService";

const MerchantApplicationMap = dynamic(
  () => import("@/components/maps/MerchantApplicationMap"),
  { ssr: false }
);

const { Text } = Typography;

const STATUS_CFG = {
  active:               { bg: "#f0fdf4", color: "#15803d", label: "Active" },
  approved:             { bg: "#f0fdf4", color: "#15803d", label: "Approved" },
  rejected:             { bg: "#fef2f2", color: "#b91c1c", label: "Rejected" },
  pending:              { bg: "#eff6ff", color: "#1d4ed8", label: "Pending" },
  onboarding:           { bg: "#eff6ff", color: "#1d4ed8", label: "Onboarding" },
  pending_verification: { bg: "#faf5ff", color: "#7c3aed", label: "Pending Verification" },
  under_review:         { bg: "#ecfeff", color: "#0e7490", label: "Under Review" },
  more_info_required:   { bg: "#fff7ed", color: "#c2410c", label: "Info Required" },
};

function StatusPill({ status }) {
  const norm = String(status || "").toLowerCase();
  const cfg  = STATUS_CFG[norm] || { bg: "#f3f4f6", color: "#374151", label: status || "—" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  );
}

function Field({ label, value, copy }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#1e293b", display: "flex", alignItems: "center", gap: 4 }}>
        {value || <span style={{ color: "#cbd5e1" }}>—</span>}
        {copy && value && (
          <Tooltip title="Copy">
            <CopyOutlined
              style={{ fontSize: 11, color: "#94a3b8", cursor: "pointer" }}
              onClick={() => { navigator.clipboard.writeText(value); message.success("Copied!"); }}
            />
          </Tooltip>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ icon, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
      <span style={{ color: "#6366f1", fontSize: 13 }}>{icon}</span>
      <Text style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{children}</Text>
    </div>
  );
}

function getBranchLabel(b) {
  if (!b) return "—";
  return [b.name, b.area, b.city].filter(Boolean).join(", ");
}

function getFileExt(name = "") { return String(name).split(".").pop()?.toLowerCase() || ""; }
function isImage(doc) {
  const m = String(doc?.mime_type || "").toLowerCase();
  return m.startsWith("image/") || ["jpg","jpeg","png","webp","gif"].includes(getFileExt(doc?.original_name));
}
function isPdf(doc) {
  const m = String(doc?.mime_type || "").toLowerCase();
  return m.includes("pdf") || getFileExt(doc?.original_name) === "pdf";
}

function DocThumb({ doc, onClick }) {
  const [url, setUrl]       = useState(null);
  const [busy, setBusy]     = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!doc?.id || !isImage(doc)) return;
    let obj = null; let active = true;
    setBusy(true);
    previewMerchantDocument(doc.id)
      .then(blob => { obj = URL.createObjectURL(blob); if (active) setUrl(obj); })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; if (obj) URL.revokeObjectURL(obj); };
  }, [doc?.id]);

  const base = {
    width: 44, height: 44, borderRadius: 6, border: "1px solid #e2e8f0",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", overflow: "hidden", flexShrink: 0,
  };

  if (busy) return <div style={{ ...base, background: "#f8fafc", fontSize: 10, color: "#94a3b8" }}>…</div>;
  if (isImage(doc) && url) return (
    <button type="button" onClick={onClick} style={{ ...base, padding: 0, background: "#fff" }}>
      <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </button>
  );
  return (
    <button type="button" onClick={onClick} style={{ ...base, background: failed ? "#fff1f0" : "#f8fafc" }}>
      <FileDoneOutlined style={{ fontSize: 18, color: failed ? "#cf1322" : "#6366f1" }} />
    </button>
  );
}

const REQUIRED_DOCS = ["business_registration", "pan_vat", "owner_id", "bank_proof"];

export default function AdminMerchantApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [merchant, setMerchant]       = useState(null);
  const [branches, setBranches]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [previewOpen, setPreviewOpen]       = useState(false);
  const [previewDoc, setPreviewDoc]         = useState(null);
  const [previewUrl, setPreviewUrl]         = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [rejectOpen, setRejectOpen]     = useState(false);
  const [moreInfoOpen, setMoreInfoOpen] = useState(false);

  const [form]         = Form.useForm();
  const [rejectForm]   = Form.useForm();
  const [moreInfoForm] = Form.useForm();

  const cleanPreview = useCallback(() => {
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
  }, [previewUrl]);

  const load = useCallback(async () => {
    try {
      setPageLoading(true);
      const [m, b] = await Promise.all([getMerchantApplication(params.id), getBranches()]);
      setMerchant(m);
      setBranches(b || []);
      form.setFieldsValue({
        branch_id:     m?.default_branch_id     || m?.suggested_branch_id     || undefined,
        sub_branch_id: m?.default_sub_branch_id || m?.suggested_sub_branch_id || undefined,
      });
    } catch { message.error("Could not load merchant application."); }
    finally { setPageLoading(false); }
  }, [params.id, form]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const selectedBranchId = Form.useWatch("branch_id", form);

  const branchOptions = useMemo(() =>
    branches
      .filter(b => { const t = String(b.type||"").toLowerCase(); return t==="branch"||t==="main_branch"||!b.parent_id; })
      .map(b => ({ value: b.id, label: getBranchLabel(b) })),
  [branches]);

  const subBranchOptions = useMemo(() =>
    branches
      .filter(b => {
        const t = String(b.type||"").toLowerCase();
        if (t && t !== "sub_branch") return false;
        return selectedBranchId ? Number(b.parent_id) === Number(selectedBranchId) : (t==="sub_branch"||b.parent_id);
      })
      .map(b => ({ value: b.id, label: getBranchLabel(b) })),
  [branches, selectedBranchId]);

  const uploadedTypes  = useMemo(() => new Set((merchant?.documents||[]).map(d => d.document_type)), [merchant]);
  const missingDocs    = REQUIRED_DOCS.filter(t => !uploadedTypes.has(t));
  const canApprove     = missingDocs.length === 0 && merchant?.status !== "active" && merchant?.status !== "approved";

  const openDoc = async (doc) => {
    if (!doc?.id) return;
    try {
      setPreviewLoading(true); setPreviewDoc(doc); cleanPreview();
      const blob = await previewMerchantDocument(doc.id);
      setPreviewUrl(URL.createObjectURL(blob));
      setPreviewOpen(true);
    } catch { message.error("Could not load preview."); }
    finally { setPreviewLoading(false); }
  };

  const downloadDoc = async (doc) => {
    if (!doc?.id) return;
    try {
      const blob = await downloadMerchantDocument(doc.id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = doc.original_name || `${doc.document_type}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { message.error("Could not download document."); }
  };

  const handleApprove = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await approveMerchantApplication(params.id, values);
      message.success("Merchant approved and activated.");
      await load();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || "Could not approve merchant.");
    } finally { setLoading(false); }
  };

  const submitReject = async () => {
    try {
      const { reason } = await rejectForm.validateFields();
      setLoading(true);
      await rejectMerchantApplication(params.id, reason);
      message.success("Application rejected.");
      setRejectOpen(false); rejectForm.resetFields(); await load();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || "Could not reject.");
    } finally { setLoading(false); }
  };

  const submitMoreInfo = async () => {
    try {
      const { msg } = await moreInfoForm.validateFields();
      setLoading(true);
      await requestMerchantMoreInfo(params.id, msg);
      message.success("Information request sent.");
      setMoreInfoOpen(false); moreInfoForm.resetFields(); await load();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || "Could not send request.");
    } finally { setLoading(false); }
  };

  if (pageLoading) return <Card loading style={{ minHeight: 400 }} />;
  if (!merchant)   return <Card><Alert type="error" message="Application not found." showIcon /></Card>;

  const docColumns = [
    {
      key: "thumb", width: 56,
      render: (_, doc) => <DocThumb doc={doc} onClick={() => openDoc(doc)} />,
    },
    {
      title: "Document", key: "doc",
      render: (_, doc) => (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>
            {String(doc.document_type||"").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>{doc.original_name || "—"}</div>
        </div>
      ),
    },
    {
      title: "Type", dataIndex: "mime_type", width: 110,
      render: v => <Text style={{ fontSize: 11, color: "#94a3b8" }}>{v || "—"}</Text>,
    },
    {
      title: "Status", dataIndex: "status", width: 100,
      render: v => <StatusPill status={v || "pending"} />,
    },
    {
      key: "actions", width: 72, align: "center",
      render: (_, doc) => (
        <Space size={4}>
          <Tooltip title="Preview">
            <Button type="text" size="small" icon={<EyeOutlined />}
              loading={previewLoading && previewDoc?.id === doc.id}
              onClick={() => openDoc(doc)} style={{ color: "#6366f1" }} />
          </Tooltip>
          <Tooltip title="Download">
            <Button type="text" size="small" icon={<DownloadOutlined />}
              onClick={() => downloadDoc(doc)} style={{ color: "#64748b" }} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>

      {/* ── Sticky action bar ── */}
      <Card bordered={false} styles={{ body: { padding: "10px 16px" } }}>
        <Row justify="space-between" align="middle" gutter={[8, 8]}>
          <Col>
            <Space size={10} align="center">
              <Button type="text" size="small" icon={<ArrowLeftOutlined />}
                onClick={() => router.back()} style={{ color: "#64748b", padding: "0 4px" }} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{merchant.name}</Text>
                  {merchant.merchant_id && <Text style={{ fontSize: 12, color: "#94a3b8" }}>#{merchant.merchant_id}</Text>}
                  <StatusPill status={merchant.status} />
                  {merchant.verification_status && (
                    <StatusPill status={merchant.verification_status} />
                  )}
                </div>
                {merchant.default_branch && (
                  <Text style={{ fontSize: 11, color: "#94a3b8" }}>
                    Branch: {merchant.default_branch.name}
                  </Text>
                )}
              </div>
            </Space>
          </Col>
          <Col>
            <Space size={6}>
              <Button size="small" icon={<InfoCircleOutlined />} onClick={() => setMoreInfoOpen(true)}>
                Request Info
              </Button>
              <Button size="small" danger icon={<StopOutlined />} onClick={() => setRejectOpen(true)}>
                Reject
              </Button>
              <Button size="small" type="primary" icon={<CheckCircleOutlined />}
                loading={loading} disabled={!canApprove} onClick={handleApprove}>
                Approve & Activate
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Inline alerts */}
        {merchant.more_info_message && (
          <Alert type="warning" showIcon message={merchant.more_info_message} style={{ marginTop: 8 }} banner />
        )}
        {merchant.rejected_reason && (
          <Alert type="error" showIcon message={merchant.rejected_reason} style={{ marginTop: 8 }} banner />
        )}
        {missingDocs.length > 0 && (
          <Alert type="warning" showIcon banner style={{ marginTop: 8 }}
            message={`Missing docs: ${missingDocs.map(d => d.replace(/_/g," ")).join(", ")}`} />
        )}
      </Card>

      {/* ── Business + Banking ── */}
      <Row gutter={12}>
        <Col xs={24} lg={14}>
          <Card bordered={false} styles={{ body: { padding: "14px 16px" } }}>
            <SectionTitle icon={<ShopOutlined />}>Business Profile</SectionTitle>
            <Row gutter={[16, 0]}>
              <Col span={12}><Field label="Legal Name"     value={merchant.name} /></Col>
              <Col span={12}><Field label="Owner"          value={merchant.owner_name} /></Col>
              <Col span={12}><Field label="Contact Person" value={merchant.contact_person} /></Col>
              <Col span={12}><Field label="Business Type"  value={merchant.business_type} /></Col>
              <Col span={12}><Field label="Email"  value={merchant.email}  copy /></Col>
              <Col span={12}><Field label="Phone"  value={merchant.phone}  copy /></Col>
              <Col span={12}><Field label="PAN / VAT" value={merchant.pan_vat_number} /></Col>
              <Col span={12}><Field label="Address"   value={merchant.address} /></Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card bordered={false} styles={{ body: { padding: "14px 16px" } }} style={{ height: "100%" }}>
            <SectionTitle icon={<BankOutlined />}>Banking Details</SectionTitle>
            <Field label="Bank Name"       value={merchant.bank_name} />
            <Field label="Account Name"    value={merchant.bank_account_name} />
            <Field label="Account Number"  value={merchant.bank_account_number} copy />
            <Field label="Bank Branch"     value={merchant.bank_branch} />
          </Card>
        </Col>
      </Row>

      {/* ── Logistics + Map ── */}
      <Card bordered={false} styles={{ body: { padding: "14px 16px" } }}>
        <SectionTitle icon={<EnvironmentOutlined />}>Logistics & Dispatch Hub</SectionTitle>
        <Row gutter={12}>
          <Col xs={24} lg={8}>
            <Field label="Pickup Address"
              value={merchant.pickup_location?.address || merchant.pickup_address} />
            <Field label="Coordinates"
              value={merchant.pickup_location?.latitude
                ? `${merchant.pickup_location.latitude}, ${merchant.pickup_location.longitude}`
                : null} />
            <Field label="Suggested Branch"     value={getBranchLabel(merchant.suggested_branch)} />
            <Field label="Suggested Sub-Branch" value={getBranchLabel(merchant.suggested_sub_branch)} />
          </Col>
          <Col xs={24} lg={16} style={{ minHeight: 280 }}>
            <MerchantApplicationMap
              merchant={merchant} branches={branches}
              showMerchantPin showBranchPins
            />
          </Col>
        </Row>
      </Card>

      {/* ── Branch assignment ── */}
      <Card bordered={false} styles={{ body: { padding: "14px 16px" } }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 10 }}>
          <SectionTitle icon={<EnvironmentOutlined />}>Branch Assignment</SectionTitle>
          <Text style={{ fontSize: 11, color: "#94a3b8" }}>Locked after approval</Text>
        </Row>
        <Form form={form} layout="vertical" size="small">
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="branch_id" label="Primary Branch"
                rules={[{ required: true, message: "Required" }]} style={{ marginBottom: 0 }}>
                <Select showSearch options={branchOptions} optionFilterProp="label"
                  placeholder="Select primary branch"
                  onChange={() => form.setFieldsValue({ sub_branch_id: undefined })} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="sub_branch_id" label="Sub-Branch (optional)" style={{ marginBottom: 0 }}>
                <Select allowClear showSearch options={subBranchOptions}
                  optionFilterProp="label" placeholder="Select sub-branch" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* ── KYC Documents ── */}
      <Card
        bordered={false}
        styles={{ body: { padding: 0 } }}
        title={
          <Space size={6} style={{ fontSize: 13 }}>
            <FileDoneOutlined style={{ color: "#6366f1" }} />
            <Text style={{ fontSize: 13, fontWeight: 600 }}>KYC Documents</Text>
            <Tag style={{ fontSize: 11 }}>{merchant.documents?.length || 0} uploaded</Tag>
          </Space>
        }
      >
        <Table
          rowKey="id"
          size="small"
          columns={docColumns}
          dataSource={merchant.documents || []}
          pagination={false}
          scroll={{ x: 600 }}
          locale={{ emptyText: <Text type="secondary" style={{ fontSize: 12 }}>No documents uploaded</Text> }}
        />
      </Card>

      {/* ── Document preview modal ── */}
      <Modal
        open={previewOpen}
        onCancel={() => { setPreviewOpen(false); cleanPreview(); }}
        title={
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{previewDoc?.original_name || "Document Preview"}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{previewDoc?.document_type} · {previewDoc?.mime_type}</div>
          </div>
        }
        footer={[
          <Button key="close" size="small" onClick={() => { setPreviewOpen(false); cleanPreview(); }}>Close</Button>,
          <Button key="dl" size="small" type="primary" icon={<DownloadOutlined />}
            onClick={() => downloadDoc(previewDoc)}>Download</Button>,
        ]}
        width={900} destroyOnClose
      >
        {previewLoading || !previewUrl ? <Card loading /> :
          isImage(previewDoc) ? (
            <div style={{ background: "#111", padding: 12, borderRadius: 8, textAlign: "center" }}>
              <Image src={previewUrl} alt="" style={{ maxHeight: "70vh", objectFit: "contain" }} preview={false} />
            </div>
          ) : isPdf(previewDoc) ? (
            <iframe src={previewUrl} title="PDF" style={{ width: "100%", height: "70vh", border: "none" }} />
          ) : (
            <Alert type="info" message="Preview not available — download to view." />
          )
        }
      </Modal>

      {/* ── Reject modal ── */}
      <Modal title="Reject Application" open={rejectOpen}
        onCancel={() => setRejectOpen(false)} onOk={submitReject}
        confirmLoading={loading} okText="Confirm Rejection" okButtonProps={{ danger: true }}>
        <Form form={rejectForm} layout="vertical" size="small">
          <Form.Item name="reason" label="Reason"
            rules={[{ required: true, message: "Please provide a reason" }]}>
            <Input.TextArea rows={4} placeholder="Detailed reason for rejection…" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── More info modal ── */}
      <Modal title="Request More Information" open={moreInfoOpen}
        onCancel={() => setMoreInfoOpen(false)} onOk={submitMoreInfo}
        confirmLoading={loading} okText="Send Request">
        <Form form={moreInfoForm} layout="vertical" size="small">
          <Form.Item name="msg" label="Message to Merchant"
            rules={[{ required: true, message: "Please enter your message" }]}>
            <Input.TextArea rows={4} placeholder="Specify what needs correction or clarification…" />
          </Form.Item>
        </Form>
      </Modal>

    </Space>
  );
}
