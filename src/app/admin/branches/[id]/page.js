"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Modal,
  Row,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import {
  activateBranch,
  approveBranch,
  getBranch,
  rejectBranch,
  suspendBranch,
  updateBranch,
} from "@/services/adminBranchService";
import BranchForm from "../BranchForm";

const { Title, Text } = Typography;

function prettify(value) {
  return String(value || "-").replaceAll("_", " ");
}

function getStatusColor(status) {
  const value = String(status || "").toLowerCase();

  if (value === "active" || value === "approved") return "green";
  if (value === "pending_review" || value === "draft") return "blue";
  if (value === "suspended") return "orange";
  if (value === "rejected" || value === "closed") return "red";

  return "default";
}

export default function BranchDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [branch, setBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const branchId = params.id;

  const loadBranch = useCallback(async () => {
    try {
      setLoading(true);

      const data = await getBranch(branchId);
      setBranch(data);
    } catch (error) {
      console.error("Could not load branch:", error);
      message.error("Could not load branch.");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    loadBranch();
  }, [loadBranch]);

  const handleSubmit = async (payload) => {
    try {
      setActionLoading(true);

      const updated = await updateBranch(branchId, payload);

      message.success("Branch updated successfully.");
      setBranch(updated);

      await loadBranch();
    } catch (error) {
      message.error(
        error?.response?.data?.message || "Could not update branch."
      );

      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const runAction = async (action, successMessage) => {
    try {
      setActionLoading(true);

      await action(branchId);

      message.success(successMessage);
      await loadBranch();
    } catch (error) {
      message.error(error?.response?.data?.message || "Action failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = () => {
    Modal.confirm({
      title: "Reject branch?",
      content: "This will mark the branch as rejected.",
      okText: "Reject",
      okButtonProps: { danger: true },
      onOk: async () => {
        await runAction(
          () => rejectBranch(branchId, "Rejected by admin."),
          "Branch rejected."
        );
      },
    });
  };

  const handleSuspend = () => {
    Modal.confirm({
      title: "Suspend branch?",
      content: "This will temporarily disable this branch.",
      okText: "Suspend",
      okButtonProps: { danger: true },
      onOk: async () => {
        await runAction(
          () => suspendBranch(branchId, "Suspended by admin."),
          "Branch suspended."
        );
      },
    });
  };

  if (loading) {
    return <Card loading style={{ minHeight: 400 }} />;
  }

  if (!branch) {
    return (
      <Card>
        <Alert type="error" showIcon message="Branch not found." />
      </Card>
    );
  }

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <Card bordered={false}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Space direction="vertical" size={8}>
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => router.push("/admin/branches")}
              >
                Back to Branches
              </Button>

              <Title level={3} style={{ margin: 0 }}>
                {branch.name}
              </Title>

              <Space wrap>
                <Tag color="blue">{branch.code || "No code"}</Tag>
                <Tag>{prettify(branch.type)}</Tag>
                <Tag color={getStatusColor(branch.status)}>
                  {prettify(branch.status)}
                </Tag>
              </Space>
            </Space>
          </Col>

          <Col>
            <Space wrap>
              <Button
                icon={<CheckCircleOutlined />}
                loading={actionLoading}
                onClick={() =>
                  runAction(approveBranch, "Branch approved successfully.")
                }
              >
                Approve
              </Button>

              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                loading={actionLoading}
                onClick={() =>
                  runAction(activateBranch, "Branch activated successfully.")
                }
              >
                Activate
              </Button>

              <Button
                danger
                icon={<PauseCircleOutlined />}
                loading={actionLoading}
                onClick={handleSuspend}
              >
                Suspend
              </Button>

              <Button
                danger
                icon={<StopOutlined />}
                loading={actionLoading}
                onClick={handleReject}
              >
                Reject
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card title="Current Branch Summary" bordered={false}>
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Parent Branch">
            {branch.parent?.name || "No parent / Main branch"}
          </Descriptions.Item>

          <Descriptions.Item label="Location">
            {[branch.area, branch.city, branch.district, branch.province]
              .filter(Boolean)
              .join(", ") || "-"}
          </Descriptions.Item>

          <Descriptions.Item label="Phone">
            {branch.phone || "-"}
          </Descriptions.Item>

          <Descriptions.Item label="Email">
            {branch.email || "-"}
          </Descriptions.Item>

          <Descriptions.Item label="Coordinates">
            {branch.latitude && branch.longitude
              ? `${branch.latitude}, ${branch.longitude}`
              : "-"}
          </Descriptions.Item>

          <Descriptions.Item label="Children">
            {branch.children?.length || 0}
          </Descriptions.Item>

          <Descriptions.Item label="Documents">
            {branch.documents?.length || 0}
          </Descriptions.Item>

          <Descriptions.Item label="Agreements">
            {branch.agreements?.length || 0}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <BranchForm
        mode="edit"
        initialValues={branch}
        loading={actionLoading}
        submitLabel="Update Branch"
        onSubmit={handleSubmit}
      />
    </Space>
  );
}