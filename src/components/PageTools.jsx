"use client";

import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Timeline,
  Typography,
  message,
} from "antd";
import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  SearchOutlined,
} from "@ant-design/icons";

export function StatusTag({ value }) {
  const color =
    value === "delivered" || value === "active" || value === "settled"
      ? "green"
      : value === "cancelled" || value === "failed" || value === "suspended"
        ? "red"
        : "blue";
  return <Tag color={color}>{String(value || "-").replaceAll("_", " ")}</Tag>;
}

// export function useList(endpoint) {
//   const [data, setData] = useState([]);
//   const [meta, setMeta] = useState({ current: 1, pageSize: 20, total: 0 });
//   const [loading, setLoading] = useState(false);
//   async function load(page = 1) {
//     setLoading(true);
//     try {
//       const res = await api.get(endpoint, {
//         params: { page, per_page: meta.pageSize },
//       });
//       const payload = res.data.data;
//       setData(payload.data || payload || []);
//       setMeta({
//         current: payload.current_page || 1,
//         pageSize: payload.per_page || 20,
//         total: payload.total || 0,
//       });
//     } catch (err) {
//       message.error(err?.response?.data?.message || "Unable to load data");
//     } finally {
//       setLoading(false);
//     }
//   }
//   useEffect(() => {
//     load(1);
//   }, [endpoint]);
//   return { data, meta, loading, load };
// }

// ✅ Updated useList to explicitly support search terms and default to 15 items per page
// ✅ Updated useList hook to bridge 'search' state to the backend 'q' parameter
export function useList(endpoint) {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ current: 1, pageSize: 15, total: 0 });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  async function load(page = 1, currentSearch = searchQuery) {
    setLoading(true);
    try {
      const res = await api.get(endpoint, {
        params: {
          page,
          per_page: 15, // ✅ Keeps strict 15 rows per page
          q: currentSearch || undefined, // 🔄 Swapped 'search' to 'q' to seamlessly match your backend!
        },
      });
      const payload = res.data.data;
      setData(payload.data || payload || []);
      setMeta({
        current: payload.current_page || 1,
        pageSize: payload.per_page || 15,
        total: payload.total || 0,
      });
    } catch (err) {
      message.error(err?.response?.data?.message || "Unable to load data");
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (value) => {
    setSearchQuery(value);
    load(1, value); // Reset to page 1 on new searches
  };

  useEffect(() => {
    load(1, "");
  }, [endpoint]);

  return { data, meta, loading, load, searchQuery, handleSearch };
}

// ✅ Original Table Component (Updated for Search & 15 lines)
export function SimpleTablePage({
  title,
  endpoint,
  columns,
  extra,
  reloadKey,
}) {
  const actualEndpoint = endpoint + (reloadKey ? `?rk=${reloadKey}` : "");
  const { data, meta, loading, load, searchQuery, handleSearch } =
    useList(actualEndpoint);

  return (
    <Card>
      <div
        className="page-header"
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography.Title level={3} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        <Space>
          {/* ✅ Integrated Search Input */}
          <Input
            placeholder="Search..."
            allowClear
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
          />
          {extra}
          <Button onClick={() => load(meta.current)}>Refresh</Button>
        </Space>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: meta.current,
          pageSize: 15, // ✅ Strict 15 rows
          total: meta.total,
          onChange: (page) => load(page, searchQuery),
          showSizeChanger: false,
        }}
        scroll={{ x: true }}
      />
    </Card>
  );
}
// export function SimpleTablePage({
//   title,
//   endpoint,
//   columns,
//   extra,
//   reloadKey,
// }) {
//   const actualEndpoint = endpoint + (reloadKey ? `?rk=${reloadKey}` : "");
//   const { data, meta, loading, load } = useList(actualEndpoint);
//   return (
//     <Card>
//       <div className="page-header">
//         <Typography.Title level={3} style={{ margin: 0 }}>
//           {title}
//         </Typography.Title>
//         <Space>
//           {extra}
//           <Button onClick={() => load(meta.current)}>Refresh</Button>
//         </Space>
//       </div>
//       <Table
//         rowKey="id"
//         columns={columns}
//         dataSource={data}
//         loading={loading}
//         pagination={{
//           current: meta.current,
//           pageSize: meta.pageSize,
//           total: meta.total,
//           onChange: load,
//         }}
//         scroll={{ x: true }}
//       />
//     </Card>
//   );
// }

