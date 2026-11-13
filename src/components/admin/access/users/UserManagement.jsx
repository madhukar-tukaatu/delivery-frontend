"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Button,
  Card,
  Drawer,
  Empty,
  message,
  Space,
  Typography,
} from "antd";

import {
  PlusOutlined,
  TeamOutlined,
} from "@ant-design/icons";

import {
  createUser,
  deleteUser,
  getRoles,
  getUser,
  getUsers,
  toggleUser,
  updateUser,
} from "@/services/admin/accessApi";

import UserTable from "./UserTable";
import UserForm from "./UserForm";
import UserDetails from "./UserDetails";
import UserFilters from "./UserFilters";
import UserRoleTabs from "./UserRoleTabs";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import ExportImportToolbar from "@/components/admin/ui/ExportImportToolbar";

const { Title, Text } = Typography;

const USER_COLUMNS = [
  { key: "name", label: "Full Name", required: true, sampleValue: "Anil Shrestha" },
  { key: "email", label: "Email Address", required: true, sampleValue: "anil.shrestha@example.com" },
  { key: "phone", label: "Phone", required: false, sampleValue: "9841000000" },
  { key: "role", label: "Role", required: true, sampleValue: "staff" },
  { key: "password", label: "Initial Password", required: false, sampleValue: "Password123!" },
  { key: "branch_id", label: "Branch ID", required: false, sampleValue: "" },
  { key: "status", label: "Status (active/inactive)", required: false, sampleValue: "active" },
];

const SAMPLE_USER_ROWS = [
  {
    name: "Anil Shrestha",
    email: "anil.shrestha@example.com",
    phone: "9841000000",
    role: "staff",
    password: "Password123!",
    branch_id: "",
    status: "active",
  },
  {
    name: "Dipendra Shah",
    email: "dipendra.shah@example.com",
    phone: "9851000000",
    role: "rider",
    password: "Password123!",
    branch_id: "",
    status: "active",
  },
];

