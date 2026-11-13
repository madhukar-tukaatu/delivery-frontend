"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  Input,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ShopOutlined,
  EyeOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { getMerchants } from "@/services/merchant/merchantService";
import { StatusTag } from "@/components/PageTools";
import { usePermissions } from "@/hooks/usePermission";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import ExportImportToolbar from "@/components/admin/ui/ExportImportToolbar";
import api from "@/lib/api";

const { Text } = Typography;

const MERCHANT_COLUMNS = [
  { key: "name", label: "Merchant / Store Name", required: true, sampleValue: "Himalayan Handicrafts" },
  { key: "owner_name", label: "Owner Name", required: false, sampleValue: "Sunil Shrestha" },
  { key: "phone", label: "Phone", required: true, sampleValue: "9851000000" },
  { key: "email", label: "Email", required: false, sampleValue: "himalayan@example.com" },
  { key: "city", label: "City", required: false, sampleValue: "Kathmandu" },
  { key: "address", label: "Address", required: false, sampleValue: "Thamel, Kathmandu" },
  { key: "pan_number", label: "PAN / VAT", required: false, sampleValue: "123456789" },
];

const SAMPLE_MERCHANT_ROWS = [
  {
    name: "Himalayan Handicrafts",
    owner_name: "Sunil Shrestha",
    phone: "9851000000",
    email: "himalayan@example.com",
    city: "Kathmandu",
    address: "Thamel, Kathmandu",
    pan_number: "123456789",
  },
  {
    name: "Pokhara Apparel",
    owner_name: "Anjali Gurung",
    phone: "9856000000",
    email: "pokhara.apparel@example.com",
    city: "Pokhara",
    address: "Lakeside, Pokhara",
    pan_number: "987654321",
  },
];

