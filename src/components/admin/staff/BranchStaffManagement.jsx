"use client";

import React, {
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
  Tag,
  Typography,
} from "antd";

import {
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
} from "@ant-design/icons";

import {
  getBranchStaff,
  getBranchStaffMember,
  createBranchStaff,
  updateBranchStaff,
  deleteBranchStaff,
  toggleBranchStaff,
  getBranchStaffRoles,
  normalizeStaffRoles,
} from "@/services/branchStaffService";

import BranchStaffTable from "./BranchStaffTable";
import BranchStaffForm from "./BranchStaffForm";
import BranchStaffDetails from "./BranchStaffDetails";

const { Title, Text } = Typography;

export default function BranchStaffManagement() {
  const [staff, setStaff] = useState([]);

  const [roles, setRoles] = useState([]);

  const [loading, setLoading] = useState(false);
  const [rolesLoading, setRolesLoading] =
    useState(false);

  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

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

  /*
   * ------------------------------------------------------------
   * LOAD ROLES
   * ------------------------------------------------------------
   */

  const loadRoles = useCallback(
    async () => {
      try {
        setRolesLoading(true);

        const result = await getBranchStaffRoles();

        const normalized =
          Array.isArray(result)
            ? result
            : Array.isArray(result?.data)
              ? result.data
              : [];

        setRoles(
          normalizeStaffRoles(
            normalized
          )
        );
      } catch (error) {
        console.error(
          "Failed to load roles:",
          error
        );

        message.error(
          error?.response?.data?.message ||
            "Failed to load staff roles."
        );

        setRoles([]);
      } finally {
        setRolesLoading(false);
      }
    },
    []
  );

  /*
   * ------------------------------------------------------------
   * LOAD STAFF
   * ------------------------------------------------------------
   */

  const loadStaff = useCallback(
    async ({
      page = pagination.current,
      pageSize = pagination.pageSize,
      currentSearch = search,
    } = {}) => {
      try {
        setLoading(true);

        const params = {
          page,
          per_page: pageSize,
        };

        if (
          currentSearch?.trim()
        ) {
          params.q =
            currentSearch.trim();
        }

        const result =
          await getBranchStaff(
            params
          );

        setStaff(
          Array.isArray(result?.list)
            ? result.list
            : []
        );

        setPagination({
          current:
            result?.currentPage ??
            page,

          pageSize:
            result?.pageSize ??
            pageSize,

          total:
            result?.total ?? 0,
        });
      } catch (error) {
        console.error(
          "Failed to load branch staff:",
          error
        );

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

  /*
   * ------------------------------------------------------------
   * INITIAL LOAD
   * ------------------------------------------------------------
   */

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    loadStaff({
      page: 1,
      pageSize: pagination.pageSize,
      currentSearch: search,
    });
  }, [search]);

  /*
   * ------------------------------------------------------------
   * CREATE
   * ------------------------------------------------------------
   */

  const handleCreate = () => {
    setEditingStaff(null);
    setFormOpen(true);
  };

  /*
   * ------------------------------------------------------------
   * EDIT
   * ------------------------------------------------------------
   */

  const handleEdit = async (record) => {
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
          "Failed to load staff member."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ------------------------------------------------------------
   * VIEW
   * ------------------------------------------------------------
   */

  const handleView = async (record) => {
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
  };

  /*
   * ------------------------------------------------------------
   * SAVE
   * ------------------------------------------------------------
   */

  const handleSubmit = async (
    payload,
    originalStaff
  ) => {
    try {
      setSaving(true);

      if (originalStaff?.id) {
        await updateBranchStaff(
          originalStaff.id,
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
        currentSearch: search,
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
  };

  /*
   * ------------------------------------------------------------
   * DELETE
   * ------------------------------------------------------------
   */

  const handleDelete = async (
    record
  ) => {
    try {
      await deleteBranchStaff(
        record.id
      );

      message.success(
        "Staff deactivated successfully."
      );

      await loadStaff({
        page: pagination.current,
        pageSize: pagination.pageSize,
        currentSearch: search,
      });
    } catch (error) {
      console.error(error);

      message.error(
        error?.response?.data?.message ||
          "Failed to deactivate staff."
      );
    }
  };

  /*
   * ------------------------------------------------------------
   * TOGGLE
   * ------------------------------------------------------------
   */

  const handleToggle = async (
    record
  ) => {
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
        currentSearch: search,
      });
    } catch (error) {
      console.error(error);

      message.error(
        error?.response?.data?.message ||
          "Failed to update staff status."
      );
    }
  };

  /*
   * ------------------------------------------------------------
   * PAGINATION
   * ------------------------------------------------------------
   */

  const handlePaginationChange = (
    page,
    pageSize
  ) => {
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
      currentSearch: search,
    });
  };

  /*
   * ------------------------------------------------------------
   * REFRESH
   * ------------------------------------------------------------
   */

  const handleRefresh = () => {
    loadRoles();

    loadStaff({
      page: pagination.current,
      pageSize: pagination.pageSize,
      currentSearch: search,
    });
  };

  return (
    <div
      style={{
        padding: 24,
      }}
    >
      <Card>
        <Space
          style={{
            width: "100%",
            justifyContent:
              "space-between",
            marginBottom: 24,
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

            <Text type="secondary">
              Manage pickup staff, delivery
              staff and riders assigned to
              your branch.
            </Text>
          </div>

          <Space>
            <Button
              icon={
                <ReloadOutlined />
              }
              onClick={
                handleRefresh
              }
              loading={
                loading ||
                rolesLoading
              }
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

        <Space
          style={{
            marginBottom: 16,
          }}
        >
          <Input.Search
            allowClear
            placeholder="Search staff..."
            value={search}
            onChange={(event) => {
              setSearch(
                event.target.value
              );

              setPagination(
                (previous) => ({
                  ...previous,
                  current: 1,
                })
              );
            }}
            style={{
              width: 320,
            }}
          />

          <Tag>
            {pagination.total} staff
          </Tag>
        </Space>

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
            description={
              search
                ? "No staff match your search."
                : "No staff found for this branch."
            }
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
        onClose={() => {
          setFormOpen(false);
          setEditingStaff(null);
        }}
        width={650}
        destroyOnHidden
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
    </div>
  );
}