// Main Enhanced Component
// export function SimpleTablePageWithCRUD({
//   title,
//   endpoint,
//   columns,
//   modalForm, // Pass your Antd Form component here
//   onCreateSuccess,
//   extra,
//   reloadKey,
// }) {
//   const actualEndpoint = endpoint + (reloadKey ? `?rk=${reloadKey}` : "");
//   const { data, meta, loading, load } = useList(actualEndpoint);

//   const [modalVisible, setModalVisible] = useState(false);
//   const [editingRecord, setEditingRecord] = useState(null);
//   const [viewingRecord, setViewingRecord] = useState(null);
//   const [confirmDelete, setConfirmDelete] = useState(null);

//   // Create
//   const handleCreate = () => {
//     setEditingRecord(null);
//     setModalVisible(true);
//   };

//   // Edit
//   const handleEdit = (record) => {
//     setEditingRecord(record);
//     setModalVisible(true);
//   };

//   // View Detail
//   const handleView = (record) => {
//     setViewingRecord(record);
//   };

//   // Delete
//   const handleDelete = async (record) => {
//     try {
//       await api.delete(`${endpoint}/${record.id}`);
//       message.success("Record deleted successfully");
//       load(meta.current);
//     } catch (err) {
//       message.error(err?.response?.data?.message || "Failed to delete record");
//     } finally {
//       setConfirmDelete(null);
//     }
//   };

//   // Handle form success (Create/Edit)
//   const handleFormSuccess = () => {
//     setModalVisible(false);
//     setEditingRecord(null);
//     load(meta.current);
//     onCreateSuccess?.();
//   };

//   const actionColumn = {
//     title: "Actions",
//     key: "actions",
//     width: 180,
//     render: (_, record) => (
//       <Space size="small">
//         <Button
//           icon={<EyeOutlined />}
//           onClick={() => handleView(record)}
//           size="small"
//         ></Button>
//         <Button
//           icon={<EditOutlined />}
//           onClick={() => handleEdit(record)}
//           size="small"
//         ></Button>
//         <Button
//           icon={<DeleteOutlined />}
//           danger
//           onClick={() => setConfirmDelete(record)}
//           size="small"
//         ></Button>
//       </Space>
//     ),
//   };

//   return (
//     <Card>
//       <div
//         className="page-header"
//         style={{
//           marginBottom: 16,
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//         }}
//       >
//         <Typography.Title level={3} style={{ margin: 0 }}>
//           {title}
//         </Typography.Title>
//         <Space>
//           {extra}
//           <Button type="primary" onClick={handleCreate}>
//             Create New
//           </Button>
//           <Button onClick={() => load(meta.current)}>Refresh</Button>
//         </Space>
//       </div>

//       <Table
//         rowKey="id"
//         columns={[...columns, actionColumn]}
//         dataSource={data}
//         loading={loading}
//         pagination={{
//           current: meta.current,
//           pageSize: meta.pageSize,
//           total: meta.total,
//           onChange: load,
//         }}
//         scroll={{ x: true }}
//       />

//       {/* Create / Edit Modal */}
//       <Modal
//         title={editingRecord ? "Edit Record" : "Create New Record"}
//         open={modalVisible}
//         onCancel={() => {
//           setModalVisible(false);
//           setEditingRecord(null);
//         }}
//         footer={null}
//         destroyOnClose
//       >
//         {modalForm &&
//           React.cloneElement(modalForm, {
//             record: editingRecord,
//             onSuccess: handleFormSuccess,
//             onCancel: () => setModalVisible(false),
//           })}
//       </Modal>

