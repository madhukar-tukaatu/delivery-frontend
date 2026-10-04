"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Space,
  Table,
  Tag,
  message,
  DatePicker,
  Input,
  Select,
  Form,
  Row,
  Col,
  Dropdown,
  Menu,
  Badge,
  Alert,
  Spin,
  Modal,
  Typography,
} from "antd";
import { SearchOutlined, FilterOutlined, DownloadOutlined, MailOutlined } from "@ant-design/icons";
import api from "@/lib/api";
import dayjs from "dayjs";

function unwrap(r) {
  return r?.data?.data ?? r?.data ?? r;
}

const { Text } = Typography;

export default function MerchantInvoicesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [summary, setSummary] = useState({ unpaid: { count: 0, total: 0 }, paid: { count: 0, total: 0 } });
  
  // Filters
  const [form] = Form.useForm();
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    from_date: '',
    to_date: '',
    search: '',
  });

  async function loadSummary() {
    try {
      const res = await api.get("/merchant/invoices/summary");
      setSummary(unwrap(res));
    } catch (e) {
      console.error('Failed to load summary', e);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        per_page: pagination.pageSize,
        ...filters,
      };
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      const res = await api.get("/merchant/invoices", { params });
      const data = unwrap(res);
      setRows(data?.data || data || []);
      setPagination(prev => ({ ...prev, total: data?.total || 0 }));
    } catch (e) {
      message.error(e?.response?.data?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadSummary();
  }, [pagination.current, pagination.pageSize, filters]);

  async function pay(id) {
    try {
      const res = await api.post(`/merchant/invoices/${id}/pay-hamropay`, {});
      message.success("Open HamroPay checkout to pay the branch delivery bill.");
      console.info(unwrap(res));
    } catch (e) {
      message.error(e?.response?.data?.message || "Pay failed");
    }
  }

  async function sendEmail(id) {
    try {
      const res = await api.post(`/merchant/invoices/${id}/send-email`, {});
      message.success("Invoice email sent successfully!");
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to send email");
    }
  }

  function onTableChange(pagination, filters, sorter) {
    setPagination(prev => ({ ...prev, current: pagination.current, pageSize: pagination.pageSize }));
  }

  function onSearch(values) {
    setFilters(prev => ({ ...prev, ...values, from_date: values.from_date ? dayjs(values.from_date).format('YYYY-MM-DD') : '', to_date: values.to_date ? dayjs(values.to_date).format('YYYY-MM-DD') : '' }));
    setPagination(prev => ({ ...prev, current: 1 }));
  }

  function onReset() {
    form.resetFields();
    setFilters({ status: '', type: '', from_date: '', to_date: '', search: '' });
    setPagination(prev => ({ ...prev, current: 1 }));
  }

  const statusColor = (status) => {
    switch (status) {
      case 'paid': return 'green';
      case 'unpaid': return 'orange';
      case 'cancelled': return 'red';
      default: return 'default';
    }
  };

  const columns = [
    { title: "Invoice", dataIndex: "invoice_number", width: 180 },
    { title: "Type", dataIndex: "type", width: 120 },
    { 
      title: "Shipment", 
      dataIndex: "shipment", 
      width: 180,
      render: (shipment) => shipment ? (
        <Text copyable>{shipment.tracking_number}</Text>
      ) : '-'
    },
    { 
      title: "Date", 
      dataIndex: "invoice_date", 
      width: 120,
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
    },
    { 
      title: "Total", 
      dataIndex: "total_amount", 
      width: 120,
      render: (amount) => <Text strong>Rs. {Number(amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</Text>
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 100,
      render: (v) => <Tag color={statusColor(v)}>{v}</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      render: (_, r) => (
        <Space>
          {r.status !== "paid" && r.type === "delivery_charges" && (
            <>
              <Button type="primary" size="small" onClick={() => pay(r.id)}>
                Pay via HamroPay
              </Button>
              <Button size="small" onClick={() => sendEmail(r.id)} icon={<MailOutlined />}>
                Send Email
              </Button>
            </>
          )}
          {r.status === "paid" && <Tag color="green">Paid</Tag>}
        </Space>
      ),
    },
  ];

  return (
    <Card title="My Invoices (Delivery Charges to Branch)">
      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Text type="secondary">Unpaid Count</Text>
            <Text style={{ fontSize: 24, fontWeight: 'bold', display: 'block', marginTop: 8 }}>
              {summary.unpaid?.count || 0}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Text type="secondary">Unpaid Total</Text>
            <Text style={{ fontSize: 24, fontWeight: 'bold', display: 'block', marginTop: 8, color: '#ff4d4f' }}>
              Rs. {(summary.unpaid?.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Text type="secondary">Paid Count</Text>
            <Text style={{ fontSize: 24, fontWeight: 'bold', display: 'block', marginTop: 8 }}>
              {summary.paid?.count || 0}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Text type="secondary">Paid Total</Text>
            <Text style={{ fontSize: 24, fontWeight: 'bold', display: 'block', marginTop: 8, color: '#52c41a' }}>
              Rs. {(summary.paid?.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline" onFinish={onSearch}>
          <Row gutter={16} align="end">
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="search" label="Search">
                <Input
                  placeholder="Invoice # or Tracking #"
                  prefix={<SearchOutlined />}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="status" label="Status">
                <Select placeholder="All Status" allowClear style={{ width: '100%' }}>
                  <Select.Option value="unpaid">Unpaid</Select.Option>
                  <Select.Option value="paid">Paid</Select.Option>
                  <Select.Option value="cancelled">Cancelled</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="type" label="Type">
                <Select placeholder="All Types" allowClear style={{ width: '100%' }}>
                  <Select.Option value="delivery_charges">Delivery Charges</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="from_date" label="From Date">
                <DatePicker
                  format="YYYY-MM-DD"
                  placeholder="From Date"
                  allowClear
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="to_date" label="To Date">
                <DatePicker
                  format="YYYY-MM-DD"
                  placeholder="To Date"
                  allowClear
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Space>
                <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                  Search
                </Button>
                <Button onClick={onReset} icon={<FilterOutlined />}>
                  Reset
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* Table */}
      <Table
        rowKey="id"
        dataSource={rows}
        columns={columns}
        pagination={false}
        loading={loading}
        onChange={onTableChange}
        bordered
        size="middle"
      />

      {/* Pagination */}
      {pagination.total > 0 && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Total: {pagination.total} invoices</span>
          <Space>
            <Button
              disabled={pagination.current <= 1}
              onClick={() => setPagination(prev => ({ ...prev, current: prev.current - 1 }))}
            >
              Previous
            </Button>
            <Button
              disabled={pagination.current * pagination.pageSize >= pagination.total}
              onClick={() => setPagination(prev => ({ ...prev, current: prev.current + 1 }))}
            >
              Next
            </Button>
          </Space>
        </div>
      )}
    </Card>
  );
}
