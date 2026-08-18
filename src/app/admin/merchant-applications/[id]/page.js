"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Image,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  ApiOutlined,
  ArrowLeftOutlined,
  BankOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  DownloadOutlined,
  EditOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  FileDoneOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  RetweetOutlined,
  ShopOutlined,
  StopOutlined,
} from "@ant-design/icons";
import {
  useParams,
  useRouter,
} from "next/navigation";
import {
  approveMerchantApplication,
  previewMerchantDocument,
  downloadMerchantDocument,
  getBranches,
  getMerchantApplication,
  rejectMerchantApplication,
  requestMerchantMoreInfo,
  retryMerchantCallback,
  updateMerchantApplication,
  requestMerchantDocuments,
} from "@/services/adminMerchantApplicationService";
import { getEcho } from "@/lib/echo";

const MerchantApplicationMap = dynamic(
  () =>
    import(
      "@/components/maps/MerchantApplicationMap"
    ),
  {
    ssr: false,
  },
);

const { Text } = Typography;

const SERVICE_OPTIONS = [
  {
    value: "delivery_pricing",
    label: "Delivery Pricing",
  },
  {
    value: "quote_creation",
    label: "Quote Creation",
  },
  {
    value: "shipment_creation",
    label: "Shipment Creation",
  },
  {
    value: "tracking",
    label: "Tracking",
  },
  {
    value: "webhooks",
    label: "Webhooks",
  },
  {
    value: "pod",
    label: "Payment on Delivery",
  },
  {
    value: "returns",
    label: "Returns",
  },
];

const VALID_SERVICE_VALUES = new Set(
  SERVICE_OPTIONS.map(
    (option) => option.value,
  ),
);

const STATUS_CFG = {
  active: {
    bg: "#f0fdf4",
    color: "#15803d",
    label: "Active",
  },

  approved: {
    bg: "#f0fdf4",
    color: "#15803d",
    label: "Approved",
  },

  rejected: {
    bg: "#fef2f2",
    color: "#b91c1c",
    label: "Rejected",
  },

  pending: {
    bg: "#eff6ff",
    color: "#1d4ed8",
    label: "Pending",
  },

  onboarding: {
    bg: "#eff6ff",
    color: "#1d4ed8",
    label: "Onboarding",
  },

  pending_verification: {
    bg: "#faf5ff",
    color: "#7c3aed",
    label: "Pending Verification",
  },

  under_review: {
    bg: "#ecfeff",
    color: "#0e7490",
    label: "Under Review",
  },

  more_info_required: {
    bg: "#fff7ed",
    color: "#c2410c",
    label: "Info Required",
  },

  submitted: {
    bg: "#faf5ff",
    color: "#7c3aed",
    label: "Submitted",
  },

  pending_review: {
    bg: "#fff7ed",
    color: "#c2410c",
    label: "Pending Review",
  },

  delivered: {
    bg: "#f0fdf4",
    color: "#15803d",
    label: "Delivered",
  },

  failed: {
    bg: "#fef2f2",
    color: "#b91c1c",
    label: "Failed",
  },
};

function StatusPill({ status }) {
  const normalized =
    String(status || "").toLowerCase();

  const config =
    STATUS_CFG[normalized] || {
      bg: "#f3f4f6",
      color: "#374151",
      label: status || "—",
    };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        background: config.bg,
        color: config.color,
        whiteSpace: "nowrap",
      }}
    >
      {config.label}
    </span>
  );
}

function SourceTag({ source }) {
  const storeManager =
    source === "store_manager";

  return (
    <Tag
      color={
        storeManager
          ? "purple"
          : "blue"
      }
      icon={
        storeManager
          ? <ApiOutlined />
          : <GlobalOutlined />
      }
      style={{
        margin: 0,
        fontSize: 11,
      }}
    >
      {storeManager
        ? "Store Integration"
        : "Public Website"}
    </Tag>
  );
}

function Field({
  label,
  value,
  copy = false,
}) {
  return (
    <div
      style={{
        marginBottom: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#94a3b8",
          marginBottom: 2,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 13,
          color: "#1e293b",
          display: "flex",
          alignItems: "center",
          gap: 4,
          wordBreak: "break-word",
        }}
      >
        {value || (
          <span
            style={{
              color: "#cbd5e1",
            }}
          >
            —
          </span>
        )}

        {copy && value && (
          <Tooltip title="Copy">
            <CopyOutlined
              style={{
                fontSize: 11,
                color: "#94a3b8",
                cursor: "pointer",
              }}
              onClick={() => {
                navigator.clipboard.writeText(
                  String(value),
                );

                message.success("Copied!");
              }}
            />
          </Tooltip>
        )}
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  children,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 12,
      }}
    >
      <span
        style={{
          color: "#6366f1",
          fontSize: 13,
        }}
      >
        {icon}
      </span>

      <Text
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#0f172a",
        }}
      >
        {children}
      </Text>
    </div>
  );
}

function getBranchLabel(branch) {
  if (!branch) {
    return "—";
  }

  return [
    branch.name,
    branch.area,
    branch.city,
  ]
    .filter(Boolean)
    .join(", ");
}