export default function MerchantsPage() {
  const router = useRouter();
  const { user, loading: authLoading, isSuperAdmin, branchId, can } = usePermissions();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const canViewMerchants = can("merchants.view");
  const canCreateMerchants = can("merchants.create");

  const load = useCallback(
    async (page = 1, pageSize = 15, currentSearch = "") => {
      if (!user || !canViewMerchants) return;
      if (!isSuperAdmin && !branchId) {
        setRows([]);
        setPagination({ current: 1, pageSize, total: 0 });
        message.warning("No branch is assigned to your account.");
        return;
      }

      setLoading(true);
      try {
        const params = {
          page,
          per_page: pageSize,
          ...(currentSearch ? { search: currentSearch } : {}),
        };

        const result = await getMerchants(params);
        setRows(result?.list ?? []);
        setPagination({
          current: result?.currentPage ?? page,
          pageSize: result?.pageSize ?? pageSize,
          total: result?.total ?? 0,
        });
      } catch (error) {
        message.error(error?.response?.data?.message ?? "Could not load merchants.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [user, canViewMerchants, isSuperAdmin, branchId]
  );

  useEffect(() => {
    if (authLoading || !user || !canViewMerchants) return;
    if (!isSuperAdmin && !branchId) return;
    load(1, pagination.pageSize, search);
  }, [authLoading, user, canViewMerchants, isSuperAdmin, branchId, load, pagination.pageSize, search]);

  const handleSearch = () => {
    const value = searchInput.trim();
    setSearch(value);
    load(1, pagination.pageSize, value);
  };

  const handleReset = () => {
    setSearchInput("");
    setSearch("");
    load(1, pagination.pageSize, "");
  };

  const handleImportMerchants = async (validRows) => {
    let successCount = 0;
    const errors = [];

    for (const row of validRows) {
      try {
        const payload = {
          name: row.name?.trim(),
          owner_name: row.owner_name?.trim() || undefined,
          phone: row.phone?.trim(),
          email: row.email?.trim() || undefined,
          city: row.city?.trim() || undefined,
          address: row.address?.trim() || undefined,
          pan_number: row.pan_number?.trim() || undefined,
          ...(branchId ? { default_branch_id: branchId } : {}),
        };
        await api.post("/admin/merchants", payload);
        successCount++;
      } catch (err) {
        errors.push(`${row.name || "Merchant"}: ${err?.response?.data?.message || "Failed"}`);
      }
    }

    if (errors.length > 0 && successCount === 0) {
      throw new Error(`Failed to import merchants: ${errors.slice(0, 3).join("; ")}`);
    }

    if (errors.length > 0) {
      message.warning(`Imported ${successCount} merchants. ${errors.length} failed.`);
    }
    load(1, pagination.pageSize, search);
    return { successCount, errors };
  };

  const handleExportAll = async () => {
    try {
      const params = {
        page: 1,
        per_page: 1000,
        ...(search ? { search } : {}),
      };
      const result = await getMerchants(params);
      return result?.list ?? rows;
    } catch {
      return rows;
    }
  };

  const columns = [
    {
      title: "Merchant / Store",
      dataIndex: "name",
      key: "name",
      render: (value, row) => (
        <Link
          href={`/admin/merchants/${row.id}`}
          onClick={(e) => e.stopPropagation()}
          style={{ textDecoration: "none" }}
        >
          <Text strong style={{ fontSize: 13, color: "#0891B2", cursor: "pointer" }}>
            {value || "-"}
          </Text>
          {row.owner_name && (
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Owner: {row.owner_name}
              </Text>
            </div>
          )}
        </Link>
      ),
    },
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
      render: (value) =>
        value ? (
          <Tag color="cyan" style={{ margin: 0, fontSize: 11 }}>
            {value}
          </Tag>
        ) : (
          "-"
        ),
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      render: (value) => (
        <Text style={{ fontSize: 12, fontFamily: "monospace" }}>
          {value || "-"}
        </Text>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (value) => (
        <Text style={{ fontSize: 12 }}>
          {value || "-"}
        </Text>
      ),
    },
    {
      title: "Branch",
      key: "branch",
      render: (_, row) => {
        const branch = row.default_branch ?? row.branch;
        if (!branch) return <Text type="secondary" style={{ fontSize: 11 }}>-</Text>;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            {branch.id ? (
              <Link href={`/admin/branch-offices/${branch.id}`} style={{ fontSize: 12, fontWeight: 500, color: "#0891B2" }}>
                {branch.name || "-"}
              </Link>
            ) : (
              <div style={{ fontSize: 12, fontWeight: 500 }}>{branch.name || "-"}</div>
            )}
            {branch.code && <div><Text type="secondary" style={{ fontSize: 10 }}>{branch.code}</Text></div>}
          </div>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => <StatusTag value={value} />,
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      render: (value) => (
        <Text type="secondary" style={{ fontSize: 11 }}>
          {value
            ? new Date(value).toLocaleDateString("en-NP", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "-"}
        </Text>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 70,
      align: "center",
      render: (_, row) => (
        <Link href={`/admin/merchants/${row.id}`} onClick={(e) => e.stopPropagation()}>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            style={{ color: "#0891B2" }}
            title="View merchant (open in new tab)"
          />
        </Link>
      ),
    },
  ];

  if (authLoading) {
    return (
      <Card loading>
        <Text>Loading merchant permissions...</Text>
      </Card>
    );
  }

  if (!user || !canViewMerchants) {
    return (
      <Card>
        <Text type="danger">Access Denied: You do not have permission to view merchants.</Text>
      </Card>
    );
  }

  return (
    <Space direction="vertical" size={10} style={{ width: "100%" }}>
      <AdminPageHeader
        title="Merchants / Stores"
        subtitle={
          isSuperAdmin
            ? "Manage all registered merchants, view stores, and bulk import/export accounts."
            : "Manage merchants assigned to your branch."
        }
        icon={<ShopOutlined />}
        breadcrumb={[{ title: "Admin" }, { title: "Merchants" }]}
        actions={
          <ExportImportToolbar
            entityTitle="Merchants"
            columns={MERCHANT_COLUMNS}
            data={rows}
            sampleRows={SAMPLE_MERCHANT_ROWS}
            onExportAll={handleExportAll}
            onImport={canCreateMerchants ? handleImportMerchants : null}
            onRefresh={() => load(pagination.current, pagination.pageSize, search)}
            loading={loading}
          />
        }
      />

      {/* Compact Search Bar */}
      <div className="admin-toolbar-row">
        <div className="admin-toolbar-left">
          <Input
            allowClear
            size="small"
            style={{ width: 260 }}
            placeholder="Search name, phone, or email..."
            prefix={<SearchOutlined style={{ color: "#94A3B8" }} />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onPressEnter={handleSearch}
          />
          <Button
            size="small"
            type="primary"
            onClick={handleSearch}
            style={{ background: "#0891B2", borderColor: "#0891B2" }}
          >
            Search
          </Button>
          {(search || searchInput) && (
            <Button size="small" onClick={handleReset}>
              Clear
            </Button>
          )}
        </div>
        <div className="admin-toolbar-right">
          <Text type="secondary" style={{ fontSize: 12 }}>
            Total: <strong>{pagination.total}</strong> merchants
          </Text>
        </div>
      </div>

      <Card className="admin-card" bodyStyle={{ padding: 0 }} style={{ width: "100%", overflow: "hidden" }}>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          size="small"
          className="admin-table-compact"
          scroll={{ x: 800 }}
          pagination={{
            ...pagination,
            size: "small",
            showSizeChanger: true,
            pageSizeOptions: ["15", "30", "50", "100"],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
            onChange: (p, ps) => load(p, ps, search),
          }}
          onRow={(row) => ({
            style: { cursor: "pointer" },
            onClick: () => router.push(`/admin/merchants/${row.id}`),
          })}
        />
      </Card>
    </Space>
  );
}