//       {/* Detail View Modal */}
//       <Modal
//         title="Record Details"
//         open={!!viewingRecord}
//         onCancel={() => setViewingRecord(null)}
//         footer={null}
//         width={800}
//       >
//         {viewingRecord && (
//           <pre
//             style={{
//               background: "#111827",
//               color: "#f9fafb",
//               padding: 16,
//               borderRadius: 8,
//               overflow: "auto",
//               maxHeight: "70vh",
//             }}
//           >
//             {JSON.stringify(viewingRecord, null, 2)}
//           </pre>
//         )}
//       </Modal>

//       {/* Delete Confirmation */}
//       <Modal
//         title="Confirm Delete"
//         open={!!confirmDelete}
//         onOk={() => handleDelete(confirmDelete)}
//         onCancel={() => setConfirmDelete(null)}
//         okText="Delete"
//         okType="danger"
//       >
//         Are you sure you want to delete this record?
//       </Modal>
//     </Card>
//   );
// }

export function SimpleTablePageWithCRUD({
  title,
  endpoint,
  columns,
  modalForm,
  onCreateSuccess,
  extra,
  reloadKey,
  resource = "",
}) {
  const getUserPermissions = () => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("user");
        if (stored) return JSON.parse(stored);
      }
    } catch (e) {}
    return null;
  };

  const user = getUserPermissions();

  const hasPermission = (action) => {
    if (!resource) return true;
    const permissionKey = `${resource}.${action}`;
    const manageKey = `${resource}.manage`;
    if (!user) return false;
    if (user.is_super_admin || user.role === "super_admin") return true;
    return (
      user.permissions?.includes(permissionKey) ||
      user.permissions?.includes(manageKey)
    );
  };

  const can = {
    create: hasPermission("create"),
    edit: hasPermission("edit"),
    delete: hasPermission("delete"),
    view: hasPermission("view"),
  };

  const actualEndpoint = endpoint + (reloadKey ? `?rk=${reloadKey}` : "");
  const { data, meta, loading, load, searchQuery, handleSearch } =
    useList(actualEndpoint);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleCreate = () => {
    if (!can.create) {
      message.warning("You don't have permission to create");
      return;
    }
    setEditingRecord(null);
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    if (!can.edit) {
      message.warning("You don't have permission to edit");
      return;
    }
    setEditingRecord(record);
    setModalVisible(true);
  };

  const handleView = (record) => {
    if (!can.view) return;
    setViewingRecord(record);
  };

  const handleDelete = async (record) => {
    if (!can.delete) {
      message.warning("You don't have permission to delete");
      return;
    }
    try {
      await api.delete(`${endpoint}/${record.id}`);
      message.success("Record deleted successfully");
      load(meta.current, searchQuery);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to delete record");
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleFormSuccess = () => {
    setModalVisible(false);
    setEditingRecord(null);
    load(meta.current, searchQuery);
    onCreateSuccess?.();
  };

  const showActions = can.view || can.edit || can.delete;

  const actionColumn = {
    title: "Actions",
    key: "actions",
    width: 180,
    render: (_, record) => (
      <Space size="small">
        {can.view && (
          <Button
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
            size="small"
          />
        )}
        {can.edit && (
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          />
        )}
        {can.delete && (
          <Button
            icon={<DeleteOutlined />}
            danger
            onClick={() => setConfirmDelete(record)}
            size="small"
          />
        )}
      </Space>
    ),
  };

  const finalColumns = showActions ? [...columns, actionColumn] : columns;

  return (
    <Card>
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography.Title level={3} style={{ margin: 0 }}>
          {title}
        </Typography.Title>

        <Space>
          {/* ✅ Integrated Filter Search Bar */}
          <Input
            placeholder="Search matching items..."
            allowClear
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
          />

          {extra}

          {can.create && (
            <Button type="primary" onClick={handleCreate}>
              Create New
            </Button>
          )}

          <Button onClick={() => load(meta.current, searchQuery)}>
            Refresh
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={finalColumns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: meta.current,
          pageSize: 15, // ✅ Forced 15 rows pagination size
          total: meta.total,
          onChange: (page) => load(page, searchQuery),
          showSizeChanger: false,
        }}
        scroll={{ x: true }}
      />

      {/* CREATE / EDIT */}
      <Modal
        title={editingRecord ? "Edit Record" : "Create New Record"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingRecord(null);
        }}
        footer={null}
        destroyOnClose
      >
        {modalForm &&
          React.cloneElement(modalForm, {
            record: editingRecord,
            onSuccess: handleFormSuccess,
            onCancel: () => setModalVisible(false),
          })}
      </Modal>

      {/* VIEW */}
      <Modal
        title="Record Details"
        open={!!viewingRecord}
        onCancel={() => setViewingRecord(null)}
        footer={null}
        width={800}
      >
        {viewingRecord && <JsonBlock data={viewingRecord} />}
      </Modal>

      {/* DELETE CONFIRM */}
      <Modal
        title="Confirm Delete"
        open={!!confirmDelete}
        onOk={() => handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
        okText="Delete"
        okType="danger"
      >
        Are you sure you want to delete this record?
      </Modal>
    </Card>
  );
}
// export function SimpleTablePageWithCRUD({
//   title,
//   endpoint,
//   columns,
//   modalForm,
//   onCreateSuccess,
//   extra,
//   reloadKey,
//   resource = "",
// }) {
//   // ✅ Get user from localStorage (FIXED)
//   const getUserPermissions = () => {
//     try {
//       if (typeof window !== "undefined") {
//         const stored = localStorage.getItem("user");
//         if (stored) return JSON.parse(stored);
//       }
//     } catch (e) {}
//     return null;
//   };