export default function UserManagement() {
  const [roles, setRoles] = useState([]);

  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const [saving, setSaving] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Load Roles
  |--------------------------------------------------------------------------
  */

  const loadRoles = useCallback(async () => {
    try {
      setLoadingRoles(true);

      const data = await getRoles();

      setRoles(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (error) {
      console.error(error);

      message.error(
        error?.response?.data?.message ||
          "Failed to load roles."
      );

      setRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Load Users
  |--------------------------------------------------------------------------
  */

  const loadUsers = useCallback(
    async ({
      page = pagination.current,
      pageSize = pagination.pageSize,
      currentRole = role,
      currentSearch = search,
    } = {}) => {
      try {
        setLoading(true);

        const params = {
          page,
          per_page: pageSize,
        };

        if (currentSearch?.trim()) {
          params.q = currentSearch.trim();
        }

        if (
          currentRole &&
          currentRole !== "all"
        ) {
          params.role = currentRole;
        }

        const result = await getUsers(params);

        /*
        |--------------------------------------------------------------------------
        | Laravel pagination
        |--------------------------------------------------------------------------
        |
        | ApiResponse::success($query->paginate())
        |
        | normally returns:
        |
        | {
        |   data: {
        |     current_page,
        |     data: [],
        |     total,
        |     per_page
        |   }
        | }
        |
        */

        const rows = Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result)
            ? result
            : [];

        setUsers(rows);

        setPagination({
          current:
            result?.current_page ||
            page,

          pageSize:
            result?.per_page ||
            pageSize,

          total:
            result?.total ||
            0,
        });
      } catch (error) {
        console.error(error);

        message.error(
          error?.response?.data?.message ||
            "Failed to load users."
        );

        setUsers([]);
      } finally {
        setLoading(false);
      }
    },
    [
      pagination.current,
      pagination.pageSize,
      role,
      search,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | Initial Load
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    loadUsers({
      page: 1,
      pageSize: pagination.pageSize,
      currentRole: role,
      currentSearch: search,
    });
  }, [role, search]);

  /*
  |--------------------------------------------------------------------------
  | Role counts
  |--------------------------------------------------------------------------
  |
  | We use the currently loaded users for counts.
  | The actual filtering remains server-side.
  |
  */

  const userCounts = useMemo(() => {
    const counts = {
      all: users.length,
    };

    for (const item of users) {
      const names =
        item.roles?.map(
          (r) => r.name
        ) || [];

      if (
        !names.length &&
        item.role
      ) {
        names.push(item.role);
      }

      for (const name of names) {
        counts[name] =
          (counts[name] || 0) + 1;
      }
    }

    return counts;
  }, [users]);

  /*
  |--------------------------------------------------------------------------
  | Search
  |--------------------------------------------------------------------------
  */

  const handleSearchChange = (value) => {
    setSearch(value);

    setPagination((previous) => ({
      ...previous,
      current: 1,
    }));
  };

  /*
  |--------------------------------------------------------------------------
  | Role tab
  |--------------------------------------------------------------------------
  */

  const handleRoleChange = (value) => {
    setRole(value);

    setPagination((previous) => ({
      ...previous,
      current: 1,
    }));
  };

  /*
  |--------------------------------------------------------------------------
  | Edit
  |--------------------------------------------------------------------------
  */

  const handleEdit = async (user) => {
    try {
      setLoading(true);

      const fullUser = await getUser(user.id);

      if (!fullUser) {
        message.error(
          "Unable to load user details."
        );

        return;
      }

      setEditingUser(fullUser);
      setFormOpen(true);
    } catch (error) {
      console.error(error);

      message.error(
        error?.response?.data?.message ||
          "Failed to load user."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | View
  |--------------------------------------------------------------------------
  */

  const handleView = async (user) => {
    try {
      setLoading(true);

      const fullUser = await getUser(user.id);

      setSelectedUser(
        fullUser || user
      );

      setDetailsOpen(true);
    } catch (error) {
      console.error(error);

      setSelectedUser(user);
      setDetailsOpen(true);
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Create
  |--------------------------------------------------------------------------
  */

  const handleCreate = () => {
    setEditingUser(null);
    setFormOpen(true);
  };

  /*
  |--------------------------------------------------------------------------
  | Save
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (
    payload,
    originalUser
  ) => {
    try {
      setSaving(true);

      if (originalUser?.id) {
        await updateUser(
          originalUser.id,
          payload
        );

        message.success(
          "User updated successfully."
        );
      } else {
        await createUser(payload);

        message.success(
          "User created successfully."
        );
      }

      setFormOpen(false);
      setEditingUser(null);

      await loadUsers({
        page: pagination.current,
        pageSize: pagination.pageSize,
        currentRole: role,
        currentSearch: search,
      });
    } catch (error) {
      console.error(error);

      message.error(
        error?.response?.data?.message ||
          "Failed to save user."
      );

      throw error;
    } finally {
      setSaving(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Delete
  |--------------------------------------------------------------------------
  */

  const handleDelete = async (user) => {
    try {
      await deleteUser(user.id);

      message.success(
        "User deleted successfully."
      );

      await loadUsers({
        page: pagination.current,
        pageSize: pagination.pageSize,
        currentRole: role,
        currentSearch: search,
      });
    } catch (error) {
      console.error(error);

      message.error(
        error?.response?.data?.message ||
          "Failed to delete user."
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Toggle
  |--------------------------------------------------------------------------
  */

  const handleToggle = async (user) => {
    try {
      await toggleUser(user.id);

      message.success(
        "User status updated."
      );

      await loadUsers({
        page: pagination.current,
        pageSize: pagination.pageSize,
        currentRole: role,
        currentSearch: search,
      });
    } catch (error) {
      console.error(error);

      message.error(
        error?.response?.data?.message ||
          "Failed to update user status."
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Pagination
  |--------------------------------------------------------------------------
  */

  const handlePaginationChange = ({
    current,
    pageSize,
  }) => {
    setPagination((previous) => ({
      ...previous,
      current,
      pageSize,
    }));

    loadUsers({
      page: current,
      pageSize,
      currentRole: role,
      currentSearch: search,
    });
  };

  /*
  |--------------------------------------------------------------------------
  | Refresh
  |--------------------------------------------------------------------------
  */

  const refresh = () => {
    loadRoles();

    loadUsers({
      page: pagination.current,
      pageSize: pagination.pageSize,
      currentRole: role,
      currentSearch: search,
    });
  };

  const handleImportUsers = async (validRows) => {
    let successCount = 0;
    const errors = [];
    for (const row of validRows) {
      try {
        const payload = {
          name: row.name?.trim(),
          email: row.email?.trim(),
          phone: row.phone?.trim() || undefined,
          roles: row.role ? [row.role.trim()] : ["staff"],
          password: row.password?.trim() || "Courier@2026",
          password_confirmation: row.password?.trim() || "Courier@2026",
          branch_id: row.branch_id ? Number(row.branch_id) : undefined,
          is_active: row.status ? row.status.toLowerCase() !== "inactive" : true,
        };
        await createUser(payload);
        successCount++;
      } catch (err) {
        errors.push(`${row.email || row.name}: ${err?.response?.data?.message || err.message}`);
      }
    }
    if (errors.length > 0 && successCount === 0) {
      throw new Error(`Failed to import users: ${errors.slice(0, 3).join("; ")}`);
    }
    if (errors.length > 0) {
      message.warning(`Imported ${successCount} users. ${errors.length} failed.`);
    }
    refresh();
    return { successCount, errors };
  };

  const handleExportAll = async () => {
    try {
      const res = await getUsers({ page: 1, pageSize: 1000, role, search });
      const list = res?.data || res?.users || res;
      return Array.isArray(list) ? list : users;
    } catch {
      return users;
    }
  };

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <AdminPageHeader
        title="User Management"
        subtitle="Manage administrators, branch staff, riders, merchants and other platform users."
        icon={<TeamOutlined />}
        breadcrumb={[{ title: "Admin" }, { title: "Users" }]}
        actions={
          <ExportImportToolbar
            entityTitle="Users"
            columns={USER_COLUMNS}
            data={users}
            sampleRows={SAMPLE_USER_ROWS}
            onExportAll={handleExportAll}
            onImport={handleImportUsers}
            onRefresh={refresh}
            onAdd={handleCreate}
            addText="Create User"
            loading={loading || loadingRoles}
          />
        }
      />

      <Card className="admin-card" bodyStyle={{ padding: 16 }}>
        <UserRoleTabs
          roles={roles}
          value={role}
          onChange={handleRoleChange}
          userCounts={userCounts}
        />

        <UserFilters
          search={search}
          onSearchChange={handleSearchChange}
          role={role}
          roles={roles}
          onRoleChange={handleRoleChange}
          onRefresh={refresh}
          loading={loading || loadingRoles}
        />

        {users.length || loading ? (
          <UserTable
            users={users}
            loading={loading}
            pagination={pagination}
            onPaginationChange={
              handlePaginationChange
            }
            onEdit={handleEdit}
            onView={handleView}
            onDelete={handleDelete}
            onToggle={handleToggle}
          />
        ) : (
          <Empty
            description={
              search
                ? "No users match your search."
                : "No users found."
            }
          />
        )}
      </Card>

      <Drawer
        title={
          editingUser
            ? "Edit User"
            : "Create User"
        }
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingUser(null);
        }}
        width={700}
        destroyOnHidden
      >
        <UserForm
          open={formOpen}
          user={editingUser}
          roles={roles}
          loading={saving}
          onSubmit={handleSubmit}
          onCancel={() => {
            setFormOpen(false);
            setEditingUser(null);
          }}
        />
      </Drawer>

      <UserDetails
        open={detailsOpen}
        user={selectedUser}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedUser(null);
        }}
      />
    </Space>
  );
}