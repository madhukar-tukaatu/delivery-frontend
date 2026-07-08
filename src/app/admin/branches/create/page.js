"use client";

import { Card, Space, Typography, message } from "antd";
import { useRouter } from "next/navigation";
import { createBranch } from "@/services/adminBranchService";
import BranchForm from "../BranchForm";

const { Title, Text } = Typography;

export default function CreateBranchPage() {
  const router = useRouter();

  const handleSubmit = async (payload) => {
    try {
      const branch = await createBranch(payload);

      message.success("Branch created successfully.");

      if (branch?.id) {
        router.push(`/admin/branches/${branch.id}`);
      } else {
        router.push("/admin/branches");
      }
    } catch (error) {
      const errors = error?.response?.data?.errors;
      const messageText =
        error?.response?.data?.message || "Could not create branch.";

      if (errors) {
        console.error(errors);
      }

      message.error(messageText);
      throw error;
    }
  };

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <Card bordered={false}>
        <Title level={3} style={{ margin: 0 }}>
          Create Branch
        </Title>

        <Text type="secondary">
          Create head branch, franchise branch, branch, sub-branch, pickup point,
          or delivery hub.
        </Text>
      </Card>

      <BranchForm mode="create" onSubmit={handleSubmit} />
    </Space>
  );
}