//   const user = getUserPermissions();

//   // ✅ Permission checker (FIXED)
//   const hasPermission = (action) => {
//     if (!resource) return true;

//     const permissionKey = `${resource}.${action}`;
//     const manageKey = `${resource}.manage`;

//     if (!user) return false;

//     // ✅ Super Admin bypass
//     if (user.is_super_admin || user.role === "super_admin") return true;

//     return (
//       user.permissions?.includes(permissionKey) ||
//       user.permissions?.includes(manageKey)
//     );
//   };

//   const can = {
//     create: hasPermission("create"),
//     edit: hasPermission("edit"),
//     delete: hasPermission("delete"),
//     view: hasPermission("view"),
//   };

//   const actualEndpoint = endpoint + (reloadKey ? `?rk=${reloadKey}` : "");
//   const { data, meta, loading, load } = useList(actualEndpoint);

//   const [modalVisible, setModalVisible] = useState(false);
//   const [editingRecord, setEditingRecord] = useState(null);
//   const [viewingRecord, setViewingRecord] = useState(null);
//   const [confirmDelete, setConfirmDelete] = useState(null);

//   // ================= HANDLERS =================

//   const handleCreate = () => {
//     if (!can.create) {
//       message.warning("You don't have permission to create");
//       return;
//     }
//     setEditingRecord(null);
//     setModalVisible(true);
//   };

//   const handleEdit = (record) => {
//     if (!can.edit) {
//       message.warning("You don't have permission to edit");
//       return;
//     }
//     setEditingRecord(record);
//     setModalVisible(true);
//   };

//   const handleView = (record) => {
//     if (!can.view) return;
//     setViewingRecord(record);
//   };