function getFileExt(name = "") {
  return (
    String(name)
      .split(".")
      .pop()
      ?.toLowerCase() || ""
  );
}

function isImage(document) {
  const mime = String(
    document?.mime_type || "",
  ).toLowerCase();

  return (
    mime.startsWith("image/") ||
    [
      "jpg",
      "jpeg",
      "png",
      "webp",
      "gif",
    ].includes(
      getFileExt(
        document?.original_name,
      ),
    )
  );
}

function isPdf(document) {
  const mime = String(
    document?.mime_type || "",
  ).toLowerCase();

  return (
    mime.includes("pdf") ||
    getFileExt(
      document?.original_name,
    ) === "pdf"
  );
}

function DocThumb({
  doc,
  onClick,
}) {
  const [url, setUrl] =
    useState(null);

  const [busy, setBusy] =
    useState(false);

  const [failed, setFailed] =
    useState(false);

  useEffect(() => {
    if (!doc?.id || !isImage(doc)) {
      return undefined;
    }

    let objectUrl = null;
    let active = true;

    setBusy(true);
    setFailed(false);

    previewMerchantDocument(doc.id)
      .then((blob) => {
        objectUrl =
          URL.createObjectURL(blob);

        if (active) {
          setUrl(objectUrl);
        }
      })
      .catch(() => {
        if (active) {
          setFailed(true);
        }
      })
      .finally(() => {
        if (active) {
          setBusy(false);
        }
      });

    return () => {
      active = false;

      if (objectUrl) {
        URL.revokeObjectURL(
          objectUrl,
        );
      }
    };
  }, [doc?.id]);

  const baseStyle = {
    width: 44,
    height: 44,
    borderRadius: 6,
    border:
      "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    overflow: "hidden",
    flexShrink: 0,
  };

  if (busy) {
    return (
      <div
        style={{
          ...baseStyle,
          background: "#f8fafc",
          fontSize: 10,
          color: "#94a3b8",
        }}
      >
        …
      </div>
    );
  }

  if (isImage(doc) && url) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          ...baseStyle,
          padding: 0,
          background: "#fff",
        }}
      >
        <img
          src={url}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
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
        ...baseStyle,

        background: failed
          ? "#fff1f0"
          : "#f8fafc",
      }}
    >
      <FileDoneOutlined
        style={{
          fontSize: 18,

          color: failed
            ? "#cf1322"
            : "#6366f1",
        }}
      />
    </button>
  );
}

const REQUIRED_DOCS = [
  "business_registration",
  "pan_vat",
  "owner_id",
  "bank_proof",
];

