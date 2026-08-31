"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  Button,
  Card,
  Descriptions,
  Empty,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";

import {
  ArrowLeftOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  getBranchStaffMember,
} from "@/services/branchStaffService";

const {
  Title,
  Text,
} = Typography;

function branchLabel(branch) {
  if (!branch) {
    return "-";
  }

  if (typeof branch === "string") {
    return branch;
  }

  return [
    branch.name,
    branch.area,
  ]
    .filter(Boolean)
    .join(", ") || "-";
}

function roleLabel(user) {
  if (
    Array.isArray(user?.roles) &&
    user.roles.length
  ) {
    return user.roles
      .map((role) => role?.name)
      .filter(Boolean)
      .join(", ");
  }

  return (
    user?.role ||
    user?.user_type ||
    "-"
  );
}

export default function StaffDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  async function load() {
    try {
      setLoading(true);

      const result =
        await getBranchStaffMember(
          params.id
        );

      setUser(result);
    } catch (error) {
      console.error(error);

      message.error(
        error?.response?.data?.message ||
          "Could not load staff."
      );

      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params?.id) {
      load();
    }
  }, [params?.id]);

  if (loading) {
    return (
      <Card>
        <Space>
          <Spin />
          <Text>
            Loading staff...
          </Text>
        </Space>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <Empty description="Staff member not found" />

        <Button
          icon={
            <ArrowLeftOutlined />
          }
          onClick={() =>
            router.push(
              "/admin/staff"
            )
          }
        >
          Back to Staff
        </Button>
      </Card>
    );
  }

  const active =
    user.is_active ??
    user.active ??
    user.status === "active";

  return (
    <Space
      direction="vertical"
      size={16}
      style={{
        width: "100%",
      }}
    >
      <Card>
        <Space
          style={{
            width: "100%",
            justifyContent:
              "space-between",
          }}
        >
          <Space>
            <Button
              icon={
                <ArrowLeftOutlined />
              }
              onClick={() =>
                router.push(
                  "/admin/staff"
                )
              }
            />

            <div>
              <Title
                level={3}
                style={{
                  margin: 0,
                }}
              >
                {user.name ||
                  "Staff Member"}
              </Title>

              <Text type="secondary">
                Branch staff profile
              </Text>
            </div>
          </Space>

          <Button
            icon={
              <ReloadOutlined />
            }
            loading={loading}
            onClick={load}
          >
            Refresh
          </Button>
        </Space>
      </Card>

      <Card title="Staff Information">
        <Descriptions
          bordered
          column={1}
        >
          <Descriptions.Item label="Name">
            {user.name || "-"}
          </Descriptions.Item>

          <Descriptions.Item label="Email">
            {user.email || "-"}
          </Descriptions.Item>

          <Descriptions.Item label="Phone">
            {user.phone || "-"}
          </Descriptions.Item>

          <Descriptions.Item label="Role">
            <Tag>
              {roleLabel(user)}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Branch">
            {branchLabel(
              user.branch
            )}
          </Descriptions.Item>

          <Descriptions.Item label="Status">
            <Tag
              color={
                active
                  ? "green"
                  : "red"
              }
            >
              {active
                ? "ACTIVE"
                : "INACTIVE"}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Created">
            {user.created_at || "-"}
          </Descriptions.Item>

          <Descriptions.Item label="Updated">
            {user.updated_at || "-"}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </Space>
  );
}