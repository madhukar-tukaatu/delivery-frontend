"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Select,
  Steps,
  Typography,
  Upload,
  message,
  Space,
  Tag,
  Row,
  Col,
  Divider,
} from "antd";
import {
  UploadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";

import CoordinatePicker from "@/components/maps/CoordinatePicker";
import {
  getMerchantOnboarding,
  saveBusinessProfile,
  savePickupLocation,
  saveBankDetails,
  uploadMerchantDocument,
  submitMerchantForReview,
} from "@/services/merchantOnboardingService";

const { Title, Text } = Typography;

function normalizeError(error) {
  if (error?.errors || error?.message) {
    return error;
  }

  return {
    message: error?.response?.data?.message || "Request failed",
    errors: error?.response?.data?.errors || {},
  };
}

function applyValidationErrors(form, error) {
  const normalized = normalizeError(error);

  if (normalized?.errors && Object.keys(normalized.errors).length) {
    form.setFields(
      Object.entries(normalized.errors).map(([field, errors]) => ({
        name: field,
        errors: Array.isArray(errors) ? errors : [String(errors)],
      }))
    );
  }

  message.error(normalized?.message || "Please check the form and try again.");
}

function getStatusColor(status) {
  if (status === "active" || status === "approved") return "green";
  if (status === "rejected") return "red";
  if (status === "more_info_required") return "orange";
  if (status === "pending_verification" || status === "submitted") return "blue";
  return "default";
}

export default function MerchantOnboardingPage() {
  const [current, setCurrent] = useState(0);
  const [merchant, setMerchant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [businessForm] = Form.useForm();
  const [pickupForm] = Form.useForm();
  const [bankForm] = Form.useForm();

  const documentTypes = useMemo(
    () => [
      ["business_registration", "Business Registration Certificate"],
      ["pan_vat", "PAN/VAT Certificate"],
      ["owner_id", "Owner ID / Citizenship"],
      ["bank_proof", "Bank Proof / Cheque Copy"],
    ],
    []
  );

  const load = async () => {
    try {
      setPageLoading(true);

      const data = await getMerchantOnboarding();
      setMerchant(data);

      businessForm.setFieldsValue({
        business_name: data?.name || "",
        business_type: data?.business_type || undefined,
        pan_vat_number: data?.pan_vat_number || "",
        website_url: data?.website_url || "",
        business_address: data?.address || "",
        city: data?.city || "",
        area: data?.area || "",
      });

      pickupForm.setFieldsValue({
        name: data?.pickup_location?.name || "Default Pickup Location",
        contact_person: data?.pickup_location?.contact_person || data?.contact_person || "",
        phone: data?.pickup_location?.phone || data?.phone || "",
        address: data?.pickup_location?.address || data?.pickup_address || "",
        city: data?.pickup_location?.city || data?.pickup_city || "",
        area: data?.pickup_location?.area || data?.pickup_area || "",
        latitude: data?.pickup_location?.latitude || data?.pickup_lat || "",
        longitude: data?.pickup_location?.longitude || data?.pickup_lng || "",
      });

      bankForm.setFieldsValue({
        bank_name: data?.bank_name || "",
        bank_account_name: data?.bank_account_name || "",
        bank_account_number: data?.bank_account_number || "",
        bank_branch: data?.bank_branch || "",
      });
    } catch (error) {
      message.error("Could not load onboarding.");
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveBusiness = async (values) => {
    setLoading(true);

    try {
      const payload = {
        business_name: values.business_name,
        business_type: values.business_type,
        pan_vat_number: values.pan_vat_number,
        website_url: values.website_url || null,
        address: values.business_address,
        city: values.city,
        area: values.area,
      };

      await saveBusinessProfile(payload);

      message.success("Business profile saved.");
      await load();
      setCurrent(1);
    } catch (error) {
      applyValidationErrors(businessForm, error);
    } finally {
      setLoading(false);
    }
  };

  const savePickup = async (values) => {
    setLoading(true);

    try {
      const payload = {
        name: values.name || "Default Pickup Location",
        contact_person: values.contact_person,
        phone: values.phone,
        address: values.address,
        city: values.city,
        area: values.area,
        latitude: values.latitude,
        longitude: values.longitude,
      };

      await savePickupLocation(payload);

      message.success("Pickup location saved.");
      await load();
      setCurrent(2);
    } catch (error) {
      applyValidationErrors(pickupForm, error);
    } finally {
      setLoading(false);
    }
  };

  const saveBank = async (values) => {
    setLoading(true);

    try {
      const payload = {
        bank_name: values.bank_name,
        bank_account_name: values.bank_account_name,
        bank_account_number: values.bank_account_number,
        bank_branch: values.bank_branch || null,
      };

      await saveBankDetails(payload);

      message.success("Bank details saved.");
      await load();
      setCurrent(4);
    } catch (error) {
      applyValidationErrors(bankForm, error);
    } finally {
      setLoading(false);
    }
  };

  const uploadDoc = async ({ file, onSuccess, onError }, type) => {
    try {
      await uploadMerchantDocument(type, file);

      message.success("Document uploaded.");
      await load();
      onSuccess?.("ok");
    } catch (error) {
      const normalized = normalizeError(error);
      message.error(normalized?.message || "Document upload failed.");
      onError?.(error);
    }
  };

  const submitReview = async () => {
    setLoading(true);

    try {
      await submitMerchantForReview();

      message.success("Submitted for admin verification.");
      await load();
    } catch (error) {
      const normalized = normalizeError(error);
      message.error(normalized?.message || "Could not submit for review.");
    } finally {
      setLoading(false);
    }
  };

  const uploadedDocumentTypes = useMemo(() => {
    return new Set((merchant?.documents || []).map((item) => item.document_type));
  }, [merchant]);

  const missingDocuments = documentTypes.filter(
    ([type]) => !uploadedDocumentTypes.has(type)
  );

  const isApproved = merchant?.status === "active";
  const isSubmitted =
    merchant?.status === "pending_verification" ||
    merchant?.verification_status === "submitted" ||
    merchant?.verification_status === "under_review";

  if (pageLoading) {
    return (
      <Card loading>
        <div style={{ height: 200 }} />
      </Card>
    );
  }

  return (
    <Space direction="vertical" size={18} style={{ width: "100%" }}>
      <Card>
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Title level={3} style={{ margin: 0 }}>
            Merchant Onboarding
          </Title>

          <Text type="secondary">
            Complete your profile before creating shipments.
          </Text>

          <Space wrap>
            <Tag color={getStatusColor(merchant?.status)}>
              Status: {merchant?.status || "loading"}
            </Tag>

            <Tag color={getStatusColor(merchant?.verification_status)}>
              Verification: {merchant?.verification_status || "-"}
            </Tag>
          </Space>

          {isApproved && (
            <Alert
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              message="Your merchant account is approved."
              description="Shipment creation is unlocked."
            />
          )}

          {isSubmitted && !isApproved && (
            <Alert
              type="info"
              showIcon
              icon={<ClockCircleOutlined />}
              message="Your application is under review."
              description="Super Admin will verify your documents and assign your nearest branch/sub-branch."
            />
          )}

          {merchant?.more_info_message && (
            <Alert
              type="warning"
              showIcon
              icon={<ExclamationCircleOutlined />}
              message="More information required"
              description={merchant.more_info_message}
            />
          )}

          {merchant?.rejected_reason && (
            <Alert
              type="error"
              showIcon
              message="Application rejected"
              description={merchant.rejected_reason}
            />
          )}
        </Space>
      </Card>

      <Card>
        <Steps
          current={current}
          responsive
          items={[
            { title: "Business Profile" },
            { title: "Pickup Location" },
            { title: "Documents" },
            { title: "Bank Details" },
            { title: "Submit Review" },
          ]}
        />
      </Card>

      {current === 0 && (
        <Card title="Business Profile">
          <Form form={businessForm} layout="vertical" onFinish={saveBusiness}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="business_name"
                  label="Business Name"
                  rules={[{ required: true, message: "Business name is required" }]}
                >
                  <Input placeholder="ABC Fashion Store" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="business_type"
                  label="Business Type"
                  rules={[{ required: true, message: "Business type is required" }]}
                >
                  <Select
                    placeholder="Select business type"
                    options={[
                      { value: "Fashion", label: "Fashion" },
                      { value: "Electronics", label: "Electronics" },
                      { value: "Grocery", label: "Grocery" },
                      { value: "General Store", label: "General Store" },
                      { value: "Online Store", label: "Online Store" },
                      { value: "Other", label: "Other" },
                    ]}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="pan_vat_number"
                  label="PAN/VAT Number"
                  rules={[{ required: true, message: "PAN/VAT number is required" }]}
                >
                  <Input placeholder="PAN/VAT number" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="website_url"
                  label="Website URL"
                  rules={[
                    {
                      type: "url",
                      message: "Enter a valid URL like https://example.com",
                    },
                  ]}
                >
                  <Input placeholder="https://example.com" />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item
                  name="business_address"
                  label="Business Address"
                  rules={[
                    { required: true, message: "Business address is required" },
                  ]}
                >
                  <Input.TextArea rows={3} placeholder="Full business address" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="city"
                  label="City"
                  rules={[{ required: true, message: "City is required" }]}
                >
                  <Input placeholder="Lalitpur" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="area"
                  label="Area"
                  rules={[{ required: true, message: "Area is required" }]}
                >
                  <Input placeholder="Gwarko" />
                </Form.Item>
              </Col>
            </Row>

            <Button type="primary" htmlType="submit" loading={loading}>
              Save & Continue
            </Button>
          </Form>
        </Card>
      )}

      {current === 1 && (
        <Card title="Default Pickup Location">
          <Form form={pickupForm} layout="vertical" onFinish={savePickup}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="name"
                  label="Location Name"
                  rules={[{ required: true, message: "Location name is required" }]}
                >
                  <Input placeholder="Default Pickup Location" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="contact_person"
                  label="Contact Person"
                  rules={[
                    { required: true, message: "Contact person is required" },
                  ]}
                >
                  <Input placeholder="Contact person" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="phone"
                  label="Phone"
                  rules={[{ required: true, message: "Phone is required" }]}
                >
                  <Input placeholder="98XXXXXXXX" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="city"
                  label="City"
                  rules={[{ required: true, message: "City is required" }]}
                >
                  <Input placeholder="Lalitpur" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="area"
                  label="Area"
                  rules={[{ required: true, message: "Area is required" }]}
                >
                  <Input placeholder="Gwarko" />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item
                  name="address"
                  label="Pickup Address"
                  rules={[
                    { required: true, message: "Pickup address is required" },
                  ]}
                >
                  <Input.TextArea rows={3} placeholder="Full pickup address" />
                </Form.Item>
              </Col>
            </Row>

            <CoordinatePicker form={pickupForm} />

            <Divider />

            <Button type="primary" htmlType="submit" loading={loading}>
              Save & Continue
            </Button>
          </Form>
        </Card>
      )}

      {current === 2 && (
        <Card title="Required Documents">
          <Space direction="vertical" style={{ width: "100%" }} size={12}>
            {documentTypes.map(([type, label]) => {
              const doc = merchant?.documents?.find(
                (item) => item.document_type === type
              );

              return (
                <Card key={type} size="small">
                  <Row align="middle" justify="space-between" gutter={16}>
                    <Col xs={24} md={14}>
                      <Space direction="vertical" size={4}>
                        <Text strong>{label}</Text>

                        {doc ? (
                          <Space wrap>
                            <Tag color={getStatusColor(doc.status)}>
                              {doc.status}
                            </Tag>

                            {doc.original_name && (
                              <Text type="secondary">{doc.original_name}</Text>
                            )}
                          </Space>
                        ) : (
                          <Tag color="red">Not uploaded</Tag>
                        )}
                      </Space>
                    </Col>

                    <Col xs={24} md={10} style={{ textAlign: "right" }}>
                      <Upload
                        customRequest={(request) => uploadDoc(request, type)}
                        maxCount={1}
                        showUploadList={false}
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                      >
                        <Button icon={<UploadOutlined />}>
                          {doc ? "Replace Document" : "Upload"}
                        </Button>
                      </Upload>
                    </Col>
                  </Row>
                </Card>
              );
            })}

            {missingDocuments.length > 0 && (
              <Alert
                type="warning"
                showIcon
                message={`${missingDocuments.length} required document(s) missing`}
                description="You can continue filling the form, but you must upload all required documents before final submission."
              />
            )}

            <Button type="primary" onClick={() => setCurrent(3)}>
              Continue
            </Button>
          </Space>
        </Card>
      )}

      {current === 3 && (
        <Card title="Bank Details">
          <Form form={bankForm} layout="vertical" onFinish={saveBank}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="bank_name"
                  label="Bank Name"
                  rules={[{ required: true, message: "Bank name is required" }]}
                >
                  <Input placeholder="Bank name" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="bank_account_name"
                  label="Account Holder Name"
                  rules={[
                    { required: true, message: "Account holder name is required" },
                  ]}
                >
                  <Input placeholder="Account holder name" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="bank_account_number"
                  label="Account Number"
                  rules={[
                    { required: true, message: "Account number is required" },
                  ]}
                >
                  <Input placeholder="Account number" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item name="bank_branch" label="Bank Branch">
                  <Input placeholder="Bank branch" />
                </Form.Item>
              </Col>
            </Row>

            <Button type="primary" htmlType="submit" loading={loading}>
              Save & Continue
            </Button>
          </Form>
        </Card>
      )}

      {current === 4 && (
        <Card title="Submit for Review">
          <Space direction="vertical" size={14} style={{ width: "100%" }}>
            <Alert
              type="info"
              showIcon
              message="Final submission"
              description="After submission, Super Admin will verify your documents and assign your nearest branch/sub-branch."
            />

            {missingDocuments.length > 0 && (
              <Alert
                type="warning"
                showIcon
                message="Some documents are missing"
                description={missingDocuments.map(([, label]) => label).join(", ")}
              />
            )}

            <Button
              type="primary"
              loading={loading}
              onClick={submitReview}
              disabled={missingDocuments.length > 0 || isApproved || isSubmitted}
            >
              Submit for Verification
            </Button>
          </Space>
        </Card>
      )}
    </Space>
  );
}