export default function AdminMerchantApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [merchant, setMerchant] =
    useState(null);

  const [branches, setBranches] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [
    pageLoading,
    setPageLoading,
  ] = useState(true);

  const [
    realtimeConnected,
    setRealtimeConnected,
  ] = useState(false);

  const [
    previewOpen,
    setPreviewOpen,
  ] = useState(false);

  const [
    previewDoc,
    setPreviewDoc,
  ] = useState(null);

  const [
    previewUrl,
    setPreviewUrl,
  ] = useState(null);

  const [
    previewLoading,
    setPreviewLoading,
  ] = useState(false);

  const [
    rejectOpen,
    setRejectOpen,
  ] = useState(false);

  const [
    moreInfoOpen,
    setMoreInfoOpen,
  ] = useState(false);

  const [
    editOpen,
    setEditOpen,
  ] = useState(false);

  const [
    requestDocsOpen,
    setRequestDocsOpen,
  ] = useState(false);

  const [
    retryingCallback,
    setRetryingCallback,
  ] = useState(false);

  const [form] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const [moreInfoForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [requestDocsForm] = Form.useForm();

  const isStoreManager =
    merchant?.application_source ===
    "store_manager";

  const isApproved =
    ["active", "approved"].includes(
      String(
        merchant?.status || "",
      ).toLowerCase(),
    );

  const load = useCallback(
    async ({
      silent = false,
    } = {}) => {
      try {
        if (!silent) {
          setPageLoading(true);
        }

        const [
          merchantResult,
          branchResult,
        ] = await Promise.all([
          getMerchantApplication(
            params.id,
          ),

          getBranches(),
        ]);

        setMerchant(
          merchantResult,
        );

        setBranches(
          branchResult || [],
        );

        const requestedServices =
          Array.isArray(
            merchantResult
              ?.approved_services,
          ) &&
          merchantResult
            .approved_services.length
            ? merchantResult
                .approved_services
            : merchantResult
                ?.requested_services || [];

        form.setFieldsValue({
          branch_id:
            merchantResult
              ?.default_branch_id ||
            merchantResult
              ?.suggested_branch_id ||
            undefined,

          sub_branch_id:
            merchantResult
              ?.default_sub_branch_id ||
            merchantResult
              ?.suggested_sub_branch_id ||
            undefined,

          approved_services:
            requestedServices.filter(
              (service) =>
                VALID_SERVICE_VALUES.has(
                  service,
                ),
            ),
        });
      } catch (error) {
        console.error(
          "Could not load merchant application:",
          error,
        );

        if (!silent) {
          message.error(
            error?.response?.data
              ?.message ||
              "Could not load merchant application.",
          );
        }
      } finally {
        if (!silent) {
          setPageLoading(false);
        }
      }
    },
    [
      params.id,
      form,
    ],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const echo = getEcho();

    if (!echo) {
      return undefined;
    }

    const connection =
      echo?.connector?.pusher
        ?.connection;

    const connectedHandler =
      () => {
        setRealtimeConnected(true);
      };

    const disconnectedHandler =
      () => {
        setRealtimeConnected(false);
      };

    connection?.bind(
      "connected",
      connectedHandler,
    );

    connection?.bind(
      "disconnected",
      disconnectedHandler,
    );

    setRealtimeConnected(
      connection?.state ===
        "connected",
    );

    const channel =
      echo.private(
        "admin.merchant-applications",
      );

    const handleMerchantChange =
      (payload) => {
        if (
          Number(
            payload?.merchant_id,
          ) !==
          Number(params.id)
        ) {
          return;
        }

        console.info(
          "[Merchant Application Detail] realtime event",
          payload,
        );

        load({
          silent: true,
        });
      };

    channel.listen(
      ".merchant.application.changed",
      handleMerchantChange,
    );

    return () => {
      channel.stopListening(
        ".merchant.application.changed",
        handleMerchantChange,
      );

      echo.leave(
        "admin.merchant-applications",
      );

      connection?.unbind(
        "connected",
        connectedHandler,
      );

      connection?.unbind(
        "disconnected",
        disconnectedHandler,
      );
    };
  }, [
    params.id,
    load,
  ]);

  const cleanPreview =
    useCallback(() => {
      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl,
        );

        setPreviewUrl(null);
      }
    }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl,
        );
      }
    };
  }, [previewUrl]);

  const selectedBranchId =
    Form.useWatch(
      "branch_id",
      form,
    );

  const branchOptions =
    useMemo(
      () =>
        branches
          .filter((branch) => {
            const type = String(
              branch.type || "",
            ).toLowerCase();

            return (
              type === "branch" ||
              type === "main_branch" ||
              !branch.parent_id
            );
          })
          .map((branch) => ({
            value: branch.id,
            label:
              getBranchLabel(
                branch,
              ),
          })),
      [branches],
    );

  const subBranchOptions =
    useMemo(
      () =>
        branches
          .filter((branch) => {
            const type = String(
              branch.type || "",
            ).toLowerCase();

            if (
              type &&
              type !== "sub_branch"
            ) {
              return false;
            }

            if (
              selectedBranchId
            ) {
              return (
                Number(
                  branch.parent_id,
                ) ===
                Number(
                  selectedBranchId,
                )
              );
            }

            return (
              type === "sub_branch" ||
              branch.parent_id
            );
          })
          .map((branch) => ({
            value: branch.id,
            label:
              getBranchLabel(
                branch,
              ),
          })),
      [
        branches,
        selectedBranchId,
      ],
    );

  const uploadedTypes =
    useMemo(
      () =>
        new Set(
          (
            merchant?.documents ||
            []
          ).map(
            (document) =>
              document.document_type,
          ),
        ),
      [merchant],
    );

  const missingDocs =
    REQUIRED_DOCS.filter(
      (type) =>
        !uploadedTypes.has(type),
    );

  const pickupLocation =
    useMemo(() => {
      if (
        merchant?.pickup_location
      ) {
        return (
          merchant.pickup_location
        );
      }

      const locations =
        merchant?.pickup_locations ||
        merchant
          ?.pickupLocations ||
        [];

      return (
        locations.find(
          (location) =>
            location.is_default,
        ) ||
        locations[0] ||
        null
      );
    }, [merchant]);

  const isCallbackFailed =
    isStoreManager &&
    String(merchant?.integration_callback_status || "").toLowerCase() === "failed";

  const canApprove =
    missingDocs.length === 0 &&
    !isApproved;

  const openDoc = async (
    doc,
  ) => {
    if (!doc?.id) {
      return;
    }

    try {
      setPreviewLoading(true);
      setPreviewDoc(doc);
      cleanPreview();

      const blob =
        await previewMerchantDocument(
          doc.id,
        );

      setPreviewUrl(
        URL.createObjectURL(
          blob,
        ),
      );

      setPreviewOpen(true);
    } catch (error) {
      console.error(
        "Could not load preview:",
        error,
      );

      message.error(
        "Could not load preview.",
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const downloadDoc = async (
    doc,
  ) => {
    if (!doc?.id) {
      return;
    }

    try {
      const blob =
        await downloadMerchantDocument(
          doc.id,
        );

      const url =
        URL.createObjectURL(
          blob,
        );

      const anchor =
        document.createElement(
          "a",
        );

      anchor.href = url;

      anchor.download =
        doc.original_name ||
        `${doc.document_type}.pdf`;

      document.body.appendChild(
        anchor,
      );

      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(
        "Could not download document:",
        error,
      );

      message.error(
        "Could not download document.",
      );
    }
  };

  const handleApprove =
    async () => {
      try {
        const values =
          await form.validateFields();

        setLoading(true);

        const payload = {
          branch_id:
            values.branch_id,

          sub_branch_id:
            values.sub_branch_id ||
            null,
        };

        if (isStoreManager) {
          payload.approved_services =
            values.approved_services;
        }

        await approveMerchantApplication(
          params.id,
          payload,
        );

        message.success(
          isStoreManager
            ? "Store integration approved. API credentials and callback are being processed."
            : "Merchant approved and activated.",
        );

        await load({
          silent: true,
        });
      } catch (error) {
        if (
          error?.errorFields
        ) {
          return;
        }

        console.error(
          "Could not approve merchant:",
          error,
        );

        const validationErrors =
          error?.response?.data
            ?.errors;

        const firstError =
          validationErrors
            ? Object.values(
                validationErrors,
              )
                .flat()
                .find(Boolean)
            : null;

        message.error(
          firstError ||
            error?.response?.data
              ?.message ||
            "Could not approve merchant.",
        );
      } finally {
        setLoading(false);
      }
    };

  const submitReject =
    async () => {
      try {
        const { reason } =
          await rejectForm
            .validateFields();

        setLoading(true);

        await rejectMerchantApplication(
          params.id,
          reason,
        );

        message.success(
          "Application rejected.",
        );

        setRejectOpen(false);
        rejectForm.resetFields();

        await load({
          silent: true,
        });
      } catch (error) {
        if (
          error?.errorFields
        ) {
          return;
        }

        message.error(
          error?.response?.data
            ?.message ||
            "Could not reject application.",
        );
      } finally {
        setLoading(false);
      }
    };

  const submitMoreInfo =
    async () => {
      try {
        const {
          message:
            requestMessage,
        } =
          await moreInfoForm
            .validateFields();

        setLoading(true);

        await requestMerchantMoreInfo(
          params.id,
          requestMessage,
        );

        message.success(
          "Information request sent.",
        );

        setMoreInfoOpen(false);
        moreInfoForm.resetFields();

        await load({
          silent: true,
        });
      } catch (error) {
        if (
          error?.errorFields
        ) {
          return;
        }

        message.error(
          error?.response?.data
            ?.message ||
            "Could not send request.",
        );
      } finally {
        setLoading(false);
      }
    };

  const handleRetryCallback = async () => {
    try {
      setRetryingCallback(true);
      await retryMerchantCallback(params.id);
      message.success("Callback retry triggered.");
      await load({ silent: true });
    } catch (error) {
      message.error(
        error?.response?.data?.message || "Could not retry callback.",
      );
    } finally {
      setRetryingCallback(false);
    }
  };

  const openEditModal = () => {
    editForm.setFieldsValue({
      name: merchant.name,
      email: merchant.email,
      phone: merchant.phone,
      contact_person: merchant.contact_person,
      address: merchant.address,
      owner_name: merchant.owner_name,
    });
    setEditOpen(true);
  };

  const submitEdit = async () => {
    try {
      const values = await editForm.validateFields();
      setLoading(true);
      await updateMerchantApplication(params.id, values);
      message.success("Details updated.");
      setEditOpen(false);
      await load({ silent: true });
    } catch (error) {
      if (error?.errorFields) return;
      message.error(
        error?.response?.data?.message || "Could not update details.",
      );
    } finally {
      setLoading(false);
    }
  };

  const submitRequestDocs = async () => {
    try {
      const values = await requestDocsForm.validateFields();
      setLoading(true);
      await requestMerchantDocuments(params.id, values);
      message.success("Document request sent.");
      setRequestDocsOpen(false);
      requestDocsForm.resetFields();
      await load({ silent: true });
    } catch (error) {
      if (error?.errorFields) return;
      message.error(
        error?.response?.data?.message || "Could not send document request.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <Card
        loading
        style={{
          minHeight: 400,
        }}
      />
    );
  }

  if (!merchant) {
    return (
      <Card>
        <Alert
          type="error"
          message="Application not found."
          showIcon
        />
      </Card>
    );
  }

  const docColumns = [
    {
      key: "thumb",
      width: 56,

      render: (
        _,
        doc,
      ) => (
        <DocThumb
          doc={doc}
          onClick={() =>
            openDoc(doc)
          }
        />
      ),
    },

    {
      title: "Document",
      key: "document",

      render: (
        _,
        doc,
      ) => (
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#1e293b",
            }}
          >
            {String(
              doc.document_type ||
                "",
            )
              .replace(
                /_/g,
                " ",
              )
              .replace(
                /\b\w/g,
                (character) =>
                  character
                    .toUpperCase(),
              )}
          </div>

          <div
            style={{
              fontSize: 11,
              color: "#94a3b8",
            }}
          >
            {doc.original_name ||
              "—"}
          </div>
        </div>
      ),
    },

    {
      title: "Type",
      dataIndex: "mime_type",
      width: 120,

      render: (value) => (
        <Text
          style={{
            fontSize: 11,
            color: "#94a3b8",
          }}
        >
          {value || "—"}
        </Text>
      ),
    },

    {
      title: "Status",
      dataIndex: "status",
      width: 110,

      render: (value) => (
        <StatusPill
          status={
            value || "pending"
          }
        />
      ),
    },

    {
      key: "actions",
      width: 115,
      align: "center",

      render: (_, doc) => (
        <Space size={4}>
          <Tooltip title="Preview">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              loading={previewLoading && previewDoc?.id === doc.id}
              onClick={() => openDoc(doc)}
              style={{ color: "#6366f1" }}
            />
          </Tooltip>

          <Tooltip title="Download">
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => downloadDoc(doc)}
              style={{ color: "#64748b" }}
            />
          </Tooltip>

          <Tooltip title="Re-request this document">
            <Button
              type="text"
              size="small"
              icon={<RetweetOutlined />}
              onClick={() => {
                requestDocsForm.setFieldsValue({
                  document_types: [doc.document_type],
                  message: "",
                });
                setRequestDocsOpen(true);
              }}
              style={{ color: "#f59e0b" }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Space
      direction="vertical"
      size={12}
      style={{
        width: "100%",
      }}
    >
      <Card
        bordered={false}
        styles={{
          body: {
            padding: "10px 16px",
          },
        }}
      >
        <Row
          justify="space-between"
          align="middle"
          gutter={[8, 8]}
        >
          <Col>
            <Space
              size={10}
              align="center"
              wrap
            >
              <Button
                type="text"
                size="small"
                icon={
                  <ArrowLeftOutlined />
                }
                onClick={() =>
                  router.back()
                }
                style={{
                  color: "#64748b",
                  padding: "0 4px",
                }}
              />

              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems:
                      "center",
                    gap: 8,
                    flexWrap:
                      "wrap",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color:
                        "#0f172a",
                    }}
                  >
                    {merchant.name}
                  </Text>

                  <Text
                    style={{
                      fontSize: 12,
                      color:
                        "#94a3b8",
                    }}
                  >
                    #
                    {merchant
                      .application_number ||
                      merchant.id}
                  </Text>

                  <SourceTag
                    source={
                      merchant
                        .application_source
                    }
                  />

                  <StatusPill
                    status={
                      merchant.status
                    }
                  />

                  {merchant
                    .verification_status && (
                    <StatusPill
                      status={
                        merchant
                          .verification_status
                      }
                    />
                  )}

                  <Tag
                    color={
                      realtimeConnected
                        ? "success"
                        : "default"
                    }
                    style={{
                      margin: 0,
                      fontSize: 10,
                    }}
                  >
                    {realtimeConnected
                      ? "Live"
                      : "Connecting"}
                  </Tag>
                </div>

                {merchant
                  .default_branch && (
                  <Text
                    style={{
                      fontSize: 11,
                      color:
                        "#94a3b8",
                    }}
                  >
                    Branch:{" "}
                    {
                      merchant
                        .default_branch
                        .name
                    }
                  </Text>
                )}
              </div>
            </Space>
          </Col>

          <Col>
            <Space
              size={6}
              wrap
            >
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => load({ silent: true })}
              >
                Refresh
              </Button>

              {isStoreManager && (
                <Tooltip title={isCallbackFailed ? "Retry the failed callback" : "Callback has not failed"}>
                  <Button
                    size="small"
                    icon={<RetweetOutlined />}
                    loading={retryingCallback}
                    disabled={!isCallbackFailed}
                    onClick={handleRetryCallback}
                  >
                    Retry Callback
                  </Button>
                </Tooltip>
              )}

              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={openEditModal}
              >
                Edit Details
              </Button>

              <Button
                size="small"
                icon={<FileDoneOutlined />}
                onClick={() => setRequestDocsOpen(true)}
              >
                Request Docs
              </Button>

              <Button
                size="small"
                icon={<InfoCircleOutlined />}
                disabled={isApproved}
                onClick={() => setMoreInfoOpen(true)}
              >
                Request Info
              </Button>

              <Button
                size="small"
                danger
                icon={
                  <StopOutlined />
                }
                disabled={
                  isApproved
                }
                onClick={() =>
                  setRejectOpen(
                    true,
                  )
                }
              >
                Reject
              </Button>

              <Button
                size="small"
                type="primary"
                icon={
                  <CheckCircleOutlined />
                }
                loading={loading}
                disabled={
                  !canApprove
                }
                onClick={
                  handleApprove
                }
              >
                {isStoreManager
                  ? "Approve Integration"
                  : "Approve & Activate"}
              </Button>
            </Space>
          </Col>
        </Row>

        {merchant
          .more_info_message && (
          <Alert
            type="warning"
            showIcon
            banner
            style={{
              marginTop: 8,
            }}
            message={
              merchant
                .more_info_message
            }
          />
        )}

        {merchant
          .rejected_reason && (
          <Alert
            type="error"
            showIcon
            banner
            style={{
              marginTop: 8,
            }}
            message={
              merchant
                .rejected_reason
            }
          />
        )}

        {missingDocs.length >
          0 && (
          <Alert
            type="warning"
            showIcon
            banner
            style={{
              marginTop: 8,
            }}
            message={`Missing documents: ${missingDocs
              .map((document) =>
                document.replace(
                  /_/g,
                  " ",
                ),
              )
              .join(", ")}`}
          />
        )}
      </Card>

      <Row gutter={[12, 12]}>
        <Col
          xs={24}
          lg={14}
        >
          <Card
            bordered={false}
            styles={{
              body: {
                padding:
                  "14px 16px",
              },
            }}
          >
            <SectionTitle
              icon={
                <ShopOutlined />
              }
            >
              Business Profile
            </SectionTitle>

            <Row
              gutter={[16, 0]}
            >
              <Col span={12}>
                <Field
                  label="Legal Name"
                  value={
                    merchant.name
                  }
                />
              </Col>

              <Col span={12}>
                <Field
                  label="Owner"
                  value={
                    merchant
                      .owner_name
                  }
                />
              </Col>

              <Col span={12}>
                <Field
                  label="Contact Person"
                  value={
                    merchant
                      .contact_person
                  }
                />
              </Col>

              <Col span={12}>
                <Field
                  label="Business Type"
                  value={
                    merchant
                      .business_type
                  }
                />
              </Col>

              <Col span={12}>
                <Field
                  label="Email"
                  value={
                    merchant.email
                  }
                  copy
                />
              </Col>

              <Col span={12}>
                <Field
                  label="Phone"
                  value={
                    merchant.phone
                  }
                  copy
                />
              </Col>

              <Col span={12}>
                <Field
                  label="PAN / VAT"
                  value={
                    merchant
                      .pan_vat_number
                  }
                />
              </Col>

              <Col span={12}>
                <Field
                  label="Registration Number"
                  value={
                    merchant
                      .registration_number
                  }
                />
              </Col>

              <Col span={24}>
                <Field
                  label="Address"
                  value={
                    merchant.address
                  }
                />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col
          xs={24}
          lg={10}
        >
          <Card
            bordered={false}
            styles={{
              body: {
                padding:
                  "14px 16px",
              },
            }}
            style={{
              height: "100%",
            }}
          >
            <SectionTitle
              icon={
                <BankOutlined />
              }
            >
              Banking Details
            </SectionTitle>

            <Field
              label="Bank Name"
              value={
                merchant.bank_name
              }
            />

            <Field
              label="Account Name"
              value={
                merchant
                  .bank_account_name
              }
            />

            <Field
              label="Account Number"
              value={
                merchant
                  .bank_account_number
              }
              copy
            />

            <Field
              label="Bank Branch"
              value={
                merchant
                  .bank_branch
              }
            />
          </Card>
        </Col>
      </Row>

      {isStoreManager && (
        <Card
          bordered={false}
          styles={{
            body: {
              padding:
                "14px 16px",
            },
          }}
        >
          <SectionTitle
            icon={
              <ApiOutlined />
            }
          >
            Store Integration
          </SectionTitle>

          <Row gutter={[16, 0]}>
            <Col
              xs={24}
              md={8}
            >
              <Field
                label="Application Number"
                value={
                  merchant
                    .application_number
                }
                copy
              />
            </Col>

            <Col
              xs={24}
              md={8}
            >
              <Field
                label="External Store ID"
                value={
                  merchant
                    .external_store_id
                }
                copy
              />
            </Col>

            <Col
              xs={24}
              md={8}
            >
              <Field
                label="Platform"
                value={
                  merchant
                    .external_platform
                }
              />
            </Col>

            <Col
              xs={24}
              md={8}
            >
              <Field
                label="Store Category"
                value={
                  merchant
                    .store_category
                }
              />
            </Col>

            <Col
              xs={24}
              md={8}
            >
              <div
                style={{
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color:
                      "#94a3b8",
                    marginBottom: 4,
                  }}
                >
                  Integration Status
                </div>

                <StatusPill
                  status={
                    merchant
                      .integration_status
                  }
                />
              </div>
            </Col>

            <Col
              xs={24}
              md={8}
            >
              <div
                style={{
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color:
                      "#94a3b8",
                    marginBottom: 4,
                  }}
                >
                  Callback Status
                </div>

                <StatusPill
                  status={
                    merchant
                      .integration_callback_status ||
                    "pending"
                  }
                />
              </div>
            </Col>

            <Col span={24}>
              <Field
                label="Callback URL"
                value={
                  merchant
                    .integration_callback_url
                }
                copy
              />
            </Col>

            <Col span={24}>
              <div
                style={{
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color:
                      "#94a3b8",
                    marginBottom: 5,
                  }}
                >
                  Requested Services
                </div>

                <Space
                  size={[4, 4]}
                  wrap
                >
                  {(
                    merchant
                      .requested_services ||
                    []
                  ).length ? (
                    merchant
                      .requested_services
                      .map(
                        (service) => (
                          <Tag
                            key={
                              service
                            }
                            color="purple"
                            style={{
                              margin: 0,
                            }}
                          >
                            {SERVICE_OPTIONS.find(
                              (
                                option,
                              ) =>
                                option.value ===
                                service,
                            )?.label ||
                              service}
                          </Tag>
                        ),
                      )
                  ) : (
                    <Text
                      type="secondary"
                      style={{
                        fontSize: 12,
                      }}
                    >
                      No requested
                      services
                    </Text>
                  )}
                </Space>
              </div>
            </Col>
          </Row>
        </Card>
      )}

      <Card
        bordered={false}
        styles={{
          body: {
            padding: "14px 16px",
          },
        }}
      >
        <SectionTitle
          icon={
            <EnvironmentOutlined />
          }
        >
          Logistics & Dispatch Hub
        </SectionTitle>

        <Row gutter={[12, 12]}>
          <Col
            xs={24}
            lg={8}
          >
            <Field
              label="Pickup Name"
              value={
                pickupLocation?.name
              }
            />

            <Field
              label="Pickup Address"
              value={
                pickupLocation
                  ?.address ||
                merchant
                  .pickup_address
              }
            />

            <Field
              label="City / Area"
              value={[
                pickupLocation
                  ?.city ||
                  merchant
                    .pickup_city,

                pickupLocation
                  ?.area ||
                  merchant
                    .pickup_area,
              ]
                .filter(Boolean)
                .join(", ")}
            />

            <Field
              label="Coordinates"
              value={
                pickupLocation
                  ?.latitude ||
                merchant.pickup_lat
                  ? `${
                      pickupLocation
                        ?.latitude ||
                      merchant
                        .pickup_lat
                    }, ${
                      pickupLocation
                        ?.longitude ||
                      merchant
                        .pickup_lng
                    }`
                  : null
              }
            />

            <Field
              label="Suggested Branch"
              value={
                getBranchLabel(
                  merchant
                    .suggested_branch,
                )
              }
            />

            <Field
              label="Suggested Sub-Branch"
              value={
                getBranchLabel(
                  merchant
                    .suggested_sub_branch,
                )
              }
            />
          </Col>

          <Col
            xs={24}
            lg={16}
            style={{
              minHeight: 280,
            }}
          >
            <MerchantApplicationMap
              merchant={merchant}
              branches={branches}
              showMerchantPin
              showBranchPins
            />
          </Col>
        </Row>
      </Card>

      <Form
        form={form}
        layout="vertical"
        size="small"
      >
        <Card
          bordered={false}
          styles={{
            body: {
              padding:
                "14px 16px",
            },
          }}
        >
          <Row
            justify="space-between"
            align="middle"
            style={{
              marginBottom: 10,
            }}
          >
            <SectionTitle
              icon={
                <EnvironmentOutlined />
              }
            >
              Branch Assignment
            </SectionTitle>

            <Text
              style={{
                fontSize: 11,
                color: "#94a3b8",
              }}
            >
              Locked after approval
            </Text>
          </Row>

          <Row gutter={12}>
            <Col
              xs={24}
              md={12}
            >
              <Form.Item
                name="branch_id"
                label="Primary Branch"
                rules={[
                  {
                    required: true,
                    message:
                      "Select a primary branch.",
                  },
                ]}
                style={{
                  marginBottom: 0,
                }}
              >
                <Select
                  showSearch
                  options={
                    branchOptions
                  }
                  optionFilterProp="label"
                  placeholder="Select primary branch"
                  disabled={
                    isApproved
                  }
                  onChange={() => {
                    form.setFieldsValue(
                      {
                        sub_branch_id:
                          undefined,
                      },
                    );
                  }}
                />
              </Form.Item>
            </Col>

            <Col
              xs={24}
              md={12}
            >
              <Form.Item
                name="sub_branch_id"
                label="Sub-Branch (optional)"
                style={{
                  marginBottom: 0,
                }}
              >
                <Select
                  allowClear
                  showSearch
                  options={
                    subBranchOptions
                  }
                  optionFilterProp="label"
                  placeholder="Select sub-branch"
                  disabled={
                    isApproved
                  }
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {isStoreManager && (
          <Card
            bordered={false}
            styles={{
              body: {
                padding:
                  "14px 16px",
              },
            }}
            style={{
              marginTop: 12,
            }}
          >
            <SectionTitle
              icon={
                <ApiOutlined />
              }
            >
              Store Integration Approval
            </SectionTitle>

            <Alert
              type="info"
              showIcon
              style={{
                marginBottom: 14,
              }}
              message="The selected services will be assigned before Tukaatu sends API credentials to the Store callback URL. Delivery charges will use the active global Pricing Settings version."
            />

            <Row gutter={12}>
              <Col xs={24}>
                <Form.Item
                  name="approved_services"
                  label="Approved Services"
                  rules={[
                    {
                      required: true,
                      type: "array",
                      min: 1,
                      message:
                        "Select at least one approved service.",
                    },
                  ]}
                >
                  <Select
                    mode="multiple"
                    allowClear
                    optionFilterProp="label"
                    placeholder="Select approved services"
                    options={
                      SERVICE_OPTIONS
                    }
                    disabled={
                      isApproved
                    }
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        )}
      </Form>

      <Card
        bordered={false}
        styles={{
          body: {
            padding: 0,
          },
        }}
        title={
          <Space
            size={6}
            style={{
              fontSize: 13,
            }}
          >
            <FileDoneOutlined
              style={{
                color: "#6366f1",
              }}
            />

            <Text
              style={{
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              KYC Documents
            </Text>

            <Tag
              style={{
                fontSize: 11,
              }}
            >
              {merchant.documents
                ?.length || 0}{" "}
              uploaded
            </Tag>
          </Space>
        }
      >
        <Table
          rowKey="id"
          size="small"
          columns={docColumns}
          dataSource={
            merchant.documents ||
            []
          }
          pagination={false}
          scroll={{
            x: 650,
          }}
          locale={{
            emptyText: (
              <Text
                type="secondary"
                style={{
                  fontSize: 12,
                }}
              >
                No documents uploaded
              </Text>
            ),
          }}
        />
      </Card>

      <Modal
        open={previewOpen}
        onCancel={() => {
          setPreviewOpen(false);
          cleanPreview();
        }}
        title={
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {previewDoc
                ?.original_name ||
                "Document Preview"}
            </div>

            <div
              style={{
                fontSize: 11,
                color: "#94a3b8",
              }}
            >
              {previewDoc
                ?.document_type}{" "}
              ·{" "}
              {
                previewDoc
                  ?.mime_type
              }
            </div>
          </div>
        }
        footer={[
          <Button
            key="close"
            size="small"
            onClick={() => {
              setPreviewOpen(
                false,
              );

              cleanPreview();
            }}
          >
            Close
          </Button>,

          <Button
            key="download"
            size="small"
            type="primary"
            icon={
              <DownloadOutlined />
            }
            onClick={() =>
              downloadDoc(
                previewDoc,
              )
            }
          >
            Download
          </Button>,
        ]}
        width={900}
        destroyOnClose
      >
        {previewLoading ||
        !previewUrl ? (
          <Card loading />
        ) : isImage(
            previewDoc,
          ) ? (
          <div
            style={{
              background: "#111",
              padding: 12,
              borderRadius: 8,
              textAlign:
                "center",
            }}
          >
            <Image
              src={previewUrl}
              alt=""
              style={{
                maxHeight:
                  "70vh",
                objectFit:
                  "contain",
              }}
              preview={false}
            />
          </div>
        ) : isPdf(
            previewDoc,
          ) ? (
          <iframe
            src={previewUrl}
            title="PDF"
            style={{
              width: "100%",
              height: "70vh",
              border: "none",
            }}
          />
        ) : (
          <Alert
            type="info"
            message="Preview is not available. Download the file to view it."
          />
        )}
      </Modal>

      <Modal
        title="Reject Application"
        open={rejectOpen}
        onCancel={() => {
          setRejectOpen(false);
          rejectForm.resetFields();
        }}
        onOk={submitReject}
        confirmLoading={loading}
        okText="Confirm Rejection"
        okButtonProps={{
          danger: true,
        }}
      >
        <Form
          form={rejectForm}
          layout="vertical"
          size="small"
        >
          <Form.Item
            name="reason"
            label="Reason"
            rules={[
              {
                required: true,
                message:
                  "Please provide a reason.",
              },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Detailed reason for rejection…"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Request More Information"
        open={moreInfoOpen}
        onCancel={() => { setMoreInfoOpen(false); moreInfoForm.resetFields(); }}
        onOk={submitMoreInfo}
        confirmLoading={loading}
        okText="Send Request"
      >
        <Form form={moreInfoForm} layout="vertical" size="small">
          <Form.Item
            name="message"
            label="Message to Merchant"
            rules={[{ required: true, message: "Please enter your message." }]}
          >
            <Input.TextArea rows={4} placeholder="Specify what needs correction or clarification…" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Edit Merchant Details"
        open={editOpen}
        onCancel={() => { setEditOpen(false); editForm.resetFields(); }}
        onOk={submitEdit}
        confirmLoading={loading}
        okText="Save Changes"
        width={600}
      >
        <Form form={editForm} layout="vertical" size="small">
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="name" label="Legal Name" rules={[{ required: true, message: "Required." }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="owner_name" label="Owner">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="contact_person" label="Contact Person">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="phone" label="Phone">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="email" label="Email" rules={[{ type: "email", message: "Invalid email." }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="address" label="Address">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="Request Document Update"
        open={requestDocsOpen}
        onCancel={() => { setRequestDocsOpen(false); requestDocsForm.resetFields(); }}
        onOk={submitRequestDocs}
        confirmLoading={loading}
        okText="Send Request"
      >
        <Form form={requestDocsForm} layout="vertical" size="small">
          <Form.Item
            name="document_types"
            label="Documents to Re-request"
            rules={[{ required: true, type: "array", min: 1, message: "Select at least one document." }]}
          >
            <Checkbox.Group
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
              options={REQUIRED_DOCS.map((d) => ({
                value: d,
                label: d.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
              }))}
            />
          </Form.Item>
          <Form.Item
            name="message"
            label="Message to Merchant"
            rules={[{ required: true, message: "Please enter a message." }]}
          >
            <Input.TextArea rows={3} placeholder="Explain what needs to be resubmitted…" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}