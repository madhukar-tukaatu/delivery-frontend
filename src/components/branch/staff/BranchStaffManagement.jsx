"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Button,
  Card,
  Drawer,
  Empty,
  Input,
  message,
  Space,
  Typography,
} from "antd";

import {
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
} from "@ant-design/icons";

import {
  createBranchStaff,
  deleteBranchStaff,
  getBranchStaff,
  getBranchStaffMember,
  getBranchStaffRoles,
  toggleBranchStaff,
  updateBranchStaff,
} from "@/services/branchStaffService";

import BranchStaffTable from "./BranchStaffTable";
import BranchStaffForm from "./BranchStaffForm";
import BranchStaffDetails from "./BranchStaffDetails";

const { Title, Text } =
  Typography;

export default function BranchStaffManagement() {
  const [staff, setStaff] =
    useState([]);

  const [roles, setRoles] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [pagination, setPagination] =
    useState({
      current: 1,
      pageSize: 20,
      total: 0,
    });

  const [formOpen, setFormOpen] =
    useState(false);

  const [detailsOpen, setDetailsOpen] =
    useState(false);

  const [editingStaff, setEditingStaff] =
    useState(null);

  const [selectedStaff, setSelectedStaff] =
    useState(null);

  const loadStaff = useCallback(
    async ({
      page = pagination.current,
      pageSize = pagination.pageSize,
      q = search,
    } = {}) => {
      try {
        setLoading(true);

        const result =
          await getBranchStaff({
            page,
            per_page: pageSize,
            ...(q?.trim()
              ? {
                  q: q.trim(),
                }
              : {}),
          });

        setStaff(
          Array.isArray(result?.list)
            ? result.list
            : []
        );

        setPagination({
          current:
            result?.currentPage ||
            page,

          pageSize:
            result?.pageSize ||
            pageSize,

          total:
            result?.total ||
            0,
        });
      } catch (error) {
        console.error(error);

        message.error(
          error?.response?.data?.message ||
          "Failed to load branch staff."
        );

        setStaff([]);
      } finally {
        setLoading(false);
      }
    },
    [
      pagination.current,
      pagination.pageSize,
      search,
    ]
  );

  const loadRoles = useCallback(
    async () => {
      try {
        const data =
          await getBranchStaffRoles();

        setRoles(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (error) {
        console.error(error);

        /*
         * Roles may also come from the normal
         * access/roles endpoint.
         *
         * Do not prevent the staff page from
         * loading if this endpoint is unavailable.
         */
        setRoles([]);
      }
    },
    []
  );

  useEffect(() => {
    loadStaff({
      page: 1,
      pageSize: pagination.pageSize,
      q: search,
    });
  }, [search]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  function handleCreate() {
    setEditingStaff(null);
    setFormOpen(true);
  }

  async function handleEdit(record) {
    try {
      setLoading(true);

      const fullStaff =
        await getBranchStaffMember(
          record.id
        );

      setEditingStaff(
        fullStaff || record
      );

      setFormOpen(true);
    } catch (error) {
      console.error(error);

      message.error(
        error?.response?.data?.message ||
        "Failed to load staff details."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleView(record) {
    try {
      setLoading(true);

      const fullStaff =
        await getBranchStaffMember(
          record.id
        );

      setSelectedStaff(
        fullStaff || record
      );

      setDetailsOpen(true);
    } catch (error) {
      console.error(error);

      setSelectedStaff(record);
      setDetailsOpen(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(
    payload
  ) {
    try {
      setSaving(true);

      if (editingStaff?.id) {
        await updateBranchStaff(
          editingStaff.id,
          payload
        );

        message.success(
          "Staff updated successfully."
        );
      } else {
        await createBranchStaff(
          payload
        );

        message.success(
          "Staff created successfully."
        );
      }

      setFormOpen(false);
      setEditingStaff(null);

      await loadStaff({
        page: pagination.current,
        pageSize: pagination.pageSize,
        q: search,
      });
    } catch (error) {
      console.error(error);

      message.error(
        error?.response?.data?.message ||
        "Failed to save staff."
      );

      throw error;
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(record) {
    try {
      await deleteBranchStaff(
        record.id
      );

      message.success(
        "Staff removed successfully."
      );

      await loadStaff({
        page: pagination.current,
        pageSize: pagination.pageSize,
        q: search,
      });
    } catch (error) {
      console.error(error);

      message.error(
        error?.response?.data?.message ||
        "Failed to remove staff."
      );
    }
  }

  async function handleToggle(record) {
    try {
      await toggleBranchStaff(
        record.id
      );

      message.success(
        "Staff status updated."
      );

      await loadStaff({
        page: pagination.current,
        pageSize: pagination.pageSize,
        q: search,
      });
    } catch (error) {
      console.error(error);

      message.error(
        error?.response?.data?.message ||
        "Failed to update staff status."
      );
    }
  }

  function handlePaginationChange(
    page,
    pageSize
  ) {
    setPagination(
      (previous) => ({
        ...previous,
        current: page,
        pageSize,
      })
    );

    loadStaff({
      page,
      pageSize,
      q: search,
    });
  }

  return (
    <>
      <Card>
        <Space
          style={{
            width: "100%",
            justifyContent:
              "space-between",
            marginBottom: 20,
          }}
          align="center"
        >
          <div>
            <Space>
              <TeamOutlined
                style={{
                  fontSize: 22,
                }}
              />

              <Title
                level={3}
                style={{
                  margin: 0,
                }}
              >
                Branch Staff
              </Title>
            </Space>

            <div>
              <Text type="secondary">
                Manage pickup staff, delivery
                staff and riders assigned to
                your branch.
              </Text>
            </div>
          </div>

          <Space>
            <Button
              icon={
                <ReloadOutlined />
              }
              onClick={() =>
                loadStaff()
              }
              loading={loading}
            >
              Refresh
            </Button>

            <Button
              type="primary"
              icon={
                <PlusOutlined />
              }
              onClick={
                handleCreate
              }
            >
              Add Staff
            </Button>
          </Space>
        </Space>

        <Input.Search
          allowClear
          placeholder="Search staff by name, email or phone..."
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          style={{
            maxWidth: 450,
            marginBottom: 20,
          }}
        />

        {staff.length || loading ? (
          <BranchStaffTable
            staff={staff}
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
            description="No staff found for your branch."
          />
        )}
      </Card>

      <Drawer
        title={
          editingStaff
            ? "Edit Staff"
            : "Add Staff"
        }
        open={formOpen}
        width={650}
        destroyOnHidden
        onClose={() => {
          setFormOpen(false);
          setEditingStaff(null);
        }}
      >
        <BranchStaffForm
          user={editingStaff}
          roles={roles}
          loading={saving}
          onSubmit={
            handleSubmit
          }
          onCancel={() => {
            setFormOpen(false);
            setEditingStaff(null);
          }}
        />
      </Drawer>

      <BranchStaffDetails
        open={detailsOpen}
        staff={selectedStaff}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedStaff(null);
        }}
      />
    </>
  );
}