//   const handleDelete = async (record) => {
//     if (!can.delete) {
//       message.warning("You don't have permission to delete");
//       return;
//     }
//     try {
//       await api.delete(`${endpoint}/${record.id}`);
//       message.success("Record deleted successfully");
//       load(meta.current);
//     } catch (err) {
//       message.error(err?.response?.data?.message || "Failed to delete record");
//     } finally {
//       setConfirmDelete(null);
//     }
//   };

//   const handleFormSuccess = () => {
//     setModalVisible(false);
//     setEditingRecord(null);
//     load(meta.current);
//     onCreateSuccess?.();
//   };

//   // ================= ACTION COLUMN =================

//   const showActions = can.view || can.edit || can.delete;

//   const actionColumn = {
//     title: "Actions",
//     key: "actions",
//     width: 180,
//     render: (_, record) => (
//       <Space size="small">
//         {can.view && (
//           <Button
//             icon={<EyeOutlined />}
//             onClick={() => handleView(record)}
//             size="small"
//           />
//         )}
//         {can.edit && (
//           <Button
//             icon={<EditOutlined />}
//             onClick={() => handleEdit(record)}
//             size="small"
//           />
//         )}
//         {can.delete && (
//           <Button
//             icon={<DeleteOutlined />}
//             danger
//             onClick={() => setConfirmDelete(record)}
//             size="small"
//           />
//         )}
//       </Space>
//     ),
//   };

//   const finalColumns = showActions
//     ? [...columns, actionColumn]
//     : columns;

//   // ================= UI =================

//   return (
//     <Card>
//       <div
//         style={{
//           marginBottom: 16,
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//         }}
//       >
//         <Typography.Title level={3} style={{ margin: 0 }}>
//           {title}
//         </Typography.Title>

//         <Space>
//           {extra}

//           {can.create && (
//             <Button type="primary" onClick={handleCreate}>
//               Create New
//             </Button>
//           )}

//           <Button onClick={() => load(meta.current)}>Refresh</Button>
//         </Space>
//       </div>

//       <Table
//         rowKey="id"
//         columns={finalColumns}
//         dataSource={data}
//         loading={loading}
//         pagination={{
//           current: meta.current,
//           pageSize: meta.pageSize,
//           total: meta.total,
//           onChange: load,
//         }}
//         scroll={{ x: true }}
//       />

//       {/* CREATE / EDIT */}
//       <Modal
//         title={editingRecord ? "Edit Record" : "Create New Record"}
//         open={modalVisible}
//         onCancel={() => {
//           setModalVisible(false);
//           setEditingRecord(null);
//         }}
//         footer={null}
//         destroyOnClose
//       >
//         {modalForm &&
//           React.cloneElement(modalForm, {
//             record: editingRecord,
//             onSuccess: handleFormSuccess,
//             onCancel: () => setModalVisible(false),
//           })}
//       </Modal>

//       {/* VIEW */}
//       <Modal
//         title="Record Details"
//         open={!!viewingRecord}
//         onCancel={() => setViewingRecord(null)}
//         footer={null}
//         width={800}
//       >
//         {viewingRecord && (
//           <pre
//             style={{
//               background: "#111827",
//               color: "#f9fafb",
//               padding: 16,
//               borderRadius: 8,
//               overflow: "auto",
//               maxHeight: "70vh",
//             }}
//           >
//             {JSON.stringify(viewingRecord, null, 2)}
//           </pre>
//         )}
//       </Modal>

//       {/* DELETE CONFIRM */}
//       <Modal
//         title="Confirm Delete"
//         open={!!confirmDelete}
//         onOk={() => handleDelete(confirmDelete)}
//         onCancel={() => setConfirmDelete(null)}
//         okText="Delete"
//         okType="danger"
//       >
//         Are you sure you want to delete this record?
//       </Modal>
//     </Card>
//   );
// }

export function JsonBlock({ data }) {
  return (
    <pre
      style={{
        background: "#111827",
        color: "#f9fafb",
        padding: 16,
        borderRadius: 8,
        overflow: "auto",
      }}
    >
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Timeline,
  Typography,
  message,
};
