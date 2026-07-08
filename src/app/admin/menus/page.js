"use client";
import { useState } from "react";
import api from "@/lib/api";
import {
  Button,
  Form,
  Input,
  Modal,
  Select,
  SimpleTablePage,
  SimpleTablePageWithCRUD,
  StatusTag,
  message,
} from "@/components/PageTools";
export default function MenusPage() {
  const [open, setOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [form] = Form.useForm();
  const columns = [
    { title: "Section", dataIndex: "section" },
    { title: "Label", dataIndex: "label" },
    { title: "Path", dataIndex: "path" },
    { title: "Permission", dataIndex: "permission" },
    { title: "Order", dataIndex: "sort_order" },
    {
      title: "Status",
      dataIndex: "is_active",
      render: (v) => <StatusTag value={v ? "active" : "inactive"} />,
    },
  ];
  async function submit(values) {
    try {
      await api.post("/admin/menus", values);
      message.success("Menu created");
      setOpen(false);
      form.resetFields();
      setRefresh(Date.now());
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed");
    }
  }


  const MenuForm = ({ record, onSuccess, onCancel }) => {
    const [form] = Form.useForm(); // ← Create form here if not passed
    const isEdit = !!record;

    const handleSubmit = async (values) => {
      try {
        if (isEdit) {
          await api.put(`/admin/branches/${record.id}`, values);
          message.success("Branch updated successfully");
        } else {
          await api.post("/admin/branches", values);
          message.success("Branch created successfully");
        }
        onSuccess();
      } catch (err) {
        message.error(err?.response?.data?.message || "Operation failed");
      }
    };

    return (
      <Form
        layout="vertical"
        form={form}
        onFinish={handleSubmit}
        initialValues={record || {}}
      >
        {/* Your form fields here */}
       <Form.Item
            name="section"
            label="Section"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "admin", label: "Admin" },
                { value: "merchant", label: "Merchant" },
                { value: "staff", label: "Staff" },
              ]}
            />
          </Form.Item>
          <Form.Item name="label" label="Label" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="path" label="Path">
            <Input />
          </Form.Item>
          <Form.Item name="icon" label="Icon Key">
            <Input />
          </Form.Item>
          <Form.Item name="permission" label="Required Permission">
            <Input />
          </Form.Item>
          <Form.Item name="sort_order" label="Sort Order">
            <Input />
          </Form.Item>
        {/* === Buttons at the bottom === */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 24,
          }}
        >
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" htmlType="submit">
            {isEdit ? "Update" : "Create"}
          </Button>
        </div>
      </Form>
    );
  };
  return (
    <>
      <SimpleTablePageWithCRUD
        title="Menu Visibility"
        endpoint="/admin/menus"
        columns={columns}
        reloadKey={refresh}
        modalForm={<MenuForm />}
        // extra={
        //   <Button type="primary" onClick={() => setOpen(true)}>
        //     Add Menu
        //   </Button>
        // }
      />
    </>
  